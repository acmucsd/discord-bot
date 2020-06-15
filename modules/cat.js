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
    'dog',
    'bread',
  ],

  // A description of this module
  description: 'Various cat-related commands. Snu?',

  // An image representing the module
  thumbnail: '',

  bread: {
    usage: '!bread',
    description: 'Gives you that good bread.',
    method: (client, message) => {
      const breadApiOptions = {
        uri: 'https://api.unsplash.com/photos/random?query=bread',
        method: 'GET',
        headers: {
          Authorization: `Client-ID ${process.env.UNSPLASH_ACCESS_KEY}`,
        },
        json: true,
      };

      rp(breadApiOptions).then((breadResponse) => {
        message.channel.send({ files: [{ attachment: `${breadResponse.urls.full}.jpg`, name: 'bread.jpg' }] });
      }).catch((err) => {
        message.channel.send(`Can't get that bread, sorry! Here's why: \`${err.cause}\``);
      });
    },
  },

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

  dog: {
    usage: '!dog',
    description: 'Gives you a nice dog.',
    method: (client, message) => {
      const dogApiOptions = {
        uri: 'https://dog.ceo/api/breeds/image/random',
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        json: true,
      };

      rp(dogApiOptions).then((dogResponse) => {
        message.channel.send({ files: [dogResponse.message] });
      }).catch((err) => {
        message.channel.send(`Can't get dogs, sorry! Here's why: \`${err.cause}\``);
      });
    },
  },
};
