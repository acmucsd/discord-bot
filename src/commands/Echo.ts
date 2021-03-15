import { Message } from 'discord.js';
import Command from '../Command';
import { BotClient } from '../types';

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
    const messageText = args.join(' ');
    await message.delete();
    await super.respond(message.channel, messageText);
  }
}
