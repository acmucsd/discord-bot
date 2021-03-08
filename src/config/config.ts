import { BotSettings } from '../types';

export const settings: BotSettings = {
    presence: {
        activity: {
            name: process.env.BOT_ACTIVITY,
            type: 'PLAYING'
        }
    },
    prefix: '!',
    paths: {
        commands: 'src/commands',
        events: 'src/events'
    }
};
