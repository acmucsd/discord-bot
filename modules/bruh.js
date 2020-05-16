/**
* @file bruh.js
* @description Module for bruh-related commands.
* @author Storm_FireFox1
*/

module.exports = {

  // List of available commands in the module
  commands: [
    'bruh',
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
};
