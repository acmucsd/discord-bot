import { SlashCommandBuilder } from '@discordjs/builders';
import { CommandInteraction } from 'discord.js';
import { DateTime, Interval } from 'luxon';
import Command from '../Command';
import { BotClient } from '../types';

/**
 * Command to check whether it is currently League Time.
 *
 * League Time is defined as "between 10 PM and 6 AM", unless it is summer, in which case,
 * it's always League Time.
 */
export default class IsLeagueTime extends Command {
  constructor(client: BotClient) {
    const definition = new SlashCommandBuilder()
      .setName('isleaguetime')
      .setDescription('Checks whether League Time is currently active. League Time is defined as 10 PM - 6 AM.');
    super(
      client,
      {
        name: 'isleaguetime',
        enabled: true,
        description: 'Checks whether League Time is currently active. League Time is defined as 10 PM - 6 AM.',
        category: 'Information',
        usage: client.settings.prefix.concat('isleaguetime'),
        requiredPermissions: ['SEND_MESSAGES'],
      },
      definition
    );
  }

  public async run(interaction: CommandInteraction): Promise<void> {
    // Checking for League Time is hard.
    // We'll use Luxon, since it will make time-checking much more readable and
    // less based on fancy string literal parsing thanks to ECMAScript's
    // terrible Date object. I'll explain what each call does here.
    //
    // First, we'll check whether it is summer. Summer is defined as
    // June 20 - September 20, so we check for that by seeing whether
    // DateTime.now() is between June 20 CURRENT_YEAR and
    // September 20 CURRENT_YEAR.
    const isSummer = Interval.fromDateTimes(
      DateTime.fromObject({ day: 20, month: 6, zone: 'America/Los_Angeles' }),
      DateTime.fromObject({ day: 20, month: 9, zone: 'America/Los_Angeles' })
    ).contains(DateTime.now());

    // Next, we'll check whether the current time is between 10 PM today and 6 AM tomorrow,
    // which is the official definition for League Time.
    //
    // We also check if the current time is between 10 PM yesterday and 6 AM today,
    // since after midnight the previous check doesn't work.
    const isLeagueTime =
      Interval.fromDateTimes(
        DateTime.fromFormat('10:00 PM', 't', { zone: 'America/Los_Angeles' }),
        DateTime.fromFormat('6:00 AM', 't', { zone: 'America/Los_Angeles' }).plus({ days: 1 })
      ).contains(DateTime.now()) ||
      Interval.fromDateTimes(
        DateTime.fromFormat('10:00 PM', 't', { zone: 'America/Los_Angeles' }).minus({ days: 1 }),
        DateTime.fromFormat('6:00 AM', 't', { zone: 'America/Los_Angeles' })
      ).contains(DateTime.now());

    // Return the logic for League Time.
    if (isSummer) {
      await super.respond(interaction, 'True.');
    } else {
      await super.respond(interaction, isLeagueTime ? 'True.' : 'False.');
    }
  }
}
