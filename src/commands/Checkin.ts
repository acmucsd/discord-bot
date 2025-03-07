import { CommandInteraction, MessageAttachment, MessageEmbed } from 'discord.js';
import got from 'got';
import { DateTime, Interval } from 'luxon';
import { v4 as newUUID } from 'uuid';
import { SlashCommandBuilder } from '@discordjs/builders';
import { createCanvas, loadImage, registerFont } from 'canvas';
import { BotClient, InteractionPayload, PortalEvent, UUIDv4 } from '../types';
import Command from '../Command';
import Logger from '../utils/Logger';
import QR from './QR';

/**
 * This Command DM's the caller the checkin code and Express Checkin link for any current and
 * upcoming events in today's timeframe. Optional argument `public` makes the embed with the
 * checkin codes be returned in the same chat as the Command message instead of DMs. Optional
 * argument 'widescreen' allows users to choose if they want a QR code by itself (false) or
 * the widescreen slide QR (true). 'widescreen' is true by default.
 */
export default class Checkin extends Command {
  constructor(client: BotClient) {
    const definition = new SlashCommandBuilder()
      .setName('checkin')
      .addBooleanOption(option =>
        option
          .setName('public')
          .setDescription('If true, send public embed of check-in code for live events!')
          .setRequired(false)
      )
      .addBooleanOption(option =>
        option.setName('widescreen').setDescription('Include a slide for the QR code.').setRequired(false)
      )
      .addBooleanOption(option =>
        option.setName('asform').setDescription('Generate a second QR code for AS Funding').setRequired(false)
      )
      .addStringOption(option =>
        option.setName('date').setDescription('The date to check for events. Use MM/DD format.').setRequired(false)
      )
      .setDescription(
        "Sends a DM or embed with all check-in codes from today's events. Includes Express Checkin QR code!"
      );

    super(
      client,
      {
        name: 'checkin',
        boardRequired: true,
        enabled: true,
        description:
          "Sends a private message with all check-in codes from today's events. Calling with `public` argument sends public embed of checkin code in the current channel instead of via DM.",
        category: 'Utility',
        usage: client.settings.prefix.concat('checkin [now]'),
        requiredPermissions: ['SEND_MESSAGES'],
      },
      definition
    );
  }

  /**
   * The workhorse of Checkin, this method performs error validation on the arguments, as well as
   * constructing the Embed.
   *
   * In short, the steps taken are:
   * - Get all the arguments
   * - Validate some of the arguments
   * - Get all future events
   * - Filter out only the events we want
   * - Build out the descriptions for the Embeds
   * - Build the Embeds
   * - Send them out!
   *
   * @param interaction The Slash Command Interaction instance.
   */
  public async run(interaction: CommandInteraction): Promise<void> {
    // Get arguments. Get rid of the null types by checking them.
    const publicArgument = interaction.options.getBoolean('public');
    const widescreenArgument = interaction.options.getBoolean('widescreen');
    const asFormArgument = interaction.options.getBoolean('asform');
    const dateArgument = interaction.options.getString('date');

    // Regex to match dates in the format of MM/DD(/YYYY) or MM-DD(-YYYY).
    const regexp = new RegExp('^(\\d{1,2})(/|-)(\\d{1,2})((/|-)(\\d{2}|\\d{4})){0,1}$', 'g');
    const dateMatches = regexp.exec(dateArgument!);

    if (dateArgument !== null && dateMatches === null) {
      await super.respond(interaction, {
        content: 'Invalid date format. Please use MM/DD or MM-DD format.',
        ephemeral: true,
      });
      return;
    }

    const month = dateMatches?.[1] ? parseInt(dateMatches[1], 10) : DateTime.now().month;
    const day = dateMatches?.[3] ? parseInt(dateMatches[3], 10) : DateTime.now().day;
    const year = dateMatches?.[6] ? parseInt(dateMatches[6], 10) : DateTime.now().year;

    if (month < 1 || month > 12 || day < 1 || day > 31) {
      await super.respond(interaction, {
        content: 'Invalid date. Please use a valid date.',
        ephemeral: true,
      });
      return;
    }

    // By default, we want the QR code to be DMed to the user.
    const isPublic = publicArgument !== null ? publicArgument : false;
    // By default, we want to include the slide.
    const needsSlide = widescreenArgument !== null ? widescreenArgument : true;
    // By default, we want to generate the dual AS Form
    const needsASForm = asFormArgument !== null ? asFormArgument : true;

    // Defer the reply ephemerally only if it's a private command call.
    await super.defer(interaction, !isPublic);

    // Get all future events marked in the portal API.
    try {
      const futureEvents = await this.getFutureEvents();

      // Oh, boy, here come more dates and times to check.
      // Luxon makes it much nicer, however.
      //
      // We need an array to store all events that have a start time within today's timeframe.
      const todayEvents = futureEvents.filter(event => {
        // get today's midnight
        const midnightToday = DateTime.local(year, month, day, 0, 0, 0, 0);

        // get tomorrow's midnight
        const midnightTomorrow = midnightToday.plus({ day: 1 });

        // check if start time in between
        return Interval.fromDateTimes(midnightToday, midnightTomorrow).contains(event.start);
      });

      // We'll make sure to check if the required set of events by
      // command arugments is empty; if it is, just return "No events today!"
      if (todayEvents.length === 0) {
        await super.edit(interaction, {
          content: 'No events today!',
          ephemeral: true,
        });
        return;
      }

      // Now we finally check the command argument.
      // If we just had `checkin` in our call, no arguments...
      const { asAttendanceForm } = this.client.settings;
      if (!isPublic) {
        const author = await this.client.users.fetch(interaction.member!.user.id);
        // What we need now is to construct the Payload to send for `checkin`.
        const privateMessage = await Checkin.getCheckinMessage(
          todayEvents,
          isPublic,
          needsSlide,
          needsASForm,
          asAttendanceForm
        );
        await author.send(privateMessage);
        await super.edit(interaction, {
          content: 'Check your DM.',
          ephemeral: true,
        });
        await interaction.followUp(`**/checkin** was used privately by ${interaction.user}!`);
      } else {
        const publicMessage = await Checkin.getCheckinMessage(
          todayEvents,
          isPublic,
          needsSlide,
          needsASForm,
          asAttendanceForm
        );
        await super.edit(interaction, publicMessage);
      }
    } catch (e) {
      const error = e as any;
      // Similarly to Top, only errors I could find here involve the API,
      // so if anything pops up, log the API errors.
      const errorUUID: UUIDv4 = newUUID();
      Logger.error(`Error whilst fetching future events: ${error.message}`, {
        eventType: 'interfaceError',
        interface: 'portalAPI',
        error,
        uuid: errorUUID,
      });
      await super.edit(
        interaction,
        `An error occurred when attempting to query the event data from the portal API. *(Error UUID: ${errorUUID})*`
      );
    }
  }

