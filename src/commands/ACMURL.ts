import { SlashCommandBuilder } from '@discordjs/builders';
import { CommandInteraction, MessageEmbed } from 'discord.js';
import got from 'got';
import { v4 as newUUID } from 'uuid';
import Command from '../Command';
import { BotClient, UUIDv4 } from '../types';
import Logger from '../utils/Logger';
import { validURL } from '../utils/validType';

/**
 * Command to shorten long URL's to an ACMURL.
 *
 * ACMURL's are of format `https://acmurl.com/some-text`.
 * This Command required API calls to YOURLS, among other various complicated checks.
 */
export default class ACMURL extends Command {
  constructor(client: BotClient) {
    const definition = new SlashCommandBuilder()
      .setName('acmurl')
      .addStringOption(option =>
        option.setName('shortlink').setDescription('The short ID of the url (eg. "discord")').setRequired(true)
      )
      .addStringOption(option => option.setName('longlink').setDescription('The URL to shorten.').setRequired(true))
      .addStringOption(option =>
        option.setName('description').setDescription("The description of the link in ACMURL's dashboard.")
      )
      .setDescription('Shortens the provided link into an ACMURL link.');

    super(
      client,
      {
        name: 'acmurl',
        boardRequired: true,
        enabled: true,
        description: 'Shortens the provided link into an `ACMURL` link.',
        category: 'Utility',
        usage: client.settings.prefix.concat('acmurl <shortlink> <longlink> [description]'),
        requiredPermissions: ['SEND_MESSAGES'],
      },
      definition
    );
  }

  public async run(interaction: CommandInteraction): Promise<void> {
    // Let's defer the reply first
    await super.defer(interaction);
    // Alright, this is the biggest command by far.
    // This might be able to be split better, but who knows?
    //
    // Get command arguments. Make description tokens all together in an array.
    const shortlink = interaction.options.getString('shortlink', true);
    const longlink = interaction.options.getString('longlink', true);
    const description = interaction.options.getString('description');

    // Set title of URL, or undefined if initial array did not exist.
    const linkTitle = description || `Discord Bot - ${shortlink}`; // optional argument or slashtag

    // If we didn't get our required arguments...
    if (!shortlink || !longlink) {
      await super.edit(interaction, 'You must provide both the long link and the short link!');
      return;
    }

    // If provided long link is not a valid URL...
    if (!validURL(longlink)) {
      await super.edit(interaction, 'The long link must be a valid HTTP/HTTPS URL!');
      return;
    }

    try {
      // Add our ACMURL
      const shortURL = await this.addACMURL(shortlink, longlink, linkTitle);
      // Make an embed representing success.
      const shortenEmbed = new MessageEmbed()
        .setTitle('Set shortened link!')
        .setDescription(`Short link: ${shortURL}`)
        .setURL(shortURL)
        .setColor('BLUE');
      await super.edit(interaction, {
        embeds: [shortenEmbed],
      });
      return;
    } catch (e) {
      // We might error out if an ACMURL already exists with the provided shortlink.
      // We'll attempt to handle that by updating the ACMURL.
      const errorUUID: UUIDv4 = newUUID();

      const error = e as any;

      // If the error we get is specifically that a ACMURL already existed.
      if (error.message === 'error:keyword') {
        try {
          // Make a new one and return the old long link and new ACMURL
          const [previousURL, newURL] = await this.handleExistingACMURL(shortlink, longlink, linkTitle);
          // Create an embed signalling an updated ACMURL.
          const shortenEmbed = new MessageEmbed()
            .setTitle('Updated shortened link!')
            .setDescription(`Short link: ${newURL}\nPreviously shortened link: ${previousURL}`)
            .setURL(newURL)
            .setColor('BLUE');
          await super.edit(interaction, {
            embeds: [shortenEmbed],
          });
        } catch (e2) {
          const updateError = e2 as any;
          // If by any chance there's an error when updating the ACMURL, log it and return.
          Logger.error(`Error whilst updating short URL on YOURLS API: ${updateError.message}`, {
            eventType: 'interfaceError',
            interface: 'YOURLS',
            error: updateError,
            uuid: errorUUID,
          });
          await super.edit(
            interaction,
            `An error occurred when attempting to update the short URL. *(Error UUID: ${errorUUID})*`
          );
        }
      } else {
        // If the error we had initially when adding the ACMURL is any other error,
        // log it and return.
        Logger.error(`Error whilst creating short URL on YOURLS API: ${error.message}`, {
          eventType: 'interfaceError',
          interface: 'YOURLS',
          error,
          uuid: errorUUID,
        });
        await super.edit(interaction, `An error occurred when shortening the URL. *(Error UUID: ${errorUUID})*`);
      }
    }
  }

  /**
   * Handle an existing ACMURL by updating it properly.
   * @param shortlink The short link to make an ACMURL for.
   * @param longlink The link to point it to.
   * @param title Title of ACMURL in YOURLS interface.
   * @private
   * @returns Tuple of old URL on YOURLS and new ACMURL.
   */
  private async handleExistingACMURL(shortlink: string, longlink: string, title: string): Promise<[string, string]> {
    // get the old URL
    const previousURL = await this.expandACMURL(shortlink);
    // Add the new one.
    await this.updateACMURL(shortlink, longlink, title);
    return [previousURL, `https://acmurl.com/${shortlink}`];
  }

  /**
   * Add an ACMURL. Makes one HTTP call to YOURLS' API.
   *
   * @param shortlink The short link to make an ACMURL for.
   * @param longlink The link to point it to.
   * @param title Title of ACMURL in YOURLS interface.
   * @private
   * @returns The new shortened ACMURL.
   */
  private async addACMURL(shortlink: string, longlink: string, title: string): Promise<string> {
    const acmurlAPIResponse = (await got
      .post('https://acmurl.com/yourls-api.php', {
        form: {
          username: this.client.settings.acmurl.username,
          password: this.client.settings.acmurl.password,
          action: 'shorturl',
          keyword: shortlink,
          url: longlink,
          format: 'json',
          title,
        },
      })
      .json()) as any;

    if (acmurlAPIResponse.status === 'fail') {
      throw new Error(acmurlAPIResponse.code);
    }
    return acmurlAPIResponse.shorturl;
  }

  /**
   * Get the link that is redirected from a given ACMURL. Makes one HTTP call to YOURLS' API.
   * @param shortlink The short link to check the ACMURL for.
   * @private
   * @returns the link that `acmurl.com/shortlink` points to.
   */
  private async expandACMURL(shortlink: string): Promise<string> {
    const acmurlAPIResponse = (await got
      .post('https://acmurl.com/yourls-api.php', {
        form: {
          username: this.client.settings.acmurl.username,
          password: this.client.settings.acmurl.password,
          action: 'expand',
          shorturl: shortlink,
          format: 'json',
        },
      })
      .json()) as any;
    return acmurlAPIResponse !== undefined ? acmurlAPIResponse.longurl : undefined;
  }

  /**
   * Overwrite the current ACMURL with a new one. Makes one HTTP call to YOURLS' API.
   * @param shortlink The short link to make an ACMURL for.
   * @param longlink The link to point it to.
   * @param title Title of ACMURL in YOURLS interface.
   * @private
   */
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
