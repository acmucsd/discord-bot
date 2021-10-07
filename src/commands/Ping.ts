import { SlashCommandBuilder } from '@discordjs/builders';
import { CommandInteraction } from 'discord.js';
import Command from '../Command';
import { BotClient } from '../types';

/**
 * Pings the user.
 *
 * Test Command left from the boilerplate.
 */
export default class Ping extends Command {
  constructor(client: BotClient) {
    const definition = new SlashCommandBuilder()
      .setName('ping')
      .setDescription('Pings the bot.');

    super(client, {
      name: 'ping',
      enabled: true,
      description: 'Pings the bot.',
      category: 'Information',
      usage: client.settings.prefix.concat('ping'),
      requiredPermissions: ['SEND_MESSAGES'],
    }, definition);
  }

  // Commenting out `this` issue since this method does not need to use the class,
  // but it needs a 'run' method attached to it.
  // eslint-disable-next-line class-methods-use-this
  public async run(interaction: CommandInteraction): Promise<void> {
    await interaction.reply('Pong!');
  }
}
