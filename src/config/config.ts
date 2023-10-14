import { GatewayIntentBits } from 'discord-api-types';
import { BotSettings } from '../types';

export default {
  apiKeys: {},
  acmurl: {
    username: '',
    password: '',
  },
  clientID: '',
  clientOptions: {
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildIntegrations,
      GatewayIntentBits.GuildWebhooks,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.DirectMessages,
      GatewayIntentBits.GuildMessageReactions,
      GatewayIntentBits.DirectMessageReactions,
    ],
  },
  portalAPI: {
    url: '',
    username: '',
    password: '',
  },
  presence: {
    activities: [
      {
        type: 'WATCHING',
        name: 'acmurl.com/poggers',
      },
    ],
    status: 'online',
  },
  token: '',
  prefix: '!',
  paths: {
    commands: 'src/commands',
    events: 'src/events',
  },
  discordGuildIDs: [],
  matchRoleID: '',
} as BotSettings;
