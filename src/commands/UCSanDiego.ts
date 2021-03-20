
import { Message } from 'discord.js';
import Command from '../Command';
import { BotClient } from '../types';

const copypasta: string[] = [
  'Using UC San Diego in place of the UCSD acronym better identifies our campus both',
  'locally and nationally. There’s confusion among San Diego higher education institutions',
  'because of similar acronyms—UCSD, USD, and SDSU—which we eliminate by using UC San Diego.',
  'Additionally, this naming convention is consistent with other campuses in the University of',
  'California system, such as UC Irvine, UC Riverside, UC Santa Barbara, UC Davis, and so on.'
];

/**
 * Command to correct the spelling of UC San Diego
 */
export default class UCSanDiegoCommand extends Command {
  constructor(client: BotClient) {
    super(client, {
      name: 'ucsd',
      enabled: true,
      description: 'Corrects the spelling of our glorious university, UC San Diego.',
      category: 'Meme',
      usage: client.settings.prefix.concat('ucsd'),
      requiredPermissions: ['SEND_MESSAGES'],
    });
  }

  public async run(message: Message): Promise<void> {
      await super.respond(message.channel, copypasta.join(' '));
  }
}
