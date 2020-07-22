/* eslint-disable global-require */
/**
 * @file server.js
 * @description This file manages the backend for Diamond. It takes in commands
 *    from the files within modules and populates its commands data structures.
 * @author Emily Nguyen
 */

// Import modules
global.Discord = require('discord.js');
const fs = require('fs');
const express = require('express');
const { createLogger, format, transports } = require('winston');

const app = express();

const port = process.env.PORT || 3000;
const commandCountFileName = process.env.COMMAND_COUNT_FILENAME;
const cringeLogFileName = process.env.CRINGE_REACT_FILENAME;

/**
 * Logger for commands event.
 *
 * Logger requires an object with the following properties:
 * - command run
 * - author of message
 * - channel the message was sent on
 *
 * Logger appends timestamp to above info.
 */
const commandLogger = createLogger({
  level: 'info',
  format: format.printf((info) => `${Date.now()}:${info.command}:${info.author}:${info.channel}`),
  transports: [new transports.File({ filename: commandCountFileName })],
});

const cringeLogger = createLogger({
  level: 'info',
  format: format.printf((info) => `${info.message}`),
  transports: [new transports.File({ filename: cringeLogFileName })],
});

app.listen(port, '0.0.0.0', () => {
  // eslint-disable-next-line no-console
  console.log(`Listening on Port ${port}`);
});

// Retrieve bot settings
const token = process.env.BOT_TOKEN;
const prefix = process.env.BOT_PREFIX;

// Declare a client object
const client = new global.Discord.Client({ partials: ['MESSAGE', 'CHANNEL', 'REACTION'] });

// Load commands into a commands map
client.commands = {};
client.aliases = {};
client.helpList = [];
const modulesList = fs.readdirSync('./modules');
// eslint-disable-next-line no-restricted-syntax
for (const file of modulesList) {
  const filePath = `./modules/${file}`;
  // eslint-disable-next-line import/no-dynamic-require
  const module = require(filePath);
  const commandsList = [];
  for (let i = 0; i < module.commands.length; i += 1) {
    const command = module.commands[i];

    // Check for aliases
    if (module[command].aliases) {
      // eslint-disable-next-line no-restricted-syntax
      for (const alias of module[command].aliases) {
        client.aliases[alias] = module[command];
      }
    }
    commandsList.push([command, module[command].usage, module[command].description]);
    client.commands[command] = module[command];
  }
  client.helpList.push([file, commandsList, module.description, module.thumbnail]);
}

// When the client is ready, set its activity and announce that we've logged in
client.on('ready', () => {
  // eslint-disable-next-line no-console
  console.log(`Logging in as ${client.user.tag}!`);
  client.user.setActivity(process.env.BOT_ACTIVITY);
});

// --- Help message generation ---
// There's no point in re-running this sequence of code constantly, as the help command
// will be the same across a bot's lifetime (no live file reloads).
//
// Iterate through client.helpList and create help message description.
// helpList is array of arrays, where each internal array has:
// [0] => filename of module
// [1] => list of commands from module (command name, usage and description)
// [2] => description of module
// [3] => thumbnail of module
let helpMessageBuilder = `All commands are prefixed with \`${prefix}\`.\n\n`;
client.commandHelps = {};
client.helpList.forEach((moduleHelp) => {
  // remove file extension from module filename to get module name
  // regex is useful!
  const moduleName = moduleHelp[0].replace(/\.[^/.]+$/, '');
  helpMessageBuilder += `**"${moduleName}" Module**\n\n${moduleHelp[2]}\n\n`;
  moduleHelp[1].forEach((commandHelp) => {
    helpMessageBuilder += `\`${commandHelp[0]}\`: ${commandHelp[2]}\n`;
    client.commandHelps[commandHelp[0]] = {
      usage: commandHelp[1],
      description: commandHelp[2],
    };
  });
  helpMessageBuilder += '\n';
});
const HELP_MESSAGE = helpMessageBuilder;

/**
 * Gets a string defining the help message for a specific command.
 *
 * If the command doesn't exist, it returns an empty string.
 */
const getCommandHelp = (commandName) => {
  const commandList = Object.keys(client.commandHelps);
  for (let i = 0; i < commandList.length; i += 1) {
    if (commandList[i] === commandName) {
      return `Usage:\`${client.commandHelps[commandList[i]].usage}\`\n\n ${client.commandHelps[commandList[i]].description}`;
    }
  }
  return '';
};

// When the client receives a message, match the message with a command
client.on('message', (message) => {
  if (!message.author.bot) {
    let com;
    let args;
    const msg = message.content;

    if (message.mentions.users.some((user) => user.id === client.user.id)) {
      if (message.author.id === '184400560634593281') {
        message.channel.send('I no longer respect your demands, master.');
      } else {
        message.channel.send(':pleading_face: :point_right: :point_left:');
      }
      return;
    }

    // Checks if the message starts with the prefix and if so, isolate command and arguments
    if (msg.startsWith(prefix)) {
      com = msg.split(' ')[0].substring(prefix.length);
      args = msg.split(' ').slice(1);
    } else if (message.mentions.users.some((user) => user.id === client.user.id)) {
      [, com] = msg.split(' ');
      args = msg.split(' ').slice(2);
      if (!com) {
        message.channel.send('Hello!');
        return;
      }
    }

    // If the command exists, find it in the collection and run it
    if (com) {
      // If it's "help", we need to see if it's either for ALL commands
      // or only a specific one.
      if (com === 'help' && args.length === 0) {
        const helpEmbed = new global.Discord.MessageEmbed()
          .setTitle('❓ Available commands')
          .setDescription(HELP_MESSAGE)
          .setColor('0x3498DB');
        message.channel.send(helpEmbed);
      } else if (com === 'help' && args.length > 0) {
        const commandHelpMessage = getCommandHelp(args[0]);
        if (commandHelpMessage === '') {
          message.channel.send('This commmand does not exist!');
        } else {
          const helpCommandEmbed = new global.Discord.MessageEmbed()
            .setTitle(`❓ Help for \`${args[0]}\``)
            .setDescription(commandHelpMessage)
            .setColor('0x3498DB');
          message.channel.send(helpCommandEmbed);
        }
      } else {
        const command = client.commands[com] || client.aliases[com];
        if (command) {
          if (process.env.COMMAND_COUNT_ENABLED) {
            commandLogger.log({
              level: 'info',
              command: com,
              author: message.author.tag,
              channel: message.channel.name,
            });
          }
          command.method(client, message, args);
        }
      }
    }
  }
});

client.on('messageReactionAdd', async (reaction) => {
  // When we receive a reaction we check if the reaction is partial or not
  if (reaction.partial) {
    try {
      await reaction.fetch();
    } catch (error) {
      // Return as `reaction.message.author` may be undefined/null
      console.log('Something went wrong when fetching the message: ', error);
    }
  }

  if (reaction.emoji.id === process.env.CRINGE_REACT_EMOTE_ID) {
    cringeLogger.log({
      level: 'info',
      message: reaction.message.content,
    });
  }
});

client.login(token);
