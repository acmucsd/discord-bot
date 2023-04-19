import { SlashCommandBuilder } from '@discordjs/builders';
import {
  CommandInteraction,
  GuildMember,
  TextChannel,
  Permissions,
  MessageActionRow,
  MessageButton,
  Message,
} from 'discord.js';
import Command from '../Command';
import { BotClient } from '../types';

/**
 * Matches together users with a special role in groups of 2 or 3 in a Guild private thread.
 * This allows members to meet each other one-to-one and helps increase member engagement.
 */
export default class Match extends Command {
  constructor(client: BotClient) {
    const definition = new SlashCommandBuilder().setName('match').setDescription('Triggers matching for donuts!');

    super(
      client,
      {
        name: 'match',
        enabled: true,
        description: 'Triggers matching for donuts!',
        category: 'Information',
        usage: client.settings.prefix.concat('match'),
        requiredPermissions: ['SEND_MESSAGES'],
      },
      definition
    );
  }

  /**
   * Takes an array of members and returns a new array of the members shuffled in random order.
   */
  private static shuffle(array: GuildMember[]): GuildMember[] {
    let currentIndex = array.length;
    let randomIndex;

    const shuffledArray = array;

    // While there remain elements to shuffle...
    while (currentIndex !== 0) {
      // Pick a remaining element.
      randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex -= 1;

      // And swap it with the current element.
      const swap = shuffledArray[currentIndex];
      shuffledArray[currentIndex] = shuffledArray[randomIndex];
      shuffledArray[randomIndex] = swap;
    }
    return shuffledArray;
  }

  /**
   * This function gets all members with the associated role, pairs them up in groups of 2 or 3,
   * creates a private guild thread for them to communicate, and sends a introduction message in the thread.
   * @param interaction The original command interaction (calling the /match command)
   */
  private async createMatches(interaction: CommandInteraction): Promise<void> {
    // This is a collection mapping role IDs to Role objects.
    const roleMap = await interaction.guild?.roles.fetch();
    await interaction.guild?.members.fetch();
    if (roleMap) {
      // We get the role that we want to use when picking members to match.
      const role = await roleMap.get(this.client.settings.matchRoleID);
      if (role) {
        // Next, we get the list of members that have the given row.
        const memberList = role.members.map(user => user);
        // Now, we make the pairings for Donuts members.
        if (memberList) {
          const shuffledMembersList = Match.shuffle(memberList);
          const memberPairings = [];

          while (shuffledMembersList.length > 0) {
            let pairedMembers: GuildMember[];
            if (shuffledMembersList.length % 2 === 1) {
              // If there's an odd number of people, we start with a group of 3 to correct it.
              pairedMembers = shuffledMembersList.splice(0, 3);
            } else {
              pairedMembers = shuffledMembersList.splice(0, 2);
            }
            memberPairings.push(pairedMembers);
          }

          /**
           * To prevent ourselves from hitting Discord's API rate limit (50 requests/second),
           * we add a small delay between each creation of a group thread and execute them
           * one at a time. This is why we use the more inefficient for ... of and await in loops.
           */
          /* eslint-disable no-await-in-loop */
          // eslint-disable-next-line no-restricted-syntax
          for (const group of memberPairings) {
            const groupAsString = group.map(member => member.toString()).join(', ');
            const memberTagsAsString = group.map(member => member.displayName).join(', ');
            const channel = interaction.channel as TextChannel;
            const thread = await channel.threads.create({
              name: `Donuts - ${memberTagsAsString}`,
              autoArchiveDuration: 10080, // The thread will last 1 week without inactivity before disappearing.
              type: 'GUILD_PRIVATE_THREAD',
              reason: `Donuts matching for ${memberTagsAsString}`,
            });
            group.forEach(member => {
              thread.members.add(member);
            });
            await thread.send(
              `# :wave: Hello ${groupAsString} – time to meet up for donuts!\n## I'm here to help you get to know your teammates by pairing everyone up every week.\n## Why don't you all pick a time to meet and hang out?`
            );
            // Wait 200 ms before executing the next set of memberPairings.
            await setTimeout(() => {}, 200);
          }
          /* eslint-enable no-await-in-loop */
        }
      }
    }
  }

  public async run(interaction: CommandInteraction): Promise<void> {
    await super.defer(interaction, true);
    // We only allow members with Administrator permissions to run this command since it pings a lot of users.
    if (!interaction.memberPermissions?.has(Permissions.FLAGS.ADMINISTRATOR)) {
      await super.edit(interaction, {
        content: 'You need to be an administrator to run this command!',
        ephemeral: true,
      });
      return;
    }

    // Next, we add a confirmation button to make sure the command isn't being run by accident.
    const row = new MessageActionRow().addComponents(
      new MessageButton().setCustomId('Confirm').setLabel('Confirm').setStyle('PRIMARY')
    );
    const message = (await interaction.editReply({
      content: 'Are you sure you want to run this command?',
      components: [row],
    })) as Message;

    // When the "Confirm" button is pressed, we can begin matching members.
    message
      .awaitMessageComponent({ componentType: 'BUTTON', time: 15000 })
      .then(async buttonInteraction => {
        // buttonInteraction is the interaction associated with pressing the button.
        await buttonInteraction.deferReply({ ephemeral: true });
        await buttonInteraction.editReply({ content: 'Matching members!' });
        // Remove the button so they can't press it again.
        await super.edit(interaction, { components: [] });
        await this.createMatches(interaction);
        await buttonInteraction.editReply({ content: 'Members successfully matched!' });
      })
      .catch(async () => {
        // This occurs when the max timeout on awaitMessageComponent is hit.
        // We now remove the button so it can't be pressed.
        await super.edit(interaction, { content: 'This command expired!', components: [] });
      });
  }
}
