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

let commandCount = {};

const app = express();

const port = process.env.PORT || 3000;
const commandCountFileName = process.env.COMMAND_COUNT_FILENAME;

app.listen(port, '0.0.0.0', () => {
  // eslint-disable-next-line no-console
  console.log(`Listening on Port ${port}`);
});


// Retrieve bot settings
const token = process.env.BOT_TOKEN;
const prefix = process.env.BOT_PREFIX;

// Declare a client object
const client = new global.Discord.Client();

// Load commands into a commands map
client.commands = {};
client.aliases = {};
client.helpList = [];
if (fs.existsSync(commandCountFileName)) {
  commandCount = JSON.parse(fs.readFileSync(commandCountFileName));
} else if (process.env.COMMAND_COUNT_ENABLED) {
  fs.writeFileSync(commandCountFileName, '{}', 'utf8');
}
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
    commandsList.push([command, module[command].usage]);
    client.commands[command] = module[command];
    if (!commandCount[command]) {
      commandCount[command] = 0;
    }
  }
  client.helpList.push([file, commandsList, module.description, module.thumbnail]);
}

// When the client is ready, set its activity and announce that we've logged in
client.on('ready', () => {
  // eslint-disable-next-line no-console
  console.log(`Logging in as ${client.user.tag}!`);
  client.user.setActivity(process.env.BOT_ACTIVITY);
});

// When the client receives a message, match the message with a command
client.on('message', (message) => {
  if (!message.author.bot) {
    let com;
    let args;
    const msg = message.content;

    if (message.isMentioned(client.user)) {
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
    } else if (message.isMentioned(client.user)) {
      [, com] = msg.split(' ');
      args = msg.split(' ').slice(2);
      if (!com) {
        message.channel.send('Hello!');
        return;
      }
    }

    // If the command exists, find it in the collection and run it
    if (com) {
      const command = client.commands[com] || client.aliases[com];
      if (command) {
        command.method(client, message, args);
        commandCount[com] += 1;
        if (process.env.COMMAND_COUNT_ENABLED) {
          fs.writeFileSync(commandCountFileName, JSON.stringify(commandCount), 'utf8');
        }
      }
    }
  }
});

client.login(token);
