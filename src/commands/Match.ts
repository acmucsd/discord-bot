import { SlashCommandBuilder } from '@discordjs/builders';
import { CommandInteraction, GuildMember, TextChannel } from 'discord.js';
import Command from '../Command';
import { BotClient } from '../types';

/**
 * Pings the user.
 *
 * Test Command left from the boilerplate.
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

  public async run(interaction: CommandInteraction): Promise<void> {
    await super.defer(interaction);

    // This is a collection mapping role IDs to Role objects.
    const roleMap = await interaction.guild?.roles.fetch();
    await interaction.guild?.members.fetch();
    // await interaction.guild?.members.fetch();
    if (roleMap) {
      // We get the role that we want to use when picking members to match.
      const role = await roleMap.get('1026674051982295131');
      if (role) {
        // Next, we get the list of members that have the given row.
        const memberList = role.members.map(user => user);
        // Now, we make the pairings for Donuts members.
        if (memberList) {
          await interaction.channel?.send('we love donuts...\n');
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
            interaction.channel?.send(JSON.stringify(pairedMembers.map(a => a?.toString())));
          }

          memberPairings.forEach(async group => {
            const groupAsString = group.map(member => member.toString()).join(', ');
            const memberTagsAsString = group.map(member => member.displayName).join(', ');
            const channel = interaction.channel as TextChannel;
            const thread = await channel.threads.create({
              name: `donuts - ${memberTagsAsString}`,
              autoArchiveDuration: 10080, // The thread will last 1 week without inactivity before disappearing.
              type: 'GUILD_PRIVATE_THREAD',
              reason: 'we need donuts',
            });
            group.forEach(member => {
              thread.members.add(member);
            });
            thread.send(
              `# :wave: Hello ${groupAsString} – time to meet up for donuts!\nI'm here to help you get to know your teammates by pairing everyone up every week.\nWhy don't you all pick a time to meet and hang out?`
            );
          });
        }
      }
    }

    await super.edit(interaction, { content: 'Done!', ephemeral: true });
  }
}
