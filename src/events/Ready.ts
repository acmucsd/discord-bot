import Logger from '../utils/Logger';
import { BotClient, BotEvent } from '../types';

export default class Ready implements BotEvent {
  private client: BotClient;

  constructor(client: BotClient) {
    this.client = client;
  }

  public async run(): Promise<void> {
    if (this.client.user) {
      Logger.info(`${this.client.user.username} now ready!`, {
        eventType: 'ready',
      });
      await this.client.user.setPresence(this.client.settings.presence);
    }
  }
}
