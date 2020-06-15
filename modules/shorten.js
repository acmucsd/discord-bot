/**
 * @file shorten.js
 * @description Module for shortening links using "acmurl" (Rebrandly API).
 * @author Storm_FireFox1
 */

const rp = require('request-promise');
const Discord = require('discord.js');

module.exports = {

  // List of available commands in the module
  commands: [
    'acmurl',
  ],

  // A description of this module
  description: "Interacts with 'acmurl' in various ways.",

  // An image representing the module
  thumbnail: '',

  acmurl: {
    usage: '!acmurl <shortlink> <longurl> [description]',
    description: "Shortens the provided URL into a 'acmurl' link.",
    method: (client, message, args) => {
      // if (!message.member.roles.some((r) => r.name === 'Board')) {
      //   message.channel.send('You must be a Board member to use this command!');
      //   return;
      // }

      const shortlink = args[0];
      const longlink = args[1];
      const description = args.slice(2).join(' ');
      const linkTitle = description || `Discord Bot - ${shortlink}`; // optional argument or slashtag

      // URL Validator taken straight from Stack Overflow
      //
      // (https://stackoverflow.com/questions/30931079/validating-a-url-in-node-js)
      //
      // Needed to check if arguments provided are actually URL's for
      // Rebrandly.
      const validURL = (s) => {
        try {
          // eslint-disable-next-line no-new
          new URL(s);
          return true;
        } catch (err) {
          return false;
        }
      };

      // Check if there are not two arguments
      if (args.length < 2) {
        message.channel.send('You must provide both the long link and the short link!');
        return;
      } if (!validURL(longlink)) { // check for valid URL
        message.channel.send('The long link must be a valid URL!');
        return;
      }

      // Options for request
      const addLinkOptions = {
        uri: 'https://api.rebrandly.com/v1/links',
        method: 'POST',
        headers: {
          apikey: process.env.REBRANDLY_API_KEY,
          'Content-Type': 'application/json',
        },
        body: {
          title: linkTitle,
          slashtag: shortlink,
          destination: longlink,
          domain: {
            id: process.env.REBRANDLY_DOMAIN_ID,
          },
        },
        json: true, // Stringify body to JSON
        resolveWithFullResponse: true, // get status code
        simple: false, // we need this for 403 status code in request
      };

      rp(addLinkOptions)
        .then((response) => {
          if (response.statusCode === 403) { // short link already exists
            const getLinkIdOptions = {
              uri: `https://api.rebrandly.com/v1/links?slashtag=${shortlink}&domain.id=${process.env.REBRANDLY_DOMAIN_ID}`,
              method: 'GET',
              headers: {
                apikey: process.env.REBRANDLY_API_KEY,
                'Content-Type': 'application/json',
              },
              json: true, // Stringify body to JSON
              resolveWithFullResponse: true, // get status code
            };
            rp(getLinkIdOptions).then((response2) => {
              const linkId = response2.body[0].id;
              const updateLinkOptions = {
                uri: `https://api.rebrandly.com/v1/links/${linkId}`,
                method: 'POST',
                headers: {
                  apikey: process.env.REBRANDLY_API_KEY,
                  'Content-Type': 'application/json',
                },
                body: {
                  title: linkTitle,
                  destination: longlink,
                  favourite: false,
                },
                json: true, // Stringify body to JSON
                resolveWithFullResponse: true, // get status code
              };
              rp(updateLinkOptions).then((response3) => {
                const shortenEmbed = new Discord.MessageEmbed()
                  .setTitle('Updated shortened link!')
                  .setDescription(`Short link: ${response3.body.shortUrl}\nPreviously shortened link: ${response2.body[0].destination}`)
                  .setURL(`https://${response3.body.shortUrl}`)
                  .setColor('0x3498DB');
                message.channel.send(shortenEmbed);
              });
            });
          } else {
            // This makes a nice embed with a clickable URL for quick testing.
            const shortenEmbed = new Discord.MessageEmbed()
              .setTitle('Set shortened link!')
              .setDescription(`Short link: ${response.body.shortUrl}`)
              .setURL(`https://${response.body.shortUrl}`)
              .setColor('0x3498DB');
            message.channel.send(shortenEmbed);
          }
        })
        .catch((err) => {
          message.channel.send(`Error processing API request to Rebrandly! Cause of error:\n\`\`\`\n${err.cause}\n\`\`\``);
        });
    },
  },
};
