import { Message, MessageEmbed } from 'discord.js';
import got from 'got';
import { DateTime, Interval } from 'luxon';
import { v4 as newUUID } from 'uuid';
import { BotClient, PortalEvent, UUIDv4 } from '../types';
import Command from '../Command';
import Logger from '../utils/Logger';

/**
 * This Command DM's the caller the checkin code and Express Checkin link for any events
 * in today's timeframe. Optional argument `now` makes the embed with the checkin codes
 * be returned in the same chat as the Command message, but only for currently running events.
 */
export default class Checkin extends Command {
  constructor(client: BotClient) {
    super(client, {
      name: 'checkin',
      boardRequired: true,
      enabled: true,
      description: 'Sends a private message with all check-in codes from today\'s events. Calling with `now` argument sends public embed of checkin code if any events are now live!',
      category: 'Utility',
      usage: client.settings.prefix.concat('checkin [now]'),
      requiredPermissions: ['SEND_MESSAGES'],
    });
  }

  /**
   * The workhorse of Top, this method performs error validation on the arguments, as well as
   * constructing the Embed.
   *
   * In short, the steps taken are:
   * - Get all the arguments
   * - Validate some of the arguments
   * - Get all future events
   * - Filter out only the events we want
   * - Build out the descriptions for the Embeds
   * - Build the Embeds
   * - Send them out!
   *
   * @param message The Message with the command call.
   * @param args The Command arguments.
   */
  public async run(message: Message, args: string[]): Promise<void> {
    const [isPublic] = args;
    if (isPublic && isPublic !== 'now') {
      // If we got any other argument other than `now`...
      await super.respond(message.channel, `I only allow public checkin codes for live events. Try \`${this.client.settings.prefix.concat('checkin now')}\`.`);
    }
    // Get all future events marked in the portal API.
    try {
      const futureEvents = await this.getFutureEvents();

      // Oh, boy, here come more dates and times to check.
      // Luxon makes it much nicer, however.
      //
      // We need two sets of arrays for "checkin":
      // - all events that have a start time within today's timeframe
      // - all events that are live RIGHT NOW
      //
      // The first set is useful for us to prepare a checkin code beforehand, while the second set
      // enables the functionality for `checkin now`. We'll start with the first set.
      const todayEvents = futureEvents.filter((event) => {
        // get today's midnight
        const midnightToday = DateTime.now().set({
          hour: 0, minute: 0, second: 0, millisecond: 0,
        });

        // get tomorrow's midnight
        const midnightTomorrow = DateTime.now().set({
          hour: 0, minute: 0, second: 0, millisecond: 0,
        }).plus({ day: 1 });

        // check if start time in between
        return Interval.fromDateTimes(midnightToday, midnightTomorrow).contains(event.start);
      });

      // Check if current time in between event
      const liveEvents = futureEvents.filter(
        (event) => Interval.fromDateTimes(event.start, event.end).contains(DateTime.now()),
      );

      // We'll make sure to check if the required set of events by
      // command arugments is empty; if it is, just return "No events today!"
      if (!isPublic && todayEvents.length === 0) {
        await super.respond(message.channel, 'No events today!');
        return;
      }
      if (isPublic === 'now' && liveEvents.length === 0) {
        await super.respond(message.channel, 'No events right now!');
        return;
      }

      // What we need now is to construct the Embed to send for `checkin` with no arguments,
      // as well as the Embed for when we have `checkin now`.
      //
      // First one is just today's events.
      const privateEmbedDescription = Checkin.generateCheckinCodeDescription(todayEvents);

      // Next up we're doing live events. Same description, just with different events.
      const publicEmbedDescription = Checkin.generateCheckinCodeDescription(liveEvents);

      // The private DM Embed will have a simpler title.
      const privateEmbed = new MessageEmbed()
        .setTitle(':calendar_spiral: Today\'s Events')
        .setDescription(privateEmbedDescription)
        .setColor('0x3498DB');

      // Public Embed will be slightly more of a motivator, with a different title.
      const publicEmbed = new MessageEmbed()
        .setTitle(':calendar_spiral: Don\'t forget to check in!')
        .setDescription(publicEmbedDescription)
        .setColor('0x3498DB');

      // Now we finally check the command argument.
      // If we just had `checkin` in our call, no arguments...
      if (!isPublic) {
        await message.author.send(privateEmbed);
      } else {
        await super.respond(message.channel, publicEmbed);
      }
    } catch (e) {
      // Similarly to Top, only errors I could find here involve the API,
      // so if anything pops up, log the API errors.
      const errorUUID: UUIDv4 = newUUID();
      Logger.error(`Error whilst fetching future events: ${e.message}`, {
        eventType: 'interfaceError',
        interface: 'portalAPI',
        error: e,
        uuid: errorUUID,
      });
      await super.respond(message.channel, `An error occurred when attempting to query the leaderboard data from the portal API. *(Error UUID: ${errorUUID})*`);
    }
  }

  /**
   * Get all future events from the Membership Portal API.
   * "Future event" is defined as any event with the end date in the future.
   *
   * @private
   */
  private async getFutureEvents(): Promise<PortalEvent[]> {
    const portalAPIResponse = await got('https://api.acmucsd.com/api/v2/event/future', {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.client.apiToken}`,
      },
    }).json() as any;

    return portalAPIResponse.events.map((event: any) => (
      {
        ...event,
        start: DateTime.fromISO(event.start),
        end: DateTime.fromISO(event.end),
      }));
  }

  /**
   * Generate the description for a Checkin Code Embed with the provided list of PortalEvents.
   *
   * All of the events are listed in the following format:
   * - italicized event title with link to Express Checkin link
   * - Line containing checkin code
   *
   * @param events The events to generate a Checkin Code Embed description for.
   * @private
   */
  private static generateCheckinCodeDescription(events: PortalEvent[]): string {
    const description: string[] = [];
    events.forEach((event) => {
      const expressCheckinURL = new URL('https://members.acmucsd.com/checkin');
      expressCheckinURL.searchParams.set('code', event.attendanceCode);
      description.push(`*[${event.title}](${expressCheckinURL})*`);
      description.push(`**Checkin Code: \`${event.attendanceCode}\`**`);
      description.push('\n');
    });
    description.pop();
    return description.join('\n');
  }
}
