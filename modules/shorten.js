/**
 * @file shorten.js
 * @description Module for shortening links using "acmurl" (Rebrandly API).
 * @author Storm_FireFox1
 */

global.config = require('../config.json')
const rp = require('request-promise')
const url = require('url').URL
const https = require('https')

module.exports = {

    // List of available commands in the module
    commands: [
      'shorten'
    ],

    // A description of this module
    description: "Interacts with 'acmurl' in various ways.",

    // An image representing the module
    thumbnail: '',

    'acmurl': {
      usage: '!acmurl <shortlink> <longurl> [description]',
      description: "Shortens the provided URL into a 'acmurl' link.",
      method: (client, message, args) => {
        if (!message.member.roles.some(r => r.name === "Board")) {
          message.channel.send("You must be a Board member to use this command!");
          return;
        }

        const shortlink = args[0];
        const longlink = args[1];
        const description = args[2];

        // URL Validator taken straight from Stack Overflow
        //
        // (https://stackoverflow.com/questions/30931079/validating-a-url-in-node-js)
        //
        // Needed to check if arguments provided are actually URL's for
        // Rebrandly.
        const validURL = (s) => {
          try {
            new URL(s);
            return true;
          } catch (err) {
            return false;
          }
        };

        // Check if there are not two arguments
        if (args.length < 2) {
          message.channel.send("You must provide both the long link and the short link!");
          return;
        } else if (!validURL(longlink)) { // check for valid URL
          message.channel.send("The long link must be a valid URL!");
          return;
        }

        // Options for request
        const addLinkOptions = {
          uri: 'https://api.rebrandly.com/v1/links',
          method: 'POST',
          headers: {
            'apikey': process.env.REBRANDLY_API_KEY || config.rebrandlyAPIKey,
            'Content-Type': 'application/json'
          },
          body: {
            title: description || 'Discord Bot - ' + shortlink, // optional argument or slashtag
            slashtag: shortlink,
            destination: longlink,
            domain: {
              id: process.env.REBRANDLY_DOMAIN_ID || config.rebrandlyDomainId
            }
          },
          json: true, // Stringify body to JSON
          resolveWithFullResponse: true, // get status code
          simple: false // we need this for 403 status code in request
        };

        rp(addLinkOptions)
          .then(function (response) {
            if (response.statusCode == 403) { // short link already exists
              message.channel.send("A short link with the same name already exists! Try another one.");
            } else {
              // This makes a nice embed with a clickable URL for quick testing.
              let shortenEmbed = new Discord.RichEmbed()
                .setTitle("Set shortened link!")
                .setDescription("Short link: " + response.body.shortUrl)
                .setURL("https://" + response.body.shortUrl)
                .setColor('0x3498DB');
              message.channel.send(shortenEmbed);
            }
          })
          .catch(function (err) {
            message.channel.send("Error processing API request to Rebrandly! Check console logs.");
            console.error(err);
          });
      }
    }
}

