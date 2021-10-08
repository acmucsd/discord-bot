import { SlashCommandBuilder } from '@discordjs/builders';
import { CommandInteraction, Message } from 'discord.js';
import Command from '../Command';
import { BotClient } from '../types';

/**
 * Example Command.
 */
export default class ExampleCommand extends Command {
  constructor(client: BotClient) {
    const definition = new SlashCommandBuilder()
      .setName('example')
      .setDescription('Does something.');
    super(client, {
      name: 'example',
      enabled: true,
      description: 'Does something.',
      category: 'Uncategorized',
      usage: client.settings.prefix.concat('example'),
      requiredPermissions: ['SEND_MESSAGES'],
    }, definition);
  }

  public async run(interaction: CommandInteraction): Promise<void> {
    await super.respond(interaction, 'Whoop!');
  }
}
