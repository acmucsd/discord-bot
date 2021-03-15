# BreadBot

ACM's very own Discord bot!

## Installation

BreadBot is quick to install. Node v14 or higher is required.

``` sh
git clone https://github.com/acmucsd/discord-bot
cd discord-bot/
npm install
```

# Configuration

In order to configure BreadBot, you will need to:
- Copy `.env.example` to `.env`
- Modify any of the environment variables you need

Some environment variables are mandatory, make sure to check which ones in the
comments.  We assume you already have a Discord app for your bot. If not, you
may check out a tutorial of how to do it
[here](https://www.digitalocean.com/community/tutorials/how-to-build-a-discord-bot-with-node-js#step-1-%E2%80%94-setting-up-a-discord-bot).
Part 1 is the useful part

## Running

To run, simply:

``` sh
npm start
```

## Developing

Please read `CONTRIBUTING.md` first, as it contains a general overview of how
the bot is structured for you to be able to get started fast.
