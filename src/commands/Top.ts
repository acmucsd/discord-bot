import { Message, MessageEmbed } from 'discord.js';
import got from 'got';
import { DateTime } from 'luxon';
import { chunk } from 'lodash';
import { decode } from 'jsonwebtoken';
import { Embeds } from 'discord-paginationembed';
import { v4 as newUUID } from 'uuid';
import Command from '../Command';
import { BotClient, User, UUIDv4 } from '../types';
import {
  getCurrentQuarter, getCurrentYear, getQuarterBounds, getYearBounds,
} from '../utils/quarterCalculator';
import { validNumber } from '../utils/validType';
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
   * The API token for the admin account from the Membership Portal.
   * @private
   */
  private apiToken: string;

  /**
   * The default constructor. Primarily logs in to the portal when initialized and saves
   * the provided JWT into our variable.
   *
   * @param client The Client we are initializing this Command for.
   */
  constructor(client: BotClient) {
    super(client, {
      name: 'top',
      enabled: true,
      description: 'Shows the top `number` members on the Membership Portal leaderboard. By default, show the top 10 on the all-time leaderboard. Optionally, you can filter by current quarter or academic year.',
      category: 'Information',
      usage: client.settings.prefix.concat('top [`number`: min 3, max 100] [type: "quarter" | "year"]'),
      requiredPermissions: ['SEND_MESSAGES'],
    });
    this.apiToken = '';
    this.loginPortal().then();
  }

  /**
   * The workhorse of Top, this command performs error validation on the arguments, as well as
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
   * @param message
   * @param args
   */
  public async run(message: Message, args: string[]): Promise<void> {
    // deconstruct possible arguments
    const [size, type] = args;
    // if size given and not a valid number...
    if (size !== undefined && !validNumber(size)) {
      await super.respond(message.channel, "You didn't pass a valid number as the first argument!");
      return;
    }
    // if size given and not between 3 and 100...
    if (size !== undefined
        && (parseInt(size, 10) <= 2
        || parseInt(size, 10) > 100)) {
      await super.respond(message.channel, 'Maximum leaderboard size should be between 3 and 100!');
      return;
    }
    // if type of leaderboard given and not 'quarter' or 'year'...
    if (type !== undefined && !(type === 'quarter' || type === 'year')) {
      await super.respond(message.channel, 'Optional argument for leaderboard type must be `quarter` or `year`!');
      return;
    }

    // Final size of leaderboard, with default of 10 if no argument given.
    const leaderboardSize = size === undefined ? 10 : parseInt(size, 10);
    // Final type of leaderboard, with default of 'all-time' if no argument given.
    const leaderboardType: 'quarter' | 'year' | 'all-time' = type === undefined ? 'all-time' : type;

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
      leaderboardPages.forEach((leaderboardPage) => {
        // Setup the description for the Embed of the particular page, to be used in the
        // final Paginated Embed.
        const leaderboardPageLines: string[] = [];
        // For each user in the current set of 10 Users...
        leaderboardPage.forEach((user) => {
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
              leaderboardPageLines.push(`:first_place: **[${`${user.firstName} ${user.lastName}`}](https://members.acmucsd.com/profile/${user.uuid})**, ${user.points} points`);
              break;
            case 2:
              leaderboardPageLines.push(`:second_place: **[${`${user.firstName} ${user.lastName}`}](https://members.acmucsd.com/profile/${user.uuid})**, ${user.points} points`);
              break;
            case 3:
              leaderboardPageLines.push(`:third_place: **[${`${user.firstName} ${user.lastName}`}](https://members.acmucsd.com/profile/${user.uuid})**, ${user.points} points`);
              break;
            default:
              leaderboardPageLines.push(`${leaderboardPositionIndex}. **[${`${user.firstName} ${user.lastName}`}](https://members.acmucsd.com/profile/${user.uuid})**, ${user.points} points`);
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
          .setTitle(`:bar_chart: ${leaderboardType === 'all-time' ? 'All-Time' : leaderboardType.charAt(0).toUpperCase() + leaderboardType.slice(1)} Leaderboard`)
          .setFooter('Data: Membership Portal')
          .setDescription(leaderboardPageLines.join('\n'));
        leaderboardEmbeds.push(leaderboardPageEmbed);
      });

      // Once all the pages are done, generate the Pagination Embed, and only
      // allow the command caller to modify the pages using Reactions.
      const outputEmbed = new Embeds()
        .setArray(leaderboardEmbeds)
        .setAuthorizedUsers([message.author.id])
        // temporary "as any" cast until Discord Pagination Embed updates its NPM version to include
        // NewsChannel as a type in the parameter. Old package versioning FTW.
        .setChannel(message.channel as any)
        .setPageIndicator(false)
        .setPage(1);

      await outputEmbed.build();
      return;
    } catch (e) {
      // The only errors I've found during testing involve API calls to the Membership Portal.
      // This covers my butt in terms of errors, but I'm sure there might be different kinds
      // of errors in the future. I'll update this logging function with more clear messaging
      // if by any chance we get other kinds of errors.
      const errorUUID: UUIDv4 = newUUID();
      Logger.error(`Error whilst extracting leaderboard information: ${e.message}`, {
        eventType: 'interfaceError',
        interface: 'portalAPI',
        error: e,
        uuid: errorUUID,
      });
      await super.respond(message.channel, `An error occurred when attempting to query the leaderboard data from the portal API. *(Error UUID: ${errorUUID})*`);
    }
  }

  /**
   * Calls the Membership Portal API for the users on the leaderboard.
   *
   * By default, it returns an Array of Users (see type) by descending order of points,
   * up to `limit` members. `leaderboardType` denotes what bounds to set for the leaderboard call.
   *
   * @param limit The number of top members to pull from the leaderboard.
   * @param leaderboardType The type of leaderboard. "All-time" denotes no time bounds on the API
   * call, whereas "quarter" and "all-time" dynamically find the current academic quarter and year
   * we are in and use their dates as time bounds for the API call.
   * @private
   */
  private async getLeaderboard(limit: number, leaderboardType: 'quarter' | 'year' | 'all-time'): Promise<User[]> {
    // check if token still valid. It might require updating, so we'll login again if it does.
    const tokenValid = await this.tokenValid();
    if (!tokenValid) {
      await this.loginPortal();
    }

    // If we want the "all-time" leaderboard, we don't need bounds, so just call the API
    // with the limit parameter.
    if (leaderboardType === 'all-time') {
      const portalAPIResponse = await got('https://api.acmucsd.com/api/v2/leaderboard', {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiToken}`,
        },
        searchParams: {
          limit,
        },
      }).json() as any;

      if (portalAPIResponse.error !== null) {
        throw new Error(portalAPIResponse.error);
      }
      return portalAPIResponse.leaderboard;
    }

    // We'll dynamically extract the start and end bounds for the portal API,
    // depending on type parameter. Portal API demands bounds to be given in
    // Unix seconds, so we'll convert.
    const [startTime, endTime] = leaderboardType === 'quarter'
      ? getQuarterBounds(getCurrentQuarter())
      : getYearBounds(getCurrentYear());
    const startBound = startTime.toSeconds();
    const endBound = endTime.toSeconds();

    // Query as usual.
    const portalAPIResponse = await got('https://api.acmucsd.com/api/v2/leaderboard', {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiToken}`,
      },
      searchParams: {
        from: startBound,
        to: endBound,
        limit,
      },
    }).json() as any;

    if (portalAPIResponse.error !== null) {
      throw new Error(portalAPIResponse.error);
    }
    return portalAPIResponse.leaderboard;
  }

  /**
   * Logs in to the portal, saving the provided JWT token into the class variable.
   * @private
   */
  private async loginPortal(): Promise<void> {
    const portalAPIResponse = await got.post('https://api.acmucsd.com/api/v2/auth/login', {
      headers: {
        'Content-Type': 'application/json',
      },
      json: {
        email: this.client.settings.portalAPI.username,
        password: this.client.settings.portalAPI.password,
      },
    }).json() as any;

    if (portalAPIResponse.error !== null) {
      throw new Error(portalAPIResponse.error);
    }
    this.apiToken = portalAPIResponse.token;
  }

  /**
   * Checks whether the currently saved JWT token is still valid. Checked by ensuring
   * expiry time is further in the future than our current time. No checks for issuing
   * time currently, as we're only getting token directly from the portal API.
   * @private
   */
  private async tokenValid(): Promise<boolean> {
    const payload = decode(this.apiToken);
    if (payload === null) {
      throw new Error('JWT payload for portal API empty!');
    } else if (typeof payload === 'string' || !payload.exp) {
      throw new Error('JWT payload for portal API does not contain expiry date!');
    }
    const expiryEpochSeconds: number = payload.exp;
    const expiryDate = DateTime.fromSeconds(expiryEpochSeconds);
    const currentTime = DateTime.now();
    return expiryDate > currentTime;
  }
}
