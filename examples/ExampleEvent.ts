import Logger from '../utils/Logger';
import { BotClient, BotEvent } from '../types';

/**
 * An Example Event.
 */
export default class ExampleEvent implements BotEvent {
  private client: BotClient;

  constructor(client: BotClient) {
    this.client = client;
  }

  public async run(): Promise<void> {
      // do nothing.
  }
}