  /**
   * Get all future events from the Membership Portal API.
   * "Future event" is defined as any event with the end date in the future.
   *
   * @private
   */
  private async getFutureEvents(): Promise<PortalEvent[]> {
    const portalAPIResponse = (await got(`${this.client.settings.portalAPI.url}/event/future`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.client.apiToken}`,
      },
    }).json()) as any;
    return portalAPIResponse.events.map((event: any) => ({
      ...event,
      start: DateTime.fromISO(event.start),
      end: DateTime.fromISO(event.end),
    }));
  }

  /**
   * Generate the QR Code for the given event and and return the Data URL for the code.
   * @param event Portal Event to create the QR code for.
   * @param expressCheckinURL URL that the QR code links to.
   * @param needsASForm if an AS attendance form is needed (if we used AS funding)
   * @param asFormFilledURL URL for the AS attendance form with prefilled fields.
   * @param needsSlide whether or not we're generating a widesgreen slide graphic
   * @returns URL of the generated QR code.
   */
  private static async generateQRCodeURL(
    event: PortalEvent,
    expressCheckinURL: URL,
    needsASForm: boolean,
    asFormFilledURL: URL,
    needsSlide: boolean
  ) {
    // Doesn't need landscape QR slide. Return the QR code by itself
    let qrCodeDataUrl;
    if (needsSlide) {
      const eventQrCode = QR.generateQR(expressCheckinURL.toString(), '', '', 'acm');
      if (needsASForm) {
        const asFormQrCode = QR.generateQR(asFormFilledURL.toString(), '', '', 'as');
        qrCodeDataUrl = await this.createQRSlide(event, eventQrCode, asFormQrCode);
      } else {
        qrCodeDataUrl = await this.createQRSlide(event, eventQrCode);
      }
    } else {
      const eventQrCode = QR.generateQR(
        expressCheckinURL.toString(),
        event.title,
        `Check-in code: ${event.attendanceCode}`
      );
      qrCodeDataUrl = await eventQrCode;
    }

    return qrCodeDataUrl;
  }

  /**
   * Creates a slide with the given QR Code and returns its URL.
   * @param event Portal Event to create the slide for.
   * @param eventQrCode QR Code for the event.
   * @param asFormQrCode Prefilled QR Code for AS Funding Form.
   * @returns URL of the generated slide.
   */
  private static async createQRSlide(event: PortalEvent, eventQrCode: string, asFormQrCode?: string) {
    /**
     * Rescales the font; makes the font size smaller if the text is longer
     * and bigger if the text is shorter.
     * @param size Original font size before rescaling
     */
    const rescaleFont = (size: number, min: number, max: number) => {
      // We want to limit how small or how big the font can get
      let rescaledSize = size;
      if (size > max) {
        rescaledSize = max;
      }
      if (size < min) {
        rescaledSize = min;
      }
      return (-2 * rescaledSize) / 3 + 65;
    };

    // Importing DM Sans as our font
    registerFont('./src/assets/DMSans-Bold.ttf', { family: 'DM Sans' });

    // AS attendance form and ACM portal checkin both needed — use dual layout
    if (typeof asFormQrCode !== 'undefined' && asFormQrCode) {
      // Creating slide with Canvas
      // Helpful resource: https://blog.logrocket.com/creating-saving-images-node-canvas/
      const slide = createCanvas(1920, 1280);
      const context = slide.getContext('2d');
      context.fillRect(0, 0, 1920, 1280);

      // Draw background
      const background = await loadImage('./src/assets/dual-qr-slide-background.png');
      context.drawImage(background, 0, 0, 1920, 1280);

      // Draw QR code
      // Tilting the slide 45 degrees before adding QR code
      const angleInRadians = Math.PI / 4;
      context.rotate(angleInRadians);
      const qrImg = await loadImage(await eventQrCode);
      const asQrImg = await loadImage(await asFormQrCode);
      context.drawImage(qrImg, 1195, -790, 400, 400);
      context.drawImage(asQrImg, 535, -130, 400, 400);
      context.rotate(-1 * angleInRadians);

      // Everything starting here has a shadow
      context.shadowColor = '#00000040';
      context.shadowBlur = 4;
      context.shadowOffsetY = 4;

      // Event title
      const title =
        event.title.substring(0, 36) === event.title ? event.title : event.title.substring(0, 36).concat('...');
      const titleSize = rescaleFont(title.length, 8, 70);
      context.textAlign = 'center';
      context.font = `${titleSize}pt 'DM Sans'`;
      context.fillText(title, 480, 1150);

      // Everything starting here has a shadow
      context.shadowColor = '#00000040';
      context.shadowBlur = 6.5;
      context.shadowOffsetY = 6.5;

      // Code
      const checkinCode = event.attendanceCode;
      const checkinSize = rescaleFont(checkinCode.length, 30, 70);
      context.fillStyle = '#ffffff';
      context.font = `${checkinSize}pt 'DM Sans'`;
      const textMetrics = context.measureText(checkinCode);
      let codeWidth = textMetrics.actualBoundingBoxLeft + textMetrics.actualBoundingBoxRight;
      // Add 120 for padding on left and right side
      codeWidth += 120;
      context.fillStyle = '#70BAFF';
      context.beginPath();
      // roundRect parameters: x, y, width, height, radius
      context.roundRect(1410 - codeWidth / 2, 930, codeWidth, 115, 20);
      context.fill();
      context.shadowOffsetY = 6.62;
      context.font = `${checkinSize}pt 'DM Sans'`;
      context.fillStyle = '#fff';
      context.fillText(checkinCode, 1410, 1010);

      // Get the Data URL of the image (base-64 encoded string of image).
      // Easier to attach than saving files.
      return slide.toDataURL();
    }
    // Only ACM portal checkin needed

    const slide = createCanvas(1920, 1080);
    const context = slide.getContext('2d');
    context.fillRect(0, 0, 1920, 1080);

    // Draw background
    const background = await loadImage('./src/assets/qr-slide-background.png');
    context.drawImage(background, 0, 0, 1920, 1080);

    // Draw QR code
    // Tilting the slide 45 degrees before adding QR code
    const angleInRadians = Math.PI / 4;
    context.rotate(angleInRadians);
    const qrImg = await loadImage(await eventQrCode);
    context.drawImage(qrImg, 375, -325, 600, 600);
    context.rotate(-1 * angleInRadians);

    // Everything starting here has a shadow
    context.shadowColor = '#00000040';
    context.shadowBlur = 4;
    context.shadowOffsetY = 4;

    // Event title
    const title =
      event.title.substring(0, 22) === event.title ? event.title : event.title.substring(0, 22).concat('...');
    const titleSize = rescaleFont(title.length, 8, 70);
    context.textAlign = 'center';
    context.font = `${titleSize}pt 'DM Sans'`;
    context.fillText(title, 1400, 550);

    // Everything starting here has a shadow
    context.shadowColor = '#00000040';
    context.shadowBlur = 6.5;
    context.shadowOffsetY = 6.5;

    // Code
    const checkinCode = event.attendanceCode;
    const checkinSize = rescaleFont(checkinCode.length, 30, 70);
    context.fillStyle = '#ffffff';
    context.font = `${checkinSize}pt 'DM Sans'`;
    const textMetrics = context.measureText(checkinCode);
    let codeWidth = textMetrics.actualBoundingBoxLeft + textMetrics.actualBoundingBoxRight;
    // Add 120 for padding on left and right side
    codeWidth += 120;
    context.fillStyle = '#70BAFF';
    context.beginPath();
    // roundRect parameters: x, y, width, height, radius
    context.roundRect(1400 - codeWidth / 2, 620, codeWidth, 136, 20);
    context.fill();
    context.shadowOffsetY = 6.62;
    context.font = `${checkinSize}pt 'DM Sans'`;
    context.fillStyle = '#fff';
    context.fillText(checkinCode, 1400, 710);

    // Get the Data URL of the image (base-64 encoded string of image).
    // Easier to attach than saving files.
    return slide.toDataURL();
  }

  /**
   * Generate the payload for a Checkin Code Embed with the provided list of PortalEvents,
   * adding QR code attachments if necessary.
   *
   * All of the events are listed in the following format:
   * - italicized event title with link to Express Checkin link
   * - Line containing checkin code
   * - Attachment of event QR code with title if necessary.
   *
   * @param events The events to generate a Checkin Code Embed for.
   * @param needsSlide If true, QR codes are generated for each event.
   * @private
   */
  // No method headers should be split between two lines due to length.
  // TODO Fix this rule in ESLint, if possible.
  // eslint-disable-next-line max-len
  private static async getCheckinMessage(
    events: PortalEvent[],
    isPublic: boolean,
    needsSlide: boolean,
    needsASForm: boolean,
    asAttendanceForm: string
  ): Promise<InteractionPayload> {
    // This method became very complicated very quickly, so we'll break this down.
    // Create arrays to store our payload contents temporarily. We'll put this in our embed
    // once we build the entire message from each event we have to build the payload for.
    const description: string[] = [];
    const qrCodes: MessageAttachment[] = [];

    // For each event we are given...
    // Note: We use Promise.all since each async function call in map sends a Promise.
    // We do this because we need to await qrCodeDataUrl's return value before pushing to qrCodes.
    // forEach doesn't allow async callbacks and for ... of doesn't allow us to run in parallel,
    // so this solution works most effectively + efficiently and is still linting-friendly.
    await Promise.all(
      events.map(async event => {
        // Generate its Express Check-In URL.
        // use searchParams.set(...) to escape bad stuff in URL's, in case we have any.
        const expressCheckinURL = new URL('https://members.acmucsd.com/checkin');
        expressCheckinURL.searchParams.set('code', event.attendanceCode);

        const asFormFilledURL = new URL(asAttendanceForm + event.title.replace(' ', '+'));
        // +'&entry.570464428='+event.foodItems.replace(' ', '+') — for food items

        // Add the Event's title and make it a hyperlink to the express check-in URL.
        description.push(`*[${event.title}](${expressCheckinURL})*`);
        // Add the check-in code for those who want to copy-paste it.
        description.push(`**Checkin Code: \`${event.attendanceCode}\`**`);
        // Add a newline to delimit the next event.
        description.push('\n');

        try {
          const qrCodeDataUrl = await this.generateQRCodeURL(
            event,
            expressCheckinURL,
            needsASForm,
            asFormFilledURL,
            needsSlide
          );
          // Do some Discord.js shenanigans to generate an attachment from the image.
          // Apparently, the Data URL MIME type of an image needs to be removed before given to
          // Discord.js. Probably because the base64 encode is enough,
          // but it was confusing the first time around.
          const qrCodeBuffer: Buffer = Buffer.from(qrCodeDataUrl.split(',')[1], 'base64');
          const qrCodeAttachment = new MessageAttachment(qrCodeBuffer, `checkin-${event.attendanceCode}.png`);
          qrCodes.push(qrCodeAttachment);
        } catch (error) {
          Logger.error(error);
        }
      })
    );

    // Once we finish all the events, we would have an extra newline. Cut that.
    description.pop();

    // Make the embed, and also set the right title, depending what kind of embed we're making.
    const embed = new MessageEmbed()
      .setTitle(isPublic ? ":calendar_spiral: Don't forget to check in!" : ":calendar_spiral: Today's Events")
      .setDescription(description.join('\n'))
      .setColor('BLUE');
    return {
      embeds: [embed],
      files: qrCodes,
    };
  }
}
