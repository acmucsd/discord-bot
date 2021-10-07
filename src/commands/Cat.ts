import { CommandInteraction, MessageAttachment } from 'discord.js';
import got from 'got';
import { v4 as newUUID } from 'uuid';
import { SlashCommandBuilder } from '@discordjs/builders';
import Command from '../Command';
import Logger from '../utils/Logger';
import { BotClient, UUIDv4 } from '../types';

/**
 * Cat returns a simple cat picture.
 *
 * This required one API call to the Cat API.
 */
export default class Cat extends Command {
  constructor(client: BotClient) {
    const definition = new SlashCommandBuilder()
      .setName('cat')
      .setDescription('Returns a random cute cat picture fetched from The Cat API. (https://thecatapi.com/)');
    super(client, {
      name: 'cat',
      enabled: true,
      description: 'Returns a random cute cat picture fetched from The Cat API. (https://thecatapi.com/)',
      category: 'Picture',
      usage: client.settings.prefix.concat('cat'),
      requiredPermissions: ['ATTACH_FILES', 'EMBED_LINKS'],
    }, definition);
  }

  public async run(interaction: CommandInteraction): Promise<void> {
    await super.defer(interaction);
    try {
      // Fetch a random cat picture
      const catPicture: string = await this.getCatPictureURL();
      // If the URL of the picture not messed up from the request...
      if (catPicture) {
        // Add the picture in an attachment and send it.
        const attachment = new MessageAttachment(catPicture);
        await super.edit(interaction, {
          files: [attachment],
        });
      } else {
        // If the cat picture URL is undefined, log it.
        Logger.error('Error when returning response for \'cat\' command: undefined URL for image', {
          eventType: 'interfaceError',
          interface: 'catAPI',
          error: 'undefined URL for image',
        });
        // Alert the user.
        await super.edit(interaction, "I can't find a cat image right now. It's possible I got rate-limited (asked for too many cat pics this month).");
        return;
      }
    } catch (e) {
      // Log any other possible errors.
      const errorUUID: UUIDv4 = newUUID();
      Logger.error(`Error whilst fetching image URL from Cat API: ${e}`, {
        eventType: 'interfaceError',
        interface: 'catAPI',
        error: e,
        uuid: errorUUID,
      });
      await super.edit(interaction, `An error occurred when hitting the Cat API. *(Error UUID: ${errorUUID})*`);
    }
  }

  /**
   * Helper method to fetch a picture of a cat from the Cat API.
   * @see {@link https://docs.thecatapi.com/ Cat API Documentation}
   * @private
   */
  private async getCatPictureURL(): Promise<string> {
    const catAPIResponse = await got('https://api.thecatapi.com/v1/images/search', {
      headers: {
        'x-api-key': this.client.settings.apiKeys.catAPI,
      },
    }).json() as any;

    // return "undefined" if absolutely anything happens that is not intended behavior.
    return catAPIResponse !== undefined ? catAPIResponse[0].url : undefined;
  }
}
