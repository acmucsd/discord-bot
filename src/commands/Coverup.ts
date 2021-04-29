import { Message, MessageAttachment } from 'discord.js';
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
    super(client, {
      name: 'coverup',
      enabled: true,
      description: 'Marks the contests of a message with spoiler tags, including attachments. Send the command and reply with another message to spoiler it. The bot will be unable to send videos that a normal user cannot (i.e. large files, etc).',
      category: 'Utility',
      usage: client.settings.prefix.concat('coverup'),
      requiredPermissions: ['SEND_MESSAGES'],
    });
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
   * @param message Received Message.
   */
  public async run(message: Message): Promise<void> {
    // Filter to only takes last message from command caller.
    const authorReplyFilter = (reply: Message) => reply.author.id === message.author.id;
    const initialReply = await message.channel.send('Waiting on a message to cover up...');
    try {
      // Get the message to cover up.
      const messageListToCoverUp = await message.channel.awaitMessages(authorReplyFilter, {
        max: 1,
        time: 30000,
        errors: ['time'],
      });

      // TypeScript boilerplate to pull out actual message to add spoiler tags to.
      const messageToCoverUp = messageListToCoverUp.first();
      if (!messageToCoverUp) {
        await super.respond(message.channel, 'For some reason, your replied message got lost on the way here. Try again O_O');
        return;
      }

      if (messageToCoverUp.content === '' && messageToCoverUp.attachments.size === 0) {
        await super.respond(message.channel, "I can't cover up an empty message!");
        return;
      }

      // If we have attachments...
      if (messageToCoverUp.attachments.size > 0) {
        // Go through each attachment and prepend "SPOILER_" to the name, so it's
        // marked as a spoiler.
        const spoileredAttachments = messageToCoverUp.attachments.map(
          (attachment) => new MessageAttachment(attachment.url, `SPOILER_${attachment.name}`),
        );
        // Send it.
        const captionContents = messageToCoverUp.content === '' ? '' : `|| ${messageToCoverUp.content.replace('|', '\\"')} ||`;
        await messageToCoverUp.channel.send(`**Covered up by ${message.author}**\n${captionContents}`, spoileredAttachments);
        // Delete the intermediary messages. These need to be deleted after because we need access
        // to the attachments before they get deleted by the Discord cache.
        await messageToCoverUp.delete();
        await initialReply.delete();
      } else {
        // If there's no attachments, send just the message contents with spoiler tags.
        await messageToCoverUp.channel.send(`**Covered up by ${message.author}**\n||${messageToCoverUp.content}||`);
        await messageToCoverUp.delete();
        await initialReply.delete();
      }
    } catch (e) {
      // We might error out if the sent attachments are too big. Since Discord
      // bots don't have Nitro, we'll have to gracefully handle it.
      if (e.message === 'Request entity too large') {
        // Delete the stuff we did in the middle.
        await initialReply.delete();
        await message.author.lastMessage?.delete();

        // Log this event.
        const errorUUID = newUUID();
        Logger.warn('Attachments for cover up call too large!', {
          eventType: 'commandError',
          interface: 'coverup',
          error: e,
          uuid: errorUUID,
        });
        await super.respond(message.channel, 'Your attachments are too powerful! I\'m not a Nitro user :(');
      } else {
        // There might be others errors, so we add checks for those too.
        const errorUUID = newUUID();
        Logger.error(`Error whilst covering up message: ${e}`, {
          eventType: 'commandError',
          interface: 'coverup',
          error: e,
          uuid: errorUUID,
        });
        await super.respond(message.channel, `An error occurred while covering up your message. *(Error UUID: ${errorUUID})*`);
      }
    }
  }
}
