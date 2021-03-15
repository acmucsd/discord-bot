
import { Message } from 'discord.js';
import Command from '../Command';
import { BotClient } from '../types';

/**
 * Example Command.
 */
export default class ExampleCommand extends Command {
  constructor(client: BotClient) {
    super(client, {
      name: 'example',
      enabled: true,
      description: 'Does something.',
      category: 'Uncategorized',
      usage: client.settings.prefix.concat('example'),
      requiredPermissions: ['SEND_MESSAGES'],
    });
  }

  public async run(message: Message): Promise<void> {
      await super.respond(message.channel, 'Whoop!');
  }
}
