import { BotSettings } from '../types';

export default {
  apiKeys: {},
  acmurl: {},
  portalAPI: {},
  presence: {
    activity: {
      name: 'ACM Store Demo',
      type: 'PLAYING',
    },
  },
  prefix: '!',
  paths: {
    commands: 'src/commands',
    events: 'src/events',
  },
} as BotSettings;
