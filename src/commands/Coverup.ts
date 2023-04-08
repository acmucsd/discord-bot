import { SlashCommandBuilder } from '@discordjs/builders';
import { CommandInteraction, Message, MessageAttachment } from 'discord.js';
import { v4 as newUUID } from 'uuid';
import Command from '../Command';
import { BotClient } from '../types';
import Logger from '../utils/Logger';

/**
 * This command takes a given message and does its best to marks any of its
 * contents with spoiler tags. This is done by taking each message content and attachment
 * and adding spoiler tags to it.
 *
 * Text can be edited to have spoiler tags, whereas files are marked with spoilers if
 * their filename includes "SPOILER_" prepended to it.
 */
export default class Coverup extends Command {
  constructor(client: BotClient) {
    const definition = new SlashCommandBuilder()
      .setName('coverup')
      .setDescription("Marks a message with spoiler tags, including attachments. Won't work with Nitro files.");
    super(
      client,
      {
        name: 'coverup',
        enabled: true,
        description:
          'Marks the contests of a message with spoiler tags, including attachments. Send the command and reply with another message to spoiler it. The bot will be unable to send videos that a normal user cannot (i.e. large files, etc).',
        category: 'Utility',
        usage: client.settings.prefix.concat('coverup'),
        requiredPermissions: ['SEND_MESSAGES'],
      },
      definition
    );
  }

  /**
   * The workhorse of the command.
   *
   * This essentially takes the following steps:
   * - Prompt user for message
   * - Get message from channel
   * - If message empty, error out
   * - Mark contents of message with spoiler tags or attachments
   * - Error gracefully if attachments too large for us
   *
   * @param interaction The Slash Command Interaction instance.
   */
  public async run(interaction: CommandInteraction): Promise<void> {
    // Filter to only takes last message from command caller.
    const author = await this.client.users.fetch(interaction.member!.user.id);
    const authorReplyFilter = (reply: Message) => reply.author.id === interaction.user.id;
    await super.respond(interaction, {
      content: "Send a message in this channel and I'll cover it up for you!",
      ephemeral: true,
    });
    try {
      if (interaction.channel === null) {
        await super.edit(interaction, {
          content: "Wait, never mind, there' no channel I can cover this up in. Wait, what?",
          ephemeral: true,
        });
        return;
      }
      // Get the message to cover up.
      const messageListToCoverUp = await interaction.channel.awaitMessages({
        max: 1,
        filter: authorReplyFilter,
        time: 30000,
        errors: ['time'],
      });

      // TypeScript boilerplate to pull out actual message to add spoiler tags to.
      const messageToCoverUp = messageListToCoverUp.first();
      if (!messageToCoverUp) {
        await super.edit(interaction, {
          content: 'For some reason, your replied message got lost on the way here. Try again O_O',
          ephemeral: true,
        });
        return;
      }

      if (messageToCoverUp.content === '' && messageToCoverUp.attachments.size === 0) {
        await super.edit(interaction, {
          content: "I can't cover up an empty message!",
          ephemeral: true,
        });
        return;
      }

      // If we have attachments...
      if (messageToCoverUp.attachments.size > 0) {
        // Go through each attachment and prepend "SPOILER_" to the name, so it's
        // marked as a spoiler.
        const spoileredAttachments = messageToCoverUp.attachments.map(
          attachment => new MessageAttachment(attachment.url, `SPOILER_${attachment.name}`)
        );
        // Send it.
        const captionContents =
          messageToCoverUp.content === '' ? '' : `|| ${messageToCoverUp.content.replace('|', '\\"')} ||`;
        await messageToCoverUp.channel.send({
          content: `**Covered up by ${author}**\n${captionContents}`,
          files: spoileredAttachments,
        });
        // Delete the intermediary messages. These need to be deleted after because we need access
        // to the attachments before they get deleted by the Discord cache.
        await messageToCoverUp.delete();
        await super.edit(interaction, {
          content: 'You got it! Covered up.',
          ephemeral: true,
        });
      } else {
        // If there's no attachments, send just the message contents with spoiler tags.
        await messageToCoverUp.channel.send(`**Covered up by ${author}**\n||${messageToCoverUp.content}||`);
        await messageToCoverUp.delete();
        await super.edit(interaction, {
          content: 'You got it! Covered up.',
          ephemeral: true,
        });
      }
    } catch (e) {
      const error = e as any;
      // We might error out if the sent attachments are too big. Since Discord
      // bots don't have Nitro, we'll have to gracefully handle it.
      if (error.message === 'Request entity too large') {
        if (interaction.channel === null) {
          await super.edit(interaction, {
            content:
              "Wait, so I got an error, and yet I'm in an non-existent channel? I'm confused, blame my maintainer.",
            ephemeral: true,
          });
          return;
        }
        // Delete the stuff we did in the middle.
        const messages = await interaction.channel.messages.fetch({ limit: 2 });
        const lastMessage = messages.last();
        if (lastMessage === undefined) {
          await super.edit(interaction, {
            content:
              "Wait, so I got an error, and yet there's no messages for me to delete? I'm confused, blame my maintainer.",
            ephemeral: true,
          });
          return;
        }
        await lastMessage.delete();

        // Log this event.
        const errorUUID = newUUID();
        Logger.warn('Attachments for cover up call too large!', {
          eventType: 'commandError',
          interface: 'coverup',
          error,
          uuid: errorUUID,
        });
        await super.edit(interaction, {
          content: "Your attachments are too powerful! I'm not a Nitro user :(",
          ephemeral: true,
        });
      } else {
        // There might be others errors, so we add checks for those too.
        const errorUUID = newUUID();
        Logger.error(`Error whilst covering up message: ${error}`, {
          eventType: 'commandError',
          interface: 'coverup',
          error,
          uuid: errorUUID,
        });
        await super.edit(interaction, {
          content: `An error occurred while covering up your message. *(Error UUID: ${errorUUID})*`,
          ephemeral: true,
        });
      }
    }
  }
}
