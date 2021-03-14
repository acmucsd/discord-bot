import { Collection, Client as DiscordClient } from 'discord.js';
import { Service } from 'typedi';
import Logger from './utils/Logger';
import { BotSettings, BotClient } from './types';
import Command from './Command';
import ActionManager from './managers/ActionManager';
import configuration from './config/config';

@Service()
export default class Client extends DiscordClient implements BotClient {
    public settings: BotSettings;

    constructor(private actionManager: ActionManager) {
      super(configuration.clientOptions || {});
      this.settings = configuration;
      this.settings.token = process.env.BOT_TOKEN;
        // optional "!" required here because Discord.js doesn't let you make this mandatory,
        // so we need the "name" to be an optional assignment.
        this.settings.presence.activity!.name = process.env.BOT_ACTIVITY;
        this.settings.maintainerID = process.env.MAINTAINER_USER_ID;
        this.settings.apiKeys.catAPI = process.env.CAT_API_KEY;
        this.settings.apiKeys.unsplash = process.env.UNSPLASH_ACCESS_KEY;
        if (!process.env.ACMURL_USERNAME) {
          Logger.error('Could not construct Client class: missing ACMURL username in envvars', {
            eventType: 'initError',
            error: 'missing ACMURL username in envvars',
          });
          throw new Error('Could not construct Client class: missing ACMURL username in envvars');
        }
        if (!process.env.ACMURL_PASSWORD) {
          Logger.error('Could not construct Client class: missing ACMURL password in envvars', {
            eventType: 'initError',
            error: 'missing ACMURL password in envvars',
          });
          throw new Error('Could not construct Client class: missing ACMURL password in envvars');
        }
        this.settings.acmurl.username = process.env.ACMURL_USERNAME;
        this.settings.acmurl.password = process.env.ACMURL_PASSWORD;
        this.initialize().then();
    }

    private async initialize(): Promise<void> {
      try {
        this.actionManager.initializeCommands(this);
        ActionManager.initializeEvents(this);
        await this.login(configuration.token);
      } catch (e) {
        Logger.error(`Could not initialize bot: ${e}`);
      }
    }

    public get commands(): Collection<string, Command> {
      return this.actionManager.commands;
    }
}
