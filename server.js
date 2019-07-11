/**
 * @file server.js
 * @description This file manages the backend for Diamond. It takes in commands
 *    from the files within modules and populates its commands data structures.
 * @author Emily Nguyen
 */

// Global Variables
global.config = require('./config.json');

// Import modules
global.Discord = require('discord.js');
const fs = require('fs');
const express = require('express');
const app = express();

const port = process.env.PORT || 3001;
app.listen(port, '0.0.0.0', () => {
  console.log(`Listening on Port ${port}`);
});

// Retrieve bot settings
const token = process.env.API_KEY || global.config.token;
const prefix = global.config.prefix;

// Declare a client object
const client = new global.Discord.Client();

// Load commands into a commands map
client.commands = {};
client.aliases = {};
client.helpList = [];
const modulesList = fs.readdirSync('./modules');
for(const file of modulesList) {
  const module = require(`./modules/${file}`);
  let commandsList = [];
  for(let i = 0; i < module.commands.length; i++) {
    let command = module.commands[i];

    // Check for aliases
    if(module[command].aliases) {
      for(let alias of module[command].aliases) {
        client.aliases[alias] = module[command];
      }
    }
    commandsList.push([command, module[command].usage]);
    client.commands[command] = module[command];
  }
  client.helpList.push([file, commandsList, module.description, module.thumbnail]);
}

// When the client is ready, set its activity and announce that we've logged in
client.on('ready', () => {
  console.log(`Logging in as ${client.user.tag}!`);
  client.user.setActivity(global.config.activity);
});

// When the client receives a message, match the message with a command
client.on('message', (message) => {
  if(!message.author.bot) {
    let com, args;
    let msg = message.content;

    // Checks if the message starts with the prefix and if so, isolate command and arguments
    if(msg.startsWith(prefix)) {
      com = msg.split(' ')[0].substring(prefix.length);
      args = msg.split(' ').slice(1);
    }

    // Checks if bot is mentioned and if so, isolate command and arguments
    else if(message.isMentioned(client.user)) {
      com = msg.split(' ')[1];
      args = msg.split(' ').slice(2);
      if(!com) {
        message.channel.send('hello');
        return;
      }
    }

    // If the command exists, find it in the collection and run it
    if(com) {
      let command = client.commands[com] || client.aliases[com];
      if(command) {
        command.method(client, message, args);
      }
    }
  }
});

client.login(token);
