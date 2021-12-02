import { SlashCommandBuilder } from '@discordjs/builders';
import { CommandInteraction } from 'discord.js';
import Command from '../Command';
import { BotClient } from '../types';

/**
 * Hands member ability
 */
export default class Report extends Command {
  constructor(client: BotClient) {
    const definition = new SlashCommandBuilder()
      .setName('report')
      .setDescription("Report an incident anonymously to ACM's board.");
    super(client, {
      name: 'report',
      boardRequired: true,
      enabled: true,
      description: "Report an incident anonymously to ACM's board.",
      category: 'Moderation',
      usage: client.settings.prefix.concat('report'),
      requiredPermissions: ['SEND_MESSAGES'],
    }, definition);
  }

  public async run(interaction: CommandInteraction): Promise<void> {
    await super.respond(interaction, {
      content: 'If you want to report an incident, please use our anonymous Google form: https://acmurl.com/report',
      ephemeral: true,
    });
  }
}
