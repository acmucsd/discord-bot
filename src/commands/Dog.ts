import { CommandInteraction, MessageAttachment } from 'discord.js';
import got from 'got';
import { v4 as newUUID } from 'uuid';
import { SlashCommandBuilder } from '@discordjs/builders';
import Command from '../Command';
import Logger from '../utils/Logger';
import { BotClient } from '../types';

/**
 * Dog returns a simple dog picture.
 *
 * This required one API call to the Dog API.
 */
export default class Dog extends Command {
  constructor(client: BotClient) {
    const definition = new SlashCommandBuilder()
      .setName('dog')
      .setDescription('Returns a random cute dog picture fetched from the Dog API. (https://dog.ceo/dog-api/)');

    super(client, {
      name: 'dog',
      enabled: true,
      description: 'Returns a random cute dog picture fetched from the Dog API. (https://dog.ceo/dog-api/)',
      category: 'Picture',
      usage: client.settings.prefix.concat('dog'),
      requiredPermissions: ['ATTACH_FILES', 'EMBED_LINKS'],
    }, definition);
  }

  public async run(interaction: CommandInteraction): Promise<void> {
    await super.defer(interaction);
    try {
      // Fetch a random dog picture.
      const dogPicture = await Dog.getDogPictureURL();
      // If the URL of the picture not messed up from the request...
      if (dogPicture) {
        // Add the picture in an attachment and send it.
        const attachment = new MessageAttachment(dogPicture);
        await super.edit(interaction, {
          files: [attachment],
        });
      } else {
        // If the dog picture URL is undefined, log it.
        Logger.error('Error when returning response for \'dog\' command: undefined URL for image', {
          eventType: 'interfaceError',
          interface: 'dogAPI',
          error: 'undefined URL for image',
        });
        // Alert the user.
        await super.edit(interaction, "I can't find a dog image right now. This shouldn't happen. Blame my maintainer.");
        return;
      }
    } catch (e) {
      // Log any other possible errors.
      const errorUUID = newUUID();
      Logger.error(`Error whilst fetching image URL from Dog API: ${e}`, {
        eventType: 'interfaceError',
        interface: 'dogAPI',
        error: e,
        uuid: errorUUID,
      });
      await super.edit(interaction, `An error occurred when hitting the Dog API. *(Error UUID: ${errorUUID})*`);
    }
  }

  /**
   * Helper method to fetch a picture of a dog from the Dog API.
   *
   * @see {@link https://dog.ceo/dog-api/documentation/ Dog API Documentation}
   * @private
   */
  private static async getDogPictureURL(): Promise<string> {
    const dogAPIResponse = await got('https://dog.ceo/api/breeds/image/random', {
    }).json() as any;

    // return "undefined" if absolutely anything happens that is not intended behavior.
    return dogAPIResponse !== undefined ? dogAPIResponse.message : undefined;
  }
}
