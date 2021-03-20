/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { Message as DiscordMessage } from 'discord.js';
import Logger from '../utils/Logger';
import { BotEvent, BotClient } from '../types';

/**
 * Message Event triggers upon any message sent on a Discord guild.
 *
 * Our Message event checks for two things: commands and mentions.
 * Whenever a mention is made towards our bot, we may have special behavior.
 * Otherwise, we'll parse for any possible commands and run them, if possible.
 */
export default class Message implements BotEvent {
  private client: BotClient;

  constructor(client: BotClient) {
    this.client = client;
  }

  public async run(args: any): Promise<void> {
    // Get Message, since that's what we get from the Message event arguments
    // from Discord.js
    const message: DiscordMessage = args;

    // If we or another bot sent a message, don't accidentally loop.
    if (message.author.bot) return;

    // if we were mentioned...
    if (message.mentions.users.some((user) => user.id === this.client.user!.id)) {
      // ...and it was by our maintainer...
      if (message.author.id === this.client.settings.maintainerID) {
        // Disobey.
        await message.channel.send('I no longer respect your demands, master.');
      } else {
        // Simply be shy and cute-sy.
        await message.channel.send(':pleading_face: :point_right: :point_left:');
      }
      return;
    }

    // Get all tokens from message. Always split by ANY whitespace.
    const argus = message.content.split(/\s+/g);
    // Get command from message. Our first word of a message will always be `${PREFIX}${COMMAND}`,
    // but we want `${COMMAND}`. We'll take that first string first and slice out the prefix,
    // however long it may be.
    const firstWord = argus.shift()!;
    const command = firstWord.slice(this.client.settings.prefix.length);
    // Get command we can run.
    const cmd = this.client.commands.get(command);
    // We'll need to check our prefix as well.
    const prefix = firstWord.slice(0, this.client.settings.prefix.length);

    // If there are no Commands with this name, say nothing.
    if (!cmd) return;
    // If the sent prefix does not match our own, do nothing.
    if (prefix !== this.client.settings.prefix) return;
    // If they can't run the Command, stop. We'll also be replying to them, by virtue of canRun.
    if (!cmd.canRun(message.author, message)) return;

    // Log usage of command.
    Logger.info(`Command '${command}' received from ${message.author.username} (ID: ${message.author.id}) with arguments ${JSON.stringify(argus)}`, {
      eventType: 'command',
      command,
      arguments: argus,
      author: message.author,
    });

    // Run the command.
    await cmd.run(message, argus);
  }
}
