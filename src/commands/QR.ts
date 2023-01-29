import { SlashCommandBuilder } from '@discordjs/builders';
import { CommandInteraction, MessageAttachment, MessageEmbed } from 'discord.js';
import QRCode from 'easyqrcodejs-nodejs';
import Command from '../Command';
import { BotClient } from '../types';

/**
 * This Command is a simple QR code generator.
 *
 * Pass a string, get an ACM-branded QR code publicly shared.
 */
export default class QR extends Command {
  constructor(client: BotClient) {
    const definition = new SlashCommandBuilder()
      .setName('qr')
      .addStringOption((option) => option.setName('content').setDescription('The content to put in the QR code.').setRequired(true))
      .addStringOption((option) => option.setName('title').setDescription('The title of the QR. If empty, will use URL of QR code as title.').setRequired(false))
      .setDescription('Generates a QR code with the provided text in it. Includes ACM logo!');

    super(client, {
      name: 'qr',
      boardRequired: true,
      enabled: true,
      description: 'Generates an ACM-branded QR code with a provided text in it.',
      category: 'Utility',
      usage: client.settings.prefix.concat('qr <text> [title text]'),
      requiredPermissions: ['SEND_MESSAGES'],
    }, definition);
  }

  /**
   * Generates and returns a QR code given the data, title, and subtitle.
   * 
   * @param interaction The Slash Command Interaction instance.
   * @param interaction The Slash Command Interaction instance.
   * @param interaction The Slash Command Interaction instance.
   * @returns
   */
  public generateQR(data: string, title: string, subtitle: string): QRCode {
    return new QRCode ({
      text: data,
      colorDark: '#000000',
      colorLight: 'rgb(0,0,0,0)',
      correctLevel: QRCode.CorrectLevel.H,
      logo: 'src/assets/acm-qr-logo.png',
      logoBackgroundTransparent: false,
      backgroundImage: 'src/assets/background.png',
      quietZone: 40,
      title: title,
      titleTop: -20,
      titleBackgroundColor: 'transparent',
      subTitle: `Check-in code: ${subtitle}`,
      subTitleTop: -5,
    });
  }

  /**
   * The workhorse of QR, this just makes a QR code and sends it to the channel.
   * We don't validate the data of the QR code, though we could.
   *
   * @param interaction The Slash Command Interaction instance.
   */
  public async run(interaction: CommandInteraction): Promise<void> {
    // Get all the arguments.
    const content = interaction.options.getString('content', true);
    const titleArgument = interaction.options.getString('title');
    const customTitle = titleArgument !== null;

    // Defer the reply so we can have time to make the QR code.
    await super.defer(interaction);

    // Make the QR code.
    //
    // See Checkin.ts on how QR code arguments work.
    //
    const qrCode = new QRCode({
      text: content,
      colorDark: '#000000',
      colorLight: '#ffffff',
      correctLevel: QRCode.CorrectLevel.H,
      logo: 'src/assets/acm-qr-logo.png',
      logoBackgroundTransparent: false,
      quietZone: 30,
      // Conditionally add the title to the QR code.
      // If the title is custom, include it
      ...(customTitle ? {
        title: titleArgument.substring(0, 36) === titleArgument ? titleArgument : titleArgument.substring(0, 36).concat('...'),
        titleTop: -10,
      } : {
        title: content.substring(0, 36) === content ? content : content.substring(0, 36).concat('...'),
        titleTop: -10,
      }),
    });

    // Make the Discord attachment for the QR code.
    const qrCodeDataUrl = await qrCode.toDataURL();
    const qrCodeBuffer: Buffer = Buffer.from(qrCodeDataUrl.split(',')[1], 'base64');
    const qrCodeAttachment = new MessageAttachment(qrCodeBuffer, 'qr.png');

    // Add a descriptive embed to make the contents of the QR code more obvious to others.
    const embed = new MessageEmbed()
      .setTitle('Done!')
      .setDescription(`Content of QR code: ${content}`)
      .setColor('BLUE');

    // Send it!
    await super.edit(interaction, {
      embeds: [embed],
      files: [qrCodeAttachment],
    });
  }
}
