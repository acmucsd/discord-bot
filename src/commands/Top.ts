import { CommandInteraction, MessageEmbed } from 'discord.js';
import got from 'got';
import { chunk } from 'lodash';

import { v4 as newUUID } from 'uuid';
import { getCurrentQuarter, getCurrentYear } from 'ucsd-quarters-years';

import { SlashCommandBuilder } from '@discordjs/builders';
import { ButtonPaginator } from '@psibean/discord.js-pagination';
import Command from '../Command';
import { BotClient, User, UUIDv4 } from '../types';
import Logger from '../utils/Logger';

/**
 * A Leaderboard command for the bot, linked to the Membership Portal.
 *
 * The Membership Portal has a Leaderboard page, which lists the members with the most
 * points in a given time period, such as during the academic quarter, year, and all-time
 * records. This Command provides a Discord embed with a similar functionality. The Embed
 * has pagination functionality, so as to keep an equal size regardless of number of people
 * requested from leaderboard.
 *
 * For the purposes of maintaining equal size, the Embed is paginated with 10 members from
 * the leaderboard per page.
 *
 * The Command allows for two levels of customization:
 * - number of top individuals to put on the leaderboard (to a maximum of 100 members)
 * - period of time to generate leaderboard for (current year, current academic quarter)
 */
export default class Top extends Command {
  /**
   * The default constructor. Primarily logs in to the portal when initialized and saves
   * the provided JWT into our variable.
   *
   * @param client The Client we are initializing this Command for.
   */
  constructor(client: BotClient) {
    const definition = new SlashCommandBuilder()
      .setName('top')
      .addIntegerOption(option => option.setName('members').setDescription('Number of members to list.'))
      .addStringOption(option =>
        option
          .setName('type')
          .setDescription('Type of leaderboard (All-Time, Quarterly, Yearly)')
          .addChoice('Yearly', 'Yearly')
          .addChoice('Quarterly', 'Quarterly')
          .addChoice('All-Time', 'All-Time')
      )
      .setDescription('Shows the top N members on the Membership Portal leaderboard.');
    super(
      client,
      {
        name: 'top',
        enabled: true,
        description:
          'Shows the top `number` members on the Membership Portal leaderboard. By default, show the top 10 on the all-time leaderboard. Optionally, you can filter by current quarter or academic year.',
        category: 'Information',
        usage: client.settings.prefix.concat('top [`number`: min 3, max 100] [type: "quarter" | "year"]'),
        requiredPermissions: ['SEND_MESSAGES'],
      },
      definition
    );
  }

