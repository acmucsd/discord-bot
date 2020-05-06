/**
* @file cat.js
* @description Module for cat-related commands.
* @author Storm_FireFox1
*/

const rp = require('request-promise');

module.exports = {

  // List of available commands in the module
  commands: [
    'cat',
  ],

  // A description of this module
  description: 'Various cat-related commands. Snu?',

  // An image representing the module
  thumbnail: '',

  cat: {
    usage: '!cat',
    description: 'Gives you a nice cat.',
    method: (client, message) => {
      const catApiOptions = {
        uri: 'https://api.thecatapi.com/v1/images/search',
        method: 'GET',
        headers: {
          'x-api-key': process.env.CAT_API_KEY,
          'Content-Type': 'application/json',
        },
        json: true,
      };

      rp(catApiOptions).then((catResponse) => {
        const catApiObject = catResponse[0];
        message.channel.send({ files: [catApiObject.url] });
      }).catch((err) => {
        message.channel.send(`Can't get cats, sorry! Here's why: \`${err.cause}\``);
      });
    },
  },
};
