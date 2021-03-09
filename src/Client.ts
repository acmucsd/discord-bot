import { Collection, Client as DiscordClient } from 'discord.js';
import { Service } from 'typedi';
import { Logger } from './utils/Logger';
import { BotSettings, BotClient } from './types';
import { Command } from './Command';
import { ActionManager } from './managers/ActionManager';
import { settings as configuration } from './config/config';

@Service()
export class Client extends DiscordClient implements BotClient {
    public settings: BotSettings;

    constructor(private actionManager: ActionManager) {
        super(configuration.clientOptions || {});
        this.settings = configuration;
        this.settings.token = process.env.BOT_TOKEN;
        // optional "!" required here because Discord.js doesn't let you make this mandatory,
        // so we need the "name" to be an optional assignment.
        this.settings.presence.activity!.name = process.env.BOT_ACTIVITY;
        this.settings.maintainerID = process.env.MAINTAINER_USER_ID;
        this.initialize();
    }

    private async initialize(): Promise<void> {
        try {
            this.actionManager.initializeCommands(this);
            this.actionManager.initializeEvents(this);
            await this.login(configuration.token);
        } catch (e) {
            Logger.error(`Could not initialize bot: ${e}`);
        }
    }

    public get commands(): Collection<string, Command> {
        return this.actionManager.commands;
    }
}
