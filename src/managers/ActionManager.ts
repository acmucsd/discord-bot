import { Collection } from 'discord.js';
import { Service } from 'typedi';
import { join } from 'path';
import { readdir, statSync } from 'fs';
import { BotClient } from '../types';
import Command from '../Command';
import Logger from '../utils/Logger';

@Service()
export default class {
    public commands: Collection<string, Command> = new Collection<string, Command>();

    /**
     * Parses files into commands from the configured command path.
     * @param {BotClient} client The original client, for access to the configuration.
     * @returns {Collection<string, Command>} A dictionary of every command in a [name, object] pair
     */
    public initializeCommands(client: BotClient): void {
      const { commands } = client.settings.paths;

      readdir(commands, (err, files) => {
        if (err) Logger.error(err);

        // Due to "help" not loading commands probably, we'll have to construct that last.
        // Move "Help.ts" to end of "files" array.
        files.push(files.splice(files.indexOf('Help.ts'), 1)[0]);

        files.forEach(async (cmd) => {
          if (statSync(join(commands, cmd)).isDirectory()) {
            this.initializeCommands(client);
          } else {
            const commandImport = await import(join(
              __dirname,
              '../../',
              `${commands}/${cmd.replace('ts', 'js')}`,
            ));

            const LoadedCommand = commandImport.default;
            const command = new LoadedCommand(client);

            this.commands.set(command.conf.name, command);
          }
        });
      });
    }

    /**
     * Initializes every event from the configured event path.
     * @param {BotClient} client The original client, for access to the configuration.
     */
    public static initializeEvents(client: BotClient): void {
      const { events } = client.settings.paths;

      readdir(events, (err, files) => {
        if (err) Logger.error(err);

        files.forEach(async (evt) => {
          const eventImport = await import(join(
            __dirname,
            '../../',
            `${events}/${evt.replace('ts', 'js')}`,
          ));

          const LoadedEvent = eventImport.default;
          const event = new LoadedEvent(client);

          const eventName = evt.split('.')[0];

          client.on(
            eventName.charAt(0).toLowerCase() + eventName.slice(1),
            (...args: string[]) => event.run(...args),
          );
        });
      });
    }
}
