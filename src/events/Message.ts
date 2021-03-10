/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { Message as DiscordMessage } from 'discord.js';
import Logger from '../utils/Logger';
import { BotEvent, BotClient } from '../types';

export default class Message implements BotEvent {
  private client: BotClient;

  constructor(client: BotClient) {
    this.client = client;
  }

  public async run(args: any): Promise<void> {
    const message: DiscordMessage = args;

    if (message.author.bot) return;

    if (message.mentions.users.some((user) => user.id === this.client.user!.id)) {
      if (message.author.id === this.client.settings.maintainerID) {
        await message.channel.send('I no longer respect your demands, master.');
      } else {
        await message.channel.send(':pleading_face: :point_right: :point_left:');
      }
      return;
    }

    const argus = message.content.split(/\s+/g);
    const command = argus.shift()!.slice(this.client.settings.prefix.length);
    const cmd = this.client.commands.get(command);

    if (!cmd) return;
    if (!cmd.canRun(message.author, message)) return;

    Logger.info(`Command '${command}' received from ${message.author.username} (ID: ${message.author.id}) with arguments ${JSON.stringify(argus)}`, {
      eventType: 'command',
      command,
      arguments: argus,
      author: message.author,
    });

    await cmd.run(message, argus);
  }
}
