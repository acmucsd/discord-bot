import {
  CommandInteraction, MessageAttachment, MessageEmbed,
} from 'discord.js';
import got from 'got';
import { DateTime, Interval } from 'luxon';
import { v4 as newUUID } from 'uuid';
import { SlashCommandBuilder } from '@discordjs/builders';
import QRCode from 'easyqrcodejs-nodejs';
import {
  BotClient, InteractionPayload, PortalEvent, UUIDv4,
} from '../types';
import Command from '../Command';
import Logger from '../utils/Logger';

/**
 * This Command DM's the caller the checkin code and Express Checkin link for any events
 * in today's timeframe. Optional argument `now` makes the embed with the checkin codes
 * be returned in the same chat as the Command message, but only for currently running events.
 */
export default class Checkin extends Command {
  constructor(client: BotClient) {
    const definition = new SlashCommandBuilder()
      .setName('checkin')
      .addBooleanOption((option) => option.setName('now').setDescription('If true, send public embed of checking code for live events!').setRequired(false))
      .addBooleanOption((option) => option.setName('qr').setDescription('If possible, include a QR code for Express Check-In in embed.').setRequired(false))
      .setDescription('Sends a DM or embed with all check-in codes from today\'s events. Includes Express Checkin QR code!');

    super(client, {
      name: 'checkin',
      boardRequired: true,
      enabled: true,
      description: 'Sends a private message with all check-in codes from today\'s events. Calling with `now` argument sends public embed of checkin code if any events are now live!',
      category: 'Utility',
      usage: client.settings.prefix.concat('checkin [now]'),
      requiredPermissions: ['SEND_MESSAGES'],
    }, definition);
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
    const nowArgument = interaction.options.getBoolean('now');
    const qrArgument = interaction.options.getBoolean('qr');

    const isPublic = nowArgument !== null ? nowArgument : false;
    // By default, we want to include QR codes.
    const needsQr = qrArgument !== null ? qrArgument : true;

    // Defer the reply ephemerally only if it's a private command call.
    await super.defer(interaction, !isPublic);

    // Get all future events marked in the portal API.
    try {
      const futureEvents = await this.getFutureEvents();

      // Oh, boy, here come more dates and times to check.
      // Luxon makes it much nicer, however.
      //
      // We need two sets of arrays for "checkin":
      // - all events that have a start time within today's timeframe
      // - all events that are live RIGHT NOW
      //
      // The first set is useful for us to prepare a checkin code beforehand, while the second set
      // enables the functionality for `checkin now`. We'll start with the first set.
      const todayEvents = futureEvents.filter((event) => {
        // get today's midnight
        const midnightToday = DateTime.now().set({
          hour: 0, minute: 0, second: 0, millisecond: 0,
        });

        // get tomorrow's midnight
        const midnightTomorrow = DateTime.now().set({
          hour: 0, minute: 0, second: 0, millisecond: 0,
        }).plus({ day: 1 });

        // check if start time in between
        return Interval.fromDateTimes(midnightToday, midnightTomorrow).contains(event.start);
      });

      // Check if current time in between event
      const liveEvents = futureEvents.filter(
        (event) => Interval.fromDateTimes(event.start, event.end).contains(DateTime.now()),
      );

      // We'll make sure to check if the required set of events by
      // command arugments is empty; if it is, just return "No events today!"
      if (!isPublic && todayEvents.length === 0) {
        await super.edit(interaction, {
          content: 'No events today!',
          ephemeral: true,
        });
        return;
      }
      if (isPublic && liveEvents.length === 0) {
        await super.edit(interaction, 'No events right now!');
        return;
      }

      // Now we finally check the command argument.
      // If we just had `checkin` in our call, no arguments...
      if (!isPublic) {
        const author = await this.client.users.fetch(interaction.member!.user.id);
        // What we need now is to construct the Payload to send for `checkin` with no arguments,
        // as well as the Payload for when we have `checkin now`.
        //
        // Since this is private, we can list all of today's events.
        const privateMessage = await Checkin.getCheckinMessage(todayEvents, isPublic, needsQr);
        await author.send(privateMessage);
        await super.edit(interaction, {
          content: 'Check your DM.',
          ephemeral: true,
        });
      } else {
        // This is public, so we only want to give events that are live RIGHT now (so no one can
        // pre-emptively get checkin codes if they're left to be seen).
        const publicMessage = await Checkin.getCheckinMessage(liveEvents, isPublic, needsQr);
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
      await super.edit(interaction, `An error occurred when attempting to query the leaderboard data from the portal API. *(Error UUID: ${errorUUID})*`);
    }
  }

  /**
   * Get all future events from the Membership Portal API.
   * "Future event" is defined as any event with the end date in the future.
   *
   * @private
   */
  private async getFutureEvents(): Promise<PortalEvent[]> {
    const portalAPIResponse = await got('https://api.acmucsd.com/api/v2/event/future', {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.client.apiToken}`,
      },
    }).json() as any;

    return portalAPIResponse.events.map((event: any) => (
      {
        ...event,
        start: DateTime.fromISO(event.start),
        end: DateTime.fromISO(event.end),
      }));
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
   * @param needsQr If true, QR codes are generated for each event.
   * @private
   */
  // No method headers should be split between two lines due to length.
  // TODO Fix this rule in ESLint, if possible.
  // eslint-disable-next-line max-len
  private static async getCheckinMessage(events: PortalEvent[], isPublic: boolean, needsQr: boolean): Promise<InteractionPayload> {
    // This method became very complicated very quickly, so we'll break this down.
    // Create arrays to store our payload contents temporarily. We'll put this in our embed
    // once we build the entire message from each event we have to build the payload for.
    const description: string[] = [];
    const qrCodes: MessageAttachment[] = [];

    // For each event we are given...
    await events.forEach(async (event) => {
      // Generate its Express Check-In URL.
      // use searchParams.set(...) to escape bad stuff in URL's, in case we have any.
      const expressCheckinURL = new URL('https://members.acmucsd.com/checkin');
      expressCheckinURL.searchParams.set('code', event.attendanceCode);

      // Add the Event's title and make it a hyperlink to the express check-in URL.
      description.push(`*[${event.title}](${expressCheckinURL})*`);
      // Add the check-in code for those who want to copy-paste it.
      description.push(`**Checkin Code: \`${event.attendanceCode}\`**`);
      // Add a newline to delimit the next event.
      description.push('\n');

      // If we have to also add QR codes to the embed...
      if (needsQr) {
        // Create the QR code. This library is very undocumented, so we'll make it simpler to read.
        const eventQrCode = new QRCode({
          // The text of the QR code we need to insert. This is just our express check-in URL.
          text: expressCheckinURL.toString(),
          // Make the QR code black and white.
          colorDark: '#000000',
          colorLight: '#ffffff',
          // Maximum error-correction level to allow for maximum logo placement.
          correctLevel: QRCode.CorrectLevel.H,
          // Link to our logo. This HAS to be a white-background PNG. I also tilted it
          // 45 degrees to make the QR code diamond-able(?)
          logo: 'src/assets/acm-qr-logo.png',
          logoBackgroundTransparent: false,
          // Add white padding of 30px around the picture. Also add the name
          // of the event to the image to differentiate between event QR codes
          // (if multiple events in one day) and offset the title to fit in "quiet zone".
          quietZone: 30,
          title: event.title,
          titleTop: -10,
        });

        // Get the Data URL of the image (base-64 encoded string of image).
        // Easier to attach than saving files.
        const qrCodeDataUrl = await eventQrCode.toDataURL();

        // Do some Discord.js shenanigans to generate an attachment from the image.
        // Apparently, the Data URL MIME type of an image needs to be removed before given to
        // Discord.js. Probably because the base64 encode is enough, but it was confusing the first
        // time around.
        const qrCodeBuffer: Buffer = Buffer.from(qrCodeDataUrl.split(',')[1], 'base64');
        const qrCodeAttachment = new MessageAttachment(qrCodeBuffer, `checkin-${event.attendanceCode}.png`);
        qrCodes.push(qrCodeAttachment);
      }
    });

    // Once we finish all the events, we would have an extra newline. Cut that.
    description.pop();

    // Make the embed, and also set the right title, depending what kind of embed we're making.
    const embed = new MessageEmbed()
      .setTitle(isPublic ? ':calendar_spiral: Don\'t forget to check in!' : ':calendar_spiral: Today\'s Events')
      .setDescription(description.join('\n'))
      .setColor('BLUE');

    return {
      embeds: [embed],
      files: qrCodes,
    };
  }
}
