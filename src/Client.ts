import { Collection, Client as DiscordClient } from 'discord.js';
import { Service } from 'typedi';
import Logger from './utils/Logger';
import { BotSettings, BotClient } from './types';
import Command from './Command';
import ActionManager from './managers/ActionManager';
import configuration from './config/config';
import PortalAPIManager from './managers/PortalAPIManager';

/**
 * The class representing the Discord bot.
 *
 * Our Client class not only holds the client itself, but also implements additional
 * parameters to keep track of bot settings and registered Events and Commands.
 *
 * The procedure when initializing the Client goes something like this:
 * - Pass in any required ClientOptions for Discord.js, if any.
 * - Take default configuration from "config.ts" and pass through to our Client,
 *   adding environment variables found. If any required environment variables don't exist,
 *   we error out.
 * - Initialize our ActionManager, our method of dynamically importing Events and Commands
 * - Initialize our PortalAPIManager, our method of centralizing API tokens to the Membership
 *   Portal API.
 * - Login to Discord API when done initializing everything.
 *
 * ActionManager does the heavy lifting, so read that as well.
 */
@Service()
export default class Client extends DiscordClient implements BotClient {
  /**
   * The settings for the Client.
   *
   * These are a mix of environment variables and default Discord.js client options.
   */
  public settings: BotSettings;

  /**
   * The default constructor for Client.
   *
   * Begins the configuration process. Initialization is done in {@link initialize initialize()}.
   * @param actionManager An ActionManager class to run. Injected by TypeDI.
   * @param portalAPIManager A PortalAPIManager class to run. Injected by TypeDI
   */
  constructor(private actionManager: ActionManager, private portalAPIManager: PortalAPIManager) {
    super(configuration.clientOptions || {});
    this.settings = configuration;
    // We absolutely need some envvars, so if they're not in our .env file, nuke the initialization.
    // We can throw Errors here to nuke the bot, since we don't have any catches higher up.
    if (!process.env.BOT_TOKEN) {
      Logger.error('Could not construct Client class: missing bot token in envvars', {
        eventType: 'initError',
        error: 'missing bot token in envvars',
      });
      throw new Error('Could not construct Client class: missing bot token in envvars');
    }
    if (!process.env.BOT_PREFIX) {
      Logger.error('Could not construct Client class: missing bot prefix in envvars', {
        eventType: 'initError',
        error: 'missing bot prefix in envvars',
      });
      throw new Error('Could not construct Client class: missing bot prefix in envvars');
    }
    this.settings.token = process.env.BOT_TOKEN;
    this.settings.prefix = process.env.BOT_PREFIX;
    // "!" required here because Discord.js doesn't let you make this mandatory,
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
    if (!process.env.MEMBERSHIP_PORTAL_API_USERNAME) {
      Logger.error('Could not construct Client class: missing Membership Portal API username in envvars', {
        eventType: 'initError',
        error: 'missing Membership Portal API username in envvars',
      });
      throw new Error('Could not construct Client class: missing Membership Portal API username in envvars');
    }
    if (!process.env.MEMBERSHIP_PORTAL_API_PASSWORD) {
      Logger.error('Could not construct Client class: missing Membership Portal API password in envvars', {
        eventType: 'initError',
        error: 'missing Membership Portal API password in envvars',
      });
      throw new Error('Could not construct Client class: missing Membership Portal API password in envvars');
    }
    this.settings.acmurl.username = process.env.ACMURL_USERNAME;
    this.settings.acmurl.password = process.env.ACMURL_PASSWORD;
    this.settings.portalAPI.username = process.env.MEMBERSHIP_PORTAL_API_USERNAME;
    this.settings.portalAPI.password = process.env.MEMBERSHIP_PORTAL_API_PASSWORD;
    this.initialize().then();
  }

  /**
   * Initialize the Client and connect to the Discord API.
   *
   * Registers all Events and Commands and then logs in to the API for being ready.
   * Highly recommend to read ActionManager's code to understand what this does.
   * @private
   */
  private async initialize(): Promise<void> {
    try {
      this.portalAPIManager.initializeTokenHandling(this);
      this.actionManager.initializeCommands(this);
      ActionManager.initializeEvents(this);
      await this.login(configuration.token);
    } catch (e) {
      Logger.error(`Could not initialize bot: ${e}`);
    }
  }

  /**
   * Get a map of [commandName, Command] pairs.
   *
   * Useful to find a registered Command quickly.
   */
  public get commands(): Collection<string, Command> {
    return this.actionManager.commands;
  }

  /**
   * Get the API token for the Membership Portal API.
   */
  public get apiToken(): string {
    return this.portalAPIManager.apiToken;
  }
}
