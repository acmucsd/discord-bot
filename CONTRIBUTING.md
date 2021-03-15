# BreadBot Developer Guide

Hello! This is the manual of all the information you'll need to get started with
coding on BreadBot.

## Architecture

BreadBot is a TypeScript-based bot using the Discord.js library, structured
around dependency-injected functionality and dynamic imports. At its core,
BreadBot is booted by dynamically importing critical classes in its source
folders.

BreadBot is made of a fat Client class which holds the functionality necessary
to initialize the bot. Its functionality is stored, by default, in two folders:
- `src/events`; this contains classes for processing each Event that Discord.js
  could hand over to our bot
- `src/commands`; this contains classes for all the Commands BreadBot has

If you want to understand how these individual functionalities are imported,
you'll likely find great use in reading the
[ActionManager](https://github.com/acmucsd/discord-bot/blob/master/src/managers/ActionManager.ts)
class, the workhorse that dynamically imports each functionality.

In terms of strict development, most work is done in the above two folders by simply
making a new class.
- Commands must be capitalized. A good boilerplate file for a new Command can
be found in `examples/ExampleCommand.ts`
- Events must be capitalized and follow the name of an event registered by
  Discord.js. The list of registered events can be found
  [here](https://discord.js.org/#/docs/main/stable/class/Client), and a good
  boilerplate file for Events can be found at `examples/ExampleEvent.ts`.

However, if by any chance, additional configuration is required (or additional
environment variables are required), you'll need to look into `Client.ts` and
`config/config.ts` as well; `config.ts` contains sensible default for any
variables that BreadBot needs, and `Client.ts` overrides them at runtime with
any environment variables it reads.

If you want to update types for any of the types in the project, you'll find
them in `src/types/`.

## Pull Requests

In order to make a PR, simply fork the repo and make changes on a new branch.
Once you're done, make sure that:
- You have proper logging for any errors and commands. You can find good
examples of logging in `src/Commands/ACMURL.ts`, as it has the most logging out
of all the other commands.
- You've ran your codebase through the linter by running `npm start lint:fix`.
  CI will check for this.
- You've tested the bot's functionality by running `npm start` in a testing
server. This isn't necessary, as Dev Team will likely test new functionality,
but it's good to give it a shot for local debugging.

Dev Team will get to your PR as quickly as possible and give appropriate comments, but if
it's all good, your PR will be merged pretty quick.

## Bug Reporting

If you find any wack functionality in BreadBot, please report in the Issues
section. Do not add labels to your Issue, as Dev Team will handle triaging
themselves.
