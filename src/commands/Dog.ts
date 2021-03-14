import { Message, MessageAttachment } from 'discord.js';
import got from 'got';
import { v4 as newUUID } from 'uuid';
import Command from '../Command';
import Logger from '../utils/Logger';
import { BotClient } from '../types';

export default class Dog extends Command {
  constructor(client: BotClient) {
    super(client, {
      name: 'dog',
      enabled: true,
      description: 'Returns a random cute dog picture fetched from the Dog API. (https://dog.ceo/dog-api/)',
      category: 'Picture',
      usage: client.settings.prefix.concat('dog'),
      requiredPermissions: ['ATTACH_FILES', 'EMBED_LINKS'],
    });
  }

  public async run(message: Message): Promise<void> {
    try {
      const dogPicture = await Dog.getDogPictureURL();
      if (dogPicture) {
        const attachment = new MessageAttachment(dogPicture);
        await super.respond(message.channel, attachment);
      } else {
        Logger.error('Error when returning response for \'dog\' command: undefined URL for image', {
          eventType: 'interfaceError',
          interface: 'dogAPI',
          error: 'undefined URL for image',
        });
        await super.respond(message.channel, "I can't find a dog image right now. This shouldn't happen. Blame my maintainer.");
        return;
      }
    } catch (e) {
      const errorUUID = newUUID();
      Logger.error(`Error whilst fetching image URL from Dog API: ${e}`, {
        eventType: 'interfaceError',
        interface: 'dogAPI',
        error: e,
        uuid: errorUUID,
      });
      await super.respond(message.channel, `An error occurred when hitting the Dog API. *(Error UUID: ${e.uuid})`);
    }
  }

  private static async getDogPictureURL(): Promise<string> {
    const dogAPIResponse = await got('https://dog.ceo/api/breeds/image/random', {
      responseType: 'json',
    });

    const { body } = dogAPIResponse as any;

    return body !== undefined ? body.message : undefined;
  }
}
