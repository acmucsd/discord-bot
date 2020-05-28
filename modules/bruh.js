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
  ],

  // A description of this module
  description: 'Bruh.',

  // An image representing the module
  thumbnail: '',

  bruh: {
    usage: '!bruh',
    description: "Bruh's all over a voice channel.",
    method: (client, message) => {
      if (message.member.voiceChannel) {
        message.member.voiceChannel.join()
          .then((connection) => { // Connection is an instance of VoiceConnection
            const bruhDispatcher = connection.playFile('./assets/bruh.m4a');
            bruhDispatcher.on('end', () => {
              connection.disconnect();
            });
          });
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
};
