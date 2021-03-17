import { Message, MessageEmbed } from 'discord.js';
import Command from '../Command';
import { BotClient } from '../types';

/**
 * Help is a special Command among all of them, as it's kinda meta.
 *
 * This Command reads the parameters of a Command, and returns them in specialized Embeds,
 * crafting nice-looking help messageds for all Commands.
 */
export default class Help extends Command {
  /**
   * The Help embed we'll send if Help is called with no arguments.
   * This embed should contain all the Commands.
   */
    public fullHelpEmbed: MessageEmbed;

    /**
     * The constructor for Help.
     *
     * This initializes {@link fullHelpEmbed the embed for Help with no argumnets}, which take
     * some work to deal with.
     *
     * What we basically do is take each command, add some formatting around the name
     * and usage call. When that's done, we generate the Embed and save it in our arguments.
     */
    constructor(client: BotClient) {
      super(client, {
        name: 'help',
        enabled: true,
        description: 'Displays the documentation for a provided command. If no arguments received, all commands are shown with a brief description.',
        category: 'Information',
        usage: client.settings.prefix.concat('help [command]'),
        requiredPermissions: ['SEND_MESSAGES'],
      });

      // Start off the help embed with a clear indicator of the prefix.
      const helpDescription: string[] = [`All commands are prefixed with \`${client.settings.prefix}\`.\n`];

      // For each command...
      client.commands.forEach((command) => {
        // Add the name under literate format and then add the description.
        helpDescription.push(`\`${command.conf.name}\`: ${command.conf.description}`);
      });

      // Generate the Embed and save it.
      this.fullHelpEmbed = new MessageEmbed()
        .setTitle(':question: Available Commands')
        .setDescription(helpDescription.join('\n'))
        .setColor(0x3498DB);
    }

    public async run(message: Message, argus: string[]): Promise<void> {
      // If we have no command called...
      if (argus.length === 0) {
        // Give back the full Embed.
        await super.respond(message.channel, this.fullHelpEmbed);
        return;
      }

      // Extract command name from the argument list.
      const commandName = argus[0];
      // Fetch it from our list of Commands.
      const command = this.client.commands.get(commandName);

      // If given command name doesn't exist...
      if (!command) {
        await super.respond(message.channel, 'Command not found!');
        return;
      }

      // Return the embed for the specific command otherwise.
      const helpEmbed = new MessageEmbed()
        .setTitle(`:question: Help for \`${commandName}\``)
        .setDescription(`Usage: \`${command.conf.usage}\` \n\n ${command.conf.description}`)
        .setColor('0x3498DB');

      await super.respond(message.channel, helpEmbed);
    }
}
