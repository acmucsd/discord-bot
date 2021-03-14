import { Message, MessageEmbed } from 'discord.js';
import got from 'got';
import { v4 as newUUID } from 'uuid';
import Command from '../Command';
import { BotClient, UUIDv4 } from '../types';
import Logger from '../utils/Logger';
import validURL from '../utils/validURL';

export default class ACMURL extends Command {
  constructor(client: BotClient) {
    super(client, {
      name: 'acmurl',
      boardRequired: true,
      enabled: true,
      description: 'Shortens the provided link into an `ACMURL` link.',
      category: 'Utility',
      usage: `${client.settings.prefix.concat('acmurl')} <shortlink> <longlink> [description]`,
      requiredPermissions: ['SEND_MESSAGES'],
    });
  }

  public async run(message: Message, args: string[]): Promise<void> {
    const [shortlink, longlink, ...descriptionTokens] = args;
    const description = descriptionTokens.join(' ');
    const linkTitle = description || `Discord Bot - ${shortlink}`; // optional argument or slashtag

    if (!shortlink || !longlink) {
      await super.respond(message.channel, 'You must provide both the long link and the short link!');
    }

    if (!validURL(longlink)) {
      // check for valid URL
      await super.respond(message.channel, 'The long link must be a valid HTTP/HTTPS URL!');
    }

    try {
      const shortURL = await this.addACMURL(shortlink, longlink, linkTitle);
      const shortenEmbed = new MessageEmbed()
        .setTitle('Set shortened link!')
        .setDescription(`Short link: ${shortURL}`)
        .setURL(shortURL)
        .setColor('0x3498DB');
      await super.respond(message.channel, shortenEmbed);
      return;
    } catch (e) {
      const errorUUID: UUIDv4 = newUUID();

      if (e.message === 'error:keyword') {
        try {
          const [previousURL, newURL] = await this.handleExistingACMURL(
            shortlink, longlink, linkTitle,
          );
          const shortenEmbed = new MessageEmbed()
            .setTitle('Updated shortened link!')
            .setDescription(
              `Short link: ${newURL}\nPreviously shortened link: ${previousURL}`,
            )
            .setURL(newURL)
            .setColor('0x3498DB');
          await super.respond(message.channel, shortenEmbed);
        } catch (updateError) {
          Logger.error(`Error whilst updating short URL on YOURLS API: ${updateError.message}`, {
            eventType: 'interfaceError',
            interface: 'YOURLS',
            error: updateError,
            uuid: errorUUID,
          });
          await super.respond(message.channel, `An error occurred when attempting to update the short URL. *(Error UUID: ${errorUUID})*`);
        }
      } else {
        Logger.error(`Error whilst creating short URL on YOURLS API: ${e.message}`, {
          eventType: 'interfaceError',
          interface: 'YOURLS',
          error: e,
          uuid: errorUUID,
        });
        await super.respond(message.channel, `An error occurred when shortening the URL. *(Error UUID: ${errorUUID})*`);
      }
    }
  }

  private async handleExistingACMURL(
    shortlink: string, longlink: string, title: string,
  ): Promise<[string, string]> {
    const previousURL = await this.expandACMURL(shortlink);
    await this.updateACMURL(shortlink, longlink, title);
    return [previousURL, `https://acmurl.com/${shortlink}`];
  }

  private async addACMURL(shortlink: string, longlink: string, title: string): Promise<string> {
    const acmurlAPIResponse = await got.post('https://acmurl.com/yourls-api.php', {
      form: {
        username: this.client.settings.acmurl.username,
        password: this.client.settings.acmurl.password,
        action: 'shorturl',
        keyword: shortlink,
        url: longlink,
        format: 'json',
        title,
      },
    }).json() as any;

    if (acmurlAPIResponse.status === 'fail') {
      throw new Error(acmurlAPIResponse.code);
    }
    return acmurlAPIResponse.shorturl;
  }

  private async expandACMURL(shortlink: string): Promise<string> {
    const acmurlAPIResponse = await got.post('https://acmurl.com/yourls-api.php', {
      form: {
        username: this.client.settings.acmurl.username,
        password: this.client.settings.acmurl.password,
        action: 'expand',
        shorturl: shortlink,
        format: 'json',
      },
    }).json() as any;
    return acmurlAPIResponse !== undefined ? acmurlAPIResponse.longurl : undefined;
  }

  private async updateACMURL(shortlink: string, longlink: string, title: string): Promise<void> {
    await got.post('https://acmurl.com/yourls-api.php', {
      form: {
        username: this.client.settings.acmurl.username,
        password: this.client.settings.acmurl.password,
        action: 'update',
        shorturl: shortlink,
        url: longlink,
        format: 'json',
        title,
      },
    });
  }
}
