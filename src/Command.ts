import { User, Message } from 'discord.js';
import {
  AnyChannel, BotClient, CommandOptions, EmbedOrMessage,
} from './types';
import Logger from './utils/Logger';

/**
 * Abstract class representing a Command in BreadBot.
 *
 * This generally is a class holding any necessary methods to run the Command
 * (API calls, pre-processing functions) while also maintaining the options and flags
 * representing a command. CommandOptions represents the possible configuration for a
 * Command, which typically includes:
 * - name, category, description
 * - usage of command
 * - flags to determine execution (required permissions. required roles, enabled at runtime)
 */
export default abstract class Command {
    /**
     * The command options for the bot.
     */
    public conf: CommandOptions;

    /**
     * The default constructor for Commands.
     *
     * By default, all required arguments are passed by CommandOptions. Other optional arguments
     * are given sensible defaults here.
     *
     * @param client The client receiving the Command.
     * @param options Any options to set for the Command.
     */
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
      // Check whether user has the Board role.
      //
      // They either have a role cache (they have at least one Role) that includes "Board"
      // or they don't.
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

      // Checks whether user has required permissions for Command.
      // If not, they won't run it. Bypass checks for administrators and owners to
      // not lock them out if they mess up channel configuration.
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
