import { User, Message } from 'discord.js';
import {
  AnyChannel, BotClient, CommandOptions, EmbedOrMessage,
} from './types';
import Logger from './utils/Logger';

export default abstract class Command {
    public conf: CommandOptions;

    constructor(protected client: BotClient, options: CommandOptions) {
      this.conf = {
        enabled: options.enabled,
        name: options.name,
        boardRequired: options.boardRequired || false,
        description: options.description || 'No information specified.',
        usage: options.usage || 'No usage specified.',
        category: options.category || 'Uncategorized',
        requiredPermissions: options.requiredPermissions || ['VIEW_CHANNEL', 'READ_MESSAGE_HISTORY'],
      };
    }

    /**
     * Checks if the user has permission to run the command.
     * @param {User} user A Discord user.
     * @param {Message} message The original message that was sent.
     * @returns {boolean} Whether the user can run the command.
     */
    public canRun(user: User, message: Message): boolean {
      const isBoard = message.member ? message.member.roles.cache.some((r) => r.name === 'Board') : false;

      if (this.conf.boardRequired && !isBoard) {
        message.channel.send(
          'You must be a Board member to use this command!',
        ).then(() => {
          Logger.warn(`Member ${message.author.username} attempted to use a Board command without permission!`, {
            eventType: 'rolesError',
            author: message.member,
            requiredRole: 'Board',
          });
        });
        return false;
      }

      const hasPermission = message.member
        ? message.member.hasPermission(this.conf.requiredPermissions, {
          checkAdmin: true,
          checkOwner: true,
        })
        : false;

      if (!hasPermission) {
        message.channel.send(
          'You do not have permission for this command.',
        ).then(() => {
          Logger.warn(`Member ${message.author.username} attempted to use a command without permissions!`, {
            eventType: 'permissionsError',
            author: message.member,
            requiredPermissions: this.conf.requiredPermissions,
          });
        });
        return false;
      }

      return true;
    }

    /**
     * Sends the message in the specified channel.
     * @param {AnyChannel} channel Any Discord channel.
     * @param {EmbedOrMessage} message The message or embed that will be sent.
     * @returns {Promise<Command>} The original command, supports method chaining.
     */
    public async respond(channel: AnyChannel, message: EmbedOrMessage): Promise<Command> {
      await channel.send(message);

      return this;
    }

    /**
     * The abstract run method for every command.
     * @param {Message} message The original message object that triggered the command.
     * @param {string[]} args The arguments that got sent with the message.
     */
    public abstract run(message: Message, args: string[]): Promise<void>;
}