  /**
   * The workhorse of Top, this method performs error validation on the arguments, as well as
   * constructing the paginated Embed.
   *
   * In short, the steps taken are:
   * - validate the arguments to the command
   * - set defaults for arguments if not passed in
   * - Pull leaderboard from API with provided parameters as limits
   * - Split received leaderboard into chunks of 10 to make equally sized embeds
   * - Build each page, iterating through each user and setting their lines in the pages
   * - Create Embeds for each page of the leaderboard
   * - Create Pagination embed that encapsulates each other Embed as a set of pages
   *
   * @param interaction The Slash Command Interaction instance.
   */
  public async run(interaction: CommandInteraction): Promise<void> {
    await super.defer(interaction);
    // deconstruct possible arguments
    // default for size is 10
    let leaderboardSize: number | null = 10;
    if (interaction.options.getInteger('members') !== null) {
      leaderboardSize = interaction.options.getInteger('members');
    }
    if (leaderboardSize === null) {
      await super.edit(interaction, "I failed with arguments? That's weird.");
      return;
    }
    // default for type is 'all-time'
    let leaderboardType: string | null = 'All-Time';
    if (interaction.options.getString('type') !== null) {
      leaderboardType = interaction.options.getString('type');
    }
    if (leaderboardType === null) {
      await super.edit(interaction, "I failed with arguments? That's weird.");
      return;
    }

    // if size given and not between 3 and 100...
    if (leaderboardSize < 3 || leaderboardSize > 100) {
      await super.edit(interaction, 'Leaderboard size should be between 3 and 100!');
      return;
    }

    try {
      // Get the leaderboard.
      const leaderboard: User[] = await this.getLeaderboard(leaderboardSize, leaderboardType);
      // Split into arrays of 10 Users each
      const leaderboardPages: User[][] = chunk(leaderboard, 10);
      // Make a spot to save all our pages in.
      const leaderboardEmbeds: MessageEmbed[] = [];
      // Keep an index for the current member we are processing, so we know what position
      // they're in on the leaderboard.
      let leaderboardPositionIndex: number = 1;
      // For each set of 10 Users (page of the leaderboard)...
      leaderboardPages.forEach(leaderboardPage => {
        // Setup the description for the Embed of the particular page, to be used in the
        // final Paginated Embed.
        const leaderboardPageLines: string[] = [];
        // For each user in the current set of 10 Users...
        leaderboardPage.forEach(user => {
          // Setup the line for them on the page.
          // We'll treat 1st, 2nd and 3rd place as special, giving them emojis instead of
          // numbers. Every other position will be denoted by numbers.
          //
          // The string for each member's position will look something like this:
          // "69. Steven Steiner, 420 points"
          //
          // Names will also link to the profile page of said individual, which might be useful
          // when the Profile page on the portal might have more info.
          switch (leaderboardPositionIndex) {
            case 1:
              leaderboardPageLines.push(
                `:first_place: **[${`${user.firstName} ${user.lastName}`}](https://members.acmucsd.com/profile/${
                  user.uuid
                })**, ${user.points} points`
              );
              break;
            case 2:
              leaderboardPageLines.push(
                `:second_place: **[${`${user.firstName} ${user.lastName}`}](https://members.acmucsd.com/profile/${
                  user.uuid
                })**, ${user.points} points`
              );
              break;
            case 3:
              leaderboardPageLines.push(
                `:third_place: **[${`${user.firstName} ${user.lastName}`}](https://members.acmucsd.com/profile/${
                  user.uuid
                })**, ${user.points} points`
              );
              break;
            default:
              leaderboardPageLines.push(
                `${leaderboardPositionIndex}. **[${`${user.firstName} ${user.lastName}`}](https://members.acmucsd.com/profile/${
                  user.uuid
                })**, ${user.points} points`
              );
              break;
          }
          leaderboardPositionIndex += 1;
        });

        // Setup the Embed for this page of the leaderboard.
        // All of them will have the same title: the current leaderboard we're looking at.
        // Names are capitalized so it's more nice-looking, albeit making the code less readable.
        // Essentially, the .setTitle() call has a weird string just making "quarter", "year", and
        // "all-time" be their capitalized versions.
        const leaderboardPageEmbed = new MessageEmbed()
          .setTitle(`:bar_chart: ${leaderboardType} Leaderboard`)
          .setFooter('Data: Membership Portal')
          .setDescription(leaderboardPageLines.join('\n'));
        leaderboardEmbeds.push(leaderboardPageEmbed);
      });

      // Once all the pages are done, generate the Pagination Embed, and only
      // allow the command caller to modify the pages using Reactions.
      const outputPaginator = new ButtonPaginator(interaction, { pages: leaderboardEmbeds });
      await outputPaginator.send();
      return;
    } catch (e) {
      const error = e as any;
      // The only errors I've found during testing involve API calls to the Membership Portal.
      // This covers my butt in terms of errors, but I'm sure there might be different kinds
      // of errors in the future. I'll update this logging function with more clear messaging
      // if by any chance we get other kinds of errors.
      const errorUUID: UUIDv4 = newUUID();
      Logger.error(`Error whilst extracting leaderboard information: ${error.message}`, {
        eventType: 'interfaceError',
        interface: 'portalAPI',
        error,
        uuid: errorUUID,
      });
      await super.edit(
        interaction,
        `An error occurred when attempting to query the leaderboard data from the portal API. *(Error UUID: ${errorUUID})*`
      );
    }
  }

  /**
   * Calls the Membership Portal API for the users on the leaderboard.
   *
   * By default, it returns an Array of Users (see type) by descending order of points,
   * up to `limit` members. `leaderboardType` denotes what bounds to set for the leaderboard call.
   *
   * @param limit The number of top members to pull from the leaderboard.
   * @param leaderboardType The type of leaderboard. "All-Time" denotes no time bounds on the API
   * call, whereas "Quarterly" and "Yearly" dynamically find the current academic quarter and year
   * we are in and use their dates as time bounds for the API call.
   * @private
   */
  private async getLeaderboard(limit: number, leaderboardType: string): Promise<User[]> {
    // If we want the "All-Time" leaderboard, we don't need bounds, so just call the API
    // with the limit parameter.
    if (leaderboardType === 'All-Time') {
      const portalAPIResponse = (await got(`${this.client.settings.portalAPI.url}/leaderboard`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.client.apiToken}`,
        },
        searchParams: {
          limit,
        },
      }).json()) as any;

      if (portalAPIResponse.error !== null) {
        throw new Error(portalAPIResponse.error);
      }
      return portalAPIResponse.leaderboard;
    }

    // We'll dynamically extract the start and end bounds for the portal API,
    // depending on type parameter. Portal API demands bounds to be given in
    // Unix seconds, so we'll convert.
    const interval = leaderboardType === 'Quarterly' ? getCurrentQuarter() : getCurrentYear();

    // We'll error out if by any change the quarters and years dataset is incomplete.
    if (!interval) {
      throw new Error(
        'Current quarter does not exist in dataset! Please add current quarter (if existent) to dataset at https://github.com/acmucsd/ucsd-quarters-years'
      );
    }

    // We'll need to convert from epoch milliseconds to seconds. We can use Luxon,
    // but this is less bloat.
    const startBound = Math.round(interval.start.getTime() / 1000);
    const endBound = Math.round(interval.end.getTime() / 1000);

    // Query as usual.
    const portalAPIResponse = (await got(`${this.client.settings.portalAPI.url}/leaderboard`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.client.apiToken}`,
      },
      searchParams: {
        from: startBound,
        to: endBound,
        limit,
      },
    }).json()) as any;

    if (portalAPIResponse.error !== null) {
      throw new Error(portalAPIResponse.error);
    }
    return portalAPIResponse.leaderboard;
  }
}
