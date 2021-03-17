import { Message, MessageAttachment } from 'discord.js';
import { v4 as newUUID } from 'uuid';
import got from 'got';
import Command from '../Command';
import { BotClient, UUIDv4 } from '../types';
import Logger from '../utils/Logger';

/**
 * Bread returns a simple bread picture.
 *
 * This requires one API call to the Unsplash API.
 */
export default class Bread extends Command {
  constructor(client: BotClient) {
    super(client, {
      name: 'bread',
      enabled: true,
      description: 'Returns a random bread picture fetched from the Unsplash API. (https://api.unsplash.com/). Notoriously inaccurate at classifying bread.',
      category: 'Picture',
      usage: client.settings.prefix.concat('bread'),
      requiredPermissions: ['ATTACH_FILES', 'EMBED_LINKS'],
    });
  }

  public async run(message: Message): Promise<void> {
    try {
      // Fetch a random "bread" picture.
      // Look, Unsplash is wack.
      const breadPicture: string = await this.getBreadPictureURL();
      // If the URL of the picture not messed up from the request...
      if (breadPicture) {
        // Add a `.png` to the end of the URL, since Unsplash cuts it and we need it
        // for Discord to register the attachment as a picture and render it.
        const attachment = new MessageAttachment(`${breadPicture}.png`, 'bread.png');
        await super.respond(message.channel, attachment);
      } else {
        // If the bread picture URL is undefined, log it.
        Logger.error('Error when returning response for \'bread\' command: undefined URL for image', {
          eventType: 'interfaceError',
          interface: 'breadAPI',
          error: 'undefined URL for image',
        });
        // Alert the user.
        await super.respond(message.channel, "I can't find a bread image right now. It's possible I got rate-limited (asked for too many bread pics this month).");
        return;
      }
    } catch (e) {
      // Log any other possible errors.
      const errorUUID: UUIDv4 = newUUID();
      Logger.error(`Error whilst fetching image URL from Bread API: ${e.message}`, {
        eventType: 'interfaceError',
        interface: 'breadAPI',
        error: e,
        uuid: errorUUID,
      });
      await super.respond(message.channel, `An error occurred when fetching from Unsplash. *(Error UUID: ${errorUUID})*`);
    }
  }

  /**
   * Helper method to fetch a picture of bread from Unsplash.
   *
   * @see {@link https://unsplash.com/documentation#get-a-random-photo Unsplash API Documentation}
   * @private
   */
  private async getBreadPictureURL(): Promise<string> {
    const breadAPIResponse = await got('https://api.unsplash.com/photos/random?query=bread', {
      headers: {
        Authorization: `Client-ID ${this.client.settings.apiKeys.unsplash}`,
      },
    }).json() as any;

    return breadAPIResponse !== undefined ? breadAPIResponse.urls.full : undefined;
  }
}
