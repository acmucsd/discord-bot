import { Message } from 'discord.js';
import Command from '../Command';
import { BotClient } from '../types';

/**
 * Repeat what the author under the guise of BreadBot.
 *
 * While anonymous on the Discord side, this command is logged by BreadBot, so any weird or
 * offensive messages can be deleted and their anonymous member penalized, if necessary.
 */
export default class Echo extends Command {
  constructor(client: BotClient) {
    super(client, {
      name: 'echo',
      boardRequired: true,
      enabled: true,
      description: 'Repeats your message exactly.',
      category: 'Utility',
      usage: client.settings.prefix.concat('echo').concat('<message>'),
      requiredPermissions: ['SEND_MESSAGES'],
    });
  }

  public async run(message: Message, args: string[]): Promise<void> {
    // Get all the tokens and join them into a message.
    const messageText = args.join(' ');
    // Delete the original message.
    await message.delete();
    // Send the original message back.
    await super.respond(message.channel, messageText);
  }
}
