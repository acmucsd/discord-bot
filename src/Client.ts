import { Collection, Client as DiscordClient } from "discord.js";
import { Service } from "typedi";
import Logger from "./utils/Logger";
import { BotSettings, BotClient, BotInitializationError } from "./types";
import Command from "./Command";
import ActionManager from "./managers/ActionManager";
import configuration from "./config/config";
import PortalAPIManager from "./managers/PortalAPIManager";

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
  constructor(
    private actionManager: ActionManager,
    private portalAPIManager: PortalAPIManager
  ) {
    super(
      configuration.clientOptions || {
        intents: [
          "GUILDS",
          "GUILD_INTEGRATIONS",
          "GUILD_WEBHOOKS",
          "GUILD_MESSAGES",
          "DIRECT_MESSAGES",
          "GUILD_MESSAGE_REACTIONS",
          "DIRECT_MESSAGE_REACTIONS",
        ],
      }
    );
    this.settings = configuration;
    // We absolutely need some envvars, so if they're not in our .env file, nuke the initialization.
    // We can throw Errors here to nuke the bot, since we don't have any catches higher up.
    if (!process.env.BOT_TOKEN) {
      throw new BotInitializationError("Bot Token");
    }
    if (!process.env.BOT_PREFIX) {
      throw new BotInitializationError("Bot Prefix");
    }
    if (!process.env.CLIENT_ID) {
      throw new BotInitializationError("App Client ID");
    }
    if (!process.env.ACMURL_USERNAME) {
      throw new BotInitializationError("ACMURL Username");
    }
    if (!process.env.ACMURL_PASSWORD) {
      throw new BotInitializationError("ACMURL Password");
    }
    if (!process.env.MEMBERSHIP_PORTAL_API_USERNAME) {
      throw new BotInitializationError("Membership Portal API Username");
    }
    if (!process.env.MEMBERSHIP_PORTAL_API_PASSWORD) {
      throw new BotInitializationError("Membership Portal API Password");
    }
    if (!process.env.DISCORD_GUILD_IDS) {
      throw new BotInitializationError("Discord Guild ID List");
    }
    this.settings.clientID = process.env.CLIENT_ID;
    this.settings.token = process.env.BOT_TOKEN;
    this.settings.prefix = process.env.BOT_PREFIX;
    this.settings.maintainerID = process.env.MAINTAINER_USER_ID;
    this.settings.apiKeys.catAPI = process.env.CAT_API_KEY;
    this.settings.apiKeys.unsplash = process.env.UNSPLASH_ACCESS_KEY;
    this.settings.acmurl.username = process.env.ACMURL_USERNAME;
    this.settings.acmurl.password = process.env.ACMURL_PASSWORD;
    this.settings.portalAPI.username =
      process.env.MEMBERSHIP_PORTAL_API_USERNAME;
    this.settings.portalAPI.password =
      process.env.MEMBERSHIP_PORTAL_API_PASSWORD;
    this.settings.discordGuildIDs = JSON.parse(
      process.env.DISCORD_GUILD_IDS
    ) as Array<string>;
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
