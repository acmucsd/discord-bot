import { SlashCommandBuilder } from '@discordjs/builders';
import { CommandInteraction } from 'discord.js';
import { v4 as newUUID } from 'uuid';
import Command from '../Command';
import { BotClient } from '../types';
import Logger from '../utils/Logger';

/**
 * Repeat what the author under the guise of BreadBot.
 *
 * While anonymous on the Discord side, this command is logged by BreadBot, so any weird or
 * offensive messages can be deleted and their anonymous member penalized, if necessary.
 */
export default class Echo extends Command {
  constructor(client: BotClient) {
    const definition = new SlashCommandBuilder()
      .setName('echo')
      .addStringOption(option => option.setName('message').setDescription('The message to repeat.').setRequired(true))
      .setDescription('Repeats your message exactly.');
    super(
      client,
      {
        name: 'echo',
        boardRequired: true,
        enabled: true,
        description: 'Repeats your message exactly.',
        category: 'Utility',
        usage: client.settings.prefix.concat('echo').concat('<message>'),
        requiredPermissions: ['SEND_MESSAGES'],
      },
      definition
    );
  }

  public async run(interaction: CommandInteraction): Promise<void> {
    // Get all the tokens and join them into a message.
    const messageText = interaction.options.getString('message', true);
    // Send a reply acknowledging the command.
    await super.respond(interaction, {
      content: 'I gotchu.',
      ephemeral: true,
    });

    // This normally won't happen, but we'll anticipate the scenario a channel doesn't exist
    // and account for it in error logs.
    //
    // This is probably ONLY going to happen if a channel gets deleted mid-interaction processing,
    // which is likely never going to happen.
    if (interaction.channel === null) {
      const uuid = newUUID();
      Logger.error('Channel is null', {
        eventType: 'commandError',
        command: 'echo',
        uuid,
      });
      await super.respond(interaction, {
        content: `An error was encountered when finding the channel you sent this message in. I know, it's weird. *(Error UUID: ${uuid})`,
        ephemeral: true,
      });
      return;
    }

    // Send the original message back.
    await interaction.channel.send(messageText);
  }
}
