/**
* @file bruh.js
* @description Module for bruh-related commands.
* @author Storm_FireFox1
*/

const Discord = require('discord.js');

module.exports = {

  // List of available commands in the module
  commands: [
    'bruh',
    'jeff',
    'isleaguetime',
  ],

  // A description of this module
  description: 'Bruh.',

  // An image representing the module
  thumbnail: '',

  bruh: {
    usage: '!bruh',
    description: "Bruh's all over a voice channel.",
    method: (client, message) => {
      if (message.member.voice.channel != null) {
        message.member.voice.channel.join()
          .then((connection) => { // Connection is an instance of VoiceConnection
            const bruhDispatcher = connection.play('./assets/bruh.m4a');
            bruhDispatcher.on('finish', () => {
              connection.disconnect();
            });
          })
          .catch((err) => message.channel.send(`Welp, I can't bruh now. Here's why: ${err}`));
      } else {
        message.reply('You need to join a voice channel first!');
      }
    },
  },

  jeff: {
    usage: '!jeff',
    description: 'Links you to a thing.',
    method: (client, message) => {
      const jeffEmbed = new Discord.MessageEmbed()
        .setColor('#fe5000')
        .setTitle('Jeff?')
        .setURL('https://soundcloud.com/derek-d2/sets/edc-las-vegas-virtual-rave-a-thon-2020')
        .setDescription('EDC Las Vega Virtual Rave-A-Thon 2020')
        .setThumbnail('https://i1.sndcdn.com/artworks-wkul4OOkahc0ChoU-xQS6ow-t500x500.jpg');
      message.channel.send(jeffEmbed);
    },
  },

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
