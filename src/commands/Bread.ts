import { Message, MessageAttachment } from 'discord.js';
import { v4 as newUUID } from 'uuid';
import got from 'got';
import Command from '../Command';
import { BotClient, UUIDv4 } from '../types';
import Logger from '../utils/Logger';

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
      const breadPicture: string = await this.getBreadPictureURL();
      if (breadPicture) {
        const attachment = new MessageAttachment(`${breadPicture}.png`, 'bread.png');
        await super.respond(message.channel, attachment);
      } else {
        Logger.error('Error when returning response for \'bread\' command: undefined URL for image', {
          eventType: 'interfaceError',
          interface: 'breadAPI',
          error: 'undefined URL for image',
        });
        await super.respond(message.channel, "I can't find a bread image right now. It's possible I got rate-limited (asked for too many bread pics this month).");
        return;
      }
    } catch (e) {
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

  private async getBreadPictureURL(): Promise<string> {
    const breadAPIResponse = await got('https://api.unsplash.com/photos/random?query=bread', {
      headers: {
        Authorization: `Client-ID ${this.client.settings.apiKeys.unsplash}`,
      },
    }).json() as any;

    return breadAPIResponse !== undefined ? breadAPIResponse.urls.full : undefined;
  }
}
