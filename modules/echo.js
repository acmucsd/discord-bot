/**
 * @file echo.js
 * @description Module for making the Discord Bot repeat after you.
 *    This includes the ability to repeat messages, create embeds, and
 *    send files.
 * @author Emily Nguyen
 */

const fs = require('fs');
const rp = require('request-promise');

module.exports = {

  // A list of available commands
  commands: [
    'echo',
    'embed',
    'file',
    'follow'
  ],

  // A description of this module
  description: 'Make the bot repeat after what you say',

  // An image representing this module
  thumbnail: '',

  'echo': {
    usage: '!echo <message>',
    description: 'The bot repeats your message.',
    method: (client, message, args) => {
      const content = message.content;
      if(!args) {
        message.reply('Did you want me to say something?');
      }
      else {
        message.channel.send(content.slice(content.indexOf(' ')));
      }
    }
  },

  'embed': {
    usage: '!embed',
    description: 'Creates an embed with a title / description.',
    method: async (client, message, args) => {
      // BUG: Repeated call of this command in the 15 minute interval results in
      // repeated execution
      const filter = m => m.author.id === message.author.id;
      const conditions = {maxMatches: 1, time: 15000, errors: ['time']};
      const deleteMessage = (msg) => {
        msg.delete(10000);
      }
      message.reply('What would you like the title to be?')
        .then(deleteMessage);
      message.channel.awaitMessages(filter, conditions)
        .then((title) => {
          message.reply('What would you like the description to be?')
            .then(deleteMessage);
          message.channel.awaitMessages(filter, conditions)
            .then((description) => {
              let embed = new Discord.RichEmbed()
                .setTitle(title.first().content)
                .setDescription(description.first().content)
                .setColor('0x3498DB');
              deleteMessage(title.first());
              deleteMessage(description.first());
              message.channel.send(embed);
            })
            .catch(() => {
              deleteMessage(title.first());
              message.reply('You didn\'t give me information in time!')
                .then(deleteMessage);
            });
        })
        .catch(() => {
          message.reply('You didn\'t give me a title in time!')
            .then(deleteMessage);
        });
      deleteMessage(message);
    }
  },

  'file': {
    usage: '!file *Also, attach a file*',
    description: 'Reuploads a file that the user sent',
    method: (client, message, args) => {
      // TODO - Make this work with multiple file attachments
      // Use message.attachments.forEach
      const attachment = message.attachments.first();
      if (attachment) {
        let req = rp.get(attachment.url);
        req.on('error', console.error)
        req.pipe(fs.createWriteStream(`./cache/${attachment.filename}`));
        req
          .then(() => {
            fs.readdir('./cache/', (err, files) => {
              files.forEach((file) => {
                message.channel.send({
                  files: [
                    `./cache/${file}`
                  ]
                })
                .then(() => {
                  fs.unlink(`./cache/${file}`);
                });
              });
            });
          })
          .then(() => {
            message.delete();
          });
      };
    }
  },

  'follow': {
    usage: '!follow',
    description: 'Sends ACM\'s social media info.',
    method: (client, message, args) => {
      message.channel.send({
        files: [
          './assets/images/follow.png'
        ],
        embed: {
          color: 3447003,
          fields: [
            {
              name: '**<:web:598418888899821589>   Website**',
              value: '**Coming Soon**',
              inline: true
            },
            {
              name: '**<:cal:598416977840832532>   Calendar**',
              value: '**Coming Soon**',
              inline: true
            },
            {
              name: '**<:fb:598418876157394975>   Facebook**',
              value: '**Coming Soon**',
              inline: true
            },
            {
              name: '**<:ig:598406604827656202>   Instagram**',
              value: '**[acm.ucsd](https://www.instagram.com/acm.ucsd/)**',
              inline: true
            },
            {
              name: '**<:linkedin:598412901665210378>   LinkedIn**',
              value: '**[ACM at UC San Diego](https://www.linkedin.com/company/19158996/)**',
              inline: true
            },
            {
              name: '**<:github:598411364872093729>   GitHub**',
              value: '**[acmucsd](https://github.com/acmucsd)**',
              inline: true
            }
          ]
        }
      });
    }
  }
}
