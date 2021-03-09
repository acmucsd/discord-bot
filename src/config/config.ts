import { BotSettings } from '../types';

export const settings: BotSettings = {
    presence: {
        activity: {
            name: 'ACM Store Demo',
            type: 'PLAYING'
        }
    },
    prefix: '!',
    paths: {
        commands: 'src/commands',
        events: 'src/events'
    }
};
