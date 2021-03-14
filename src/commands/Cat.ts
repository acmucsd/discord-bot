import { Message, MessageAttachment } from 'discord.js';
import got from 'got';
import { v4 as newUUID } from 'uuid';
import Command from '../Command';
import Logger from '../utils/Logger';
import { BotClient, UUIDv4 } from '../types';

export default class Cat extends Command {
  constructor(client: BotClient) {
    super(client, {
      name: 'cat',
      enabled: true,
      description: 'Returns a random cute cat picture fetched from The Cat API. (https://thecatapi.com/)',
      category: 'Picture',
      usage: client.settings.prefix.concat('cat'),
      requiredPermissions: ['ATTACH_FILES', 'EMBED_LINKS'],
    });
  }

  public async run(message: Message): Promise<void> {
    try {
      const catPicture: string = await this.getCatPictureURL();
      if (catPicture) {
        const attachment = new MessageAttachment(catPicture);
        await super.respond(message.channel, attachment);
      } else {
        Logger.error('Error when returning response for \'cat\' command: undefined URL for image', {
          eventType: 'interfaceError',
          interface: 'catAPI',
          error: 'undefined URL for image',
        });
        await super.respond(message.channel, "I can't find a cat image right now. It's possible I got rate-limited (asked for too many cat pics this month).");
        return;
      }
    } catch (e) {
      const errorUUID: UUIDv4 = newUUID();
      Logger.error(`Error whilst fetching image URL from Cat API: ${e.message}`, {
        eventType: 'interfaceError',
        interface: 'catAPI',
        error: e,
        uuid: errorUUID,
      });
      await super.respond(message.channel, `An error occurred when hitting the Cat API. *(Error UUID: ${errorUUID})*`);
    }
  }

  private async getCatPictureURL(): Promise<string> {
    const catAPIResponse = await got('https://api.thecatapi.com/v1/images/search', {
      headers: {
        'x-api-key': this.client.settings.apiKeys.catAPI,
      },
    }).json() as any;

    return catAPIResponse !== undefined ? catAPIResponse[0].url : undefined;
  }
}
