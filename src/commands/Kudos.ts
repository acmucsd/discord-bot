import { SlashCommandBuilder } from '@discordjs/builders';
import { CommandInteraction } from 'discord.js';
import { v4 as newUUID } from 'uuid';
import Command from '../Command';
import { BotClient } from '../types';
import Logger from '../utils/Logger';

/**
 * Allows for a user to send a Kudos to someone.
 *
 * "kudos". noun. praise and honor received for an achievement.
 *
 * This command is really just a roundabout way of sending a message for someone,
 * but ideally it standardizes the concept of thanking people for their help and makes it
 * a more unique thing to do.
 *
 * This command is not anonymously sent, rather, it should be like Echo, where
 * the reply to the interaction is ephemeral but the message itself is sent by
 * BreadBot, along with the user's mention.
 */
export default class Kudos extends Command {
  constructor(client: BotClient) {
    const definition = new SlashCommandBuilder()
      .setName('kudos')
      .addUserOption((option) => option.setName('to').setDescription('The user to send a note to.').setRequired(true))
      .addStringOption((option) => option.setName('for').setDescription('What the note should say.').setRequired(true))
      .setDescription('Sends a thank-you note to someone for you.');
    super(client, {
      name: 'kudos',
      enabled: true,
      description: 'Sends a thank-you note to someone for you.',
      category: 'Utility',
      usage: client.settings.prefix.concat('kudos <user> <message>'),
      requiredPermissions: ['SEND_MESSAGES'],
    }, definition);
  }

  public async run(interaction: CommandInteraction): Promise<void> {
    // Get all the tokens and join them into a message.
    const messageText = interaction.options.getString('for', true);
    // Get the user we're looking to send the note to. We need this to mention them.
    const mention = interaction.options.getUser('to', true);

    // This normally won't happen, but we'll anticipate the scenario a channel doesn't exist
    // and account for it in error logs.
    //
    // This is probably ONLY going to happen if a channel gets deleted mid-interaction processing,
    // which is likely never going to happen.
    if (interaction.channel === null) {
      const uuid = newUUID();
      Logger.error('Channel is null', {
        eventType: 'commandError',
        command: 'kudos',
        uuid,
      });
      await super.respond(interaction, {
        content: `An error was encountered when finding the channel you sent this message in. I know, it's weird. *(Error UUID: ${uuid})`,
        ephemeral: true,
      });
      return;
    }

    // If the person is sending a Kudos to themselves, we should kinda tell them not to do that.
    // Seems self-centered.
    if (mention.id === interaction.member?.user.id) {
      await super.respond(interaction, {
        content: 'Sending a Kudos to yourself? I don\'t know, that seems counter-intuitive.',
        ephemeral: true,
      });
      return;
    }

    // Send a reply acknowledging the command.
    await super.respond(interaction, {
      content: 'Nice! Thanks for being wholesome :3',
      ephemeral: true,
    });

    // Create the text to send back and send it.
    const kudosText = `${mention}! Kudos to you from ${interaction.member} for:\n\n_"${messageText}"_`;
    await interaction.channel.send(kudosText);
  }
}
