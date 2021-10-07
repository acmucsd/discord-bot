import { SlashCommandBuilder } from '@discordjs/builders';
import { User, Message, Interaction, CommandInteraction } from 'discord.js';
import {
  AnyChannel, BotClient, CommandOptions, EmbedOrMessage,
} from './types';
import Logger from './utils/Logger';

/**
 * Abstract class representing a Command in BreadBot.
 *
 * This generally is a class holding any necessary methods to run the Command
 * (API calls, pre-processing functions) while also maintaining the Slash Command
 * definition corresponding to said command. This can include:
 * - name of command, description of usage, etc.
 * - arguments received and types required, and so on
 *
 * The Command class should also interpret all the logic necessary to run the Slash Command.
 */
export default abstract class Command {
    /**
     * The command options for the bot.
     */
    public conf: CommandOptions;

    /**
     * The Slash Command definition to upload to the Discord Gateway.
     * This can be used to register a Slash Command.
     */
    public definition: SlashCommandBuilder;

    /**
     * The default constructor for Commands.
     *
     * By default, all required arguments are passed by CommandOptions. Other optional arguments
     * are given sensible defaults here.
     *
     * @param client The client receiving the Command.
     * @param options Any options to set for the Command.
     */
    constructor(protected client: BotClient,
      options: CommandOptions,
      definition: SlashCommandBuilder) {
      this.conf = {
        enabled: options.enabled,
        name: options.name,
        boardRequired: options.boardRequired || false,
        description: options.description || 'No information specified.',
        usage: options.usage || 'No usage specified.',
        category: options.category || 'Uncategorized',
        requiredPermissions: options.requiredPermissions || ['VIEW_CHANNEL', 'READ_MESSAGE_HISTORY'],
      };
      this.definition = definition;
    }

    /**
     * Checks if the user has permission to run the command.
     * @param {Interaction} interaction The Interaction made when calling the Command.
     * @returns {boolean} Whether the user can run the command.
     */
    public canRun(interaction: CommandInteraction): boolean {
      // Check whether user has the Board role.
      //
      // They either have a role cache (they have at least one Role) that includes "Board"
      // or they don't.
      const memberRoles = interaction.member ? interaction.member.roles : undefined;
      if (!memberRoles) {
        return false;
      }

      const isBoard = Array.isArray(memberRoles)
        ? memberRoles.includes('Board')
        : memberRoles.cache.some((r) => r.name === 'Board');

      if (this.conf.boardRequired && !isBoard) {
        interaction.reply(
          'You must be a Board member to use this command!',
        ).then(() => {
          Logger.warn(`Member ${interaction.member?.toString()} attempted to use a Board command without permission!`, {
            eventType: 'rolesError',
            author: interaction.member?.toString(),
            requiredRole: 'Board',
          });
        });
        return false;
      }

      return true;
    }

    /**
     * The abstract run method for every command.
     * @param {Message} message The original message object that triggered the command.
     * @param {string[]} args The arguments that got sent with the message.
     */
    public abstract run(interaction: CommandInteraction): Promise<void>;
}
