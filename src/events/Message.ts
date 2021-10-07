/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { Message as DiscordMessage } from 'discord.js';
import Logger from '../utils/Logger';
import { BotEvent, BotClient } from '../types';

/**
 * Message Event triggers upon any message sent on a Discord guild.
 *
 * Our Message event checks for mentions.
 * Whenever a mention is made towards our bot, we may have special behavior.
 *
 * This event also used to parse commands, this has been moved to the InteractionCreate Event.
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
    }
  }
}
