/**
* @file bruh.js
* @description Module for bruh-related commands.
* @author Storm_FireFox1
*/

const Discord = require('discord.js');

module.exports = {

  // List of available commands in the module
  commands: [
    'isleaguetime',
  ],

  // A description of this module
  description: 'Bruh.',

  // An image representing the module
  thumbnail: '',

  isleaguetime: {
    usage: '!isleaguetime',
    description: 'Checks whether it\'s League time.',
    method: (client, message) => {
      const timeNow = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));
      const currentTime = timeNow.getHours();
      const currentYear = timeNow.getFullYear();
      const summerFirstDay = Date.parse(`06/20/${currentYear}`);
      const summerLastDay = Date.parse(`09/20/${currentYear}`);
      if (summerFirstDay <= timeNow && timeNow <= summerLastDay) {
        message.channel.send('True.');
      } else if (currentTime >= 22) {
        message.channel.send('True.');
      } else if (currentTime >= 0 && currentTime <= 6) {
        message.channel.send('True.');
      } else {
        message.channel.send('False.');
      }
    },
  },
};
