import {
  Client,
  TextChannel,
  DMChannel,
  PermissionString,
  PresenceData,
  ClientOptions,
  MessageEmbed,
  Collection,
  NewsChannel,
  MessageAttachment,
} from 'discord.js';
import Command from '../../Command';

export interface CommandOptions {
    name: string;
    enabled: boolean;
    boardRequired?: boolean;
    description?: string;
    usage?: string;
    category?: string;
    requiredPermissions: PermissionString[];
}

export interface LoggableError extends Error {
    uuid: string;
}

export interface BotSettings {
    acmurl: {
        username: string;
        password: string;
    }
    apiKeys: {
        catAPI?: string;
        unsplash?: string;
    }
    presence: PresenceData;
    clientOptions?: ClientOptions;
    maintainerID?: string;
    token?: string;
    prefix: string;
    paths: {
        commands: string;
        events: string;
    };
}

export interface BotClient extends Client {
    settings: BotSettings;
    commands: Collection<string, Command>;
}

export interface BotEvent {
    run(args?: any): void;
}

export type UUIDv4 = string;
export type AnyChannel = TextChannel | DMChannel | NewsChannel;
export type EmbedOrMessage = MessageEmbed | MessageAttachment | string;
