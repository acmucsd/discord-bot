import { Message, MessageEmbed } from 'discord.js';
import Command from '../Command';
import { BotClient } from '../types';

export default class Help extends Command {
    public fullHelpEmbed: MessageEmbed;

    constructor(client: BotClient) {
      super(client, {
        name: 'help',
        description: 'Displays the documentation for a provided command. If no arguments received, all commands are shown with a brief description.',
        category: 'Information',
        usage: `${client.settings.prefix.concat('help')} [command]`,
        requiredPermissions: ['SEND_MESSAGES'],
      });

      const helpDescription: string[] = [`All commands are prefixed with \`${client.settings.prefix}\`.\n`];

      client.commands.forEach((command) => {
        helpDescription.push(`\`${command.conf.name}\`: ${command.conf.description}`);
      });

      this.fullHelpEmbed = new MessageEmbed()
        .setTitle(':question: Available Commands')
        .setDescription(helpDescription.join('\n'))
        .setColor(0x3498DB);
    }

    public async run(message: Message, argus: string[]): Promise<void> {
      if (argus.length === 0) {
        await super.respond(message.channel, this.fullHelpEmbed);
        return;
      }

      const commandName = argus[0];
      const command = this.client.commands.get(commandName);

      if (!command) {
        await super.respond(message.channel, 'Command not found!');
        return;
      }

      const helpEmbed = new MessageEmbed()
        .setTitle(`:question: Help for \`${commandName}\``)
        .setDescription(`Usage: \`${command.conf.usage}\` \n\n ${command.conf.description}`)
        .setColor('0x3498DB');

      await super.respond(message.channel, helpEmbed);
    }
}
