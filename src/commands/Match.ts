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
import { DateTime } from 'luxon';
import Command from '../Command';
import { BotClient } from '../types';

/**
 * Matches together users with a special role in groups of 2 or 3 in a Guild private thread.
 * This allows members to meet each other one-to-one and helps increase member engagement.
 */
export default class Match extends Command {
  // Variable storing what time the command was last run. If null, then it hasn't been run yet.
  private lastRun: DateTime | null;

  constructor(client: BotClient) {
    const definition = new SlashCommandBuilder()
      .setName('match')
      .setDescription(
        'Triggers matching for donuts! Threads will be created in the channel where this command is called.'
      );

    super(
      client,
      {
        name: 'match',
        enabled: true,
        description:
          'Triggers matching for donuts! Threads will be created in the channel where this command is called.',
        category: 'Information',
        usage: client.settings.prefix.concat('match'),
        requiredPermissions: ['SEND_MESSAGES'],
      },
      definition
    );

    this.lastRun = null;
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
   * Gets all users with the given role in the current discord server where this command was called.
   * @param interaction The original CommandInteraction from calling the /match command.
   * @returns A list of server users who have the specified 'match' role.
   */
  private async getRoleUsers(interaction: CommandInteraction): Promise<GuildMember[]> {
    // This is a collection mapping role IDs to Role objects.
    const roleMap = await interaction.guild?.roles.fetch();
    await interaction.guild?.members.fetch();
    if (roleMap) {
      // We get the role that we want to use when picking members to match.
      const role = await roleMap.get(this.client.settings.matchRoleID);
      if (role) {
        // Next, we get and return the list of members that have the given role.
        const memberList = role.members.map(user => user);
        return memberList;
      }
    }
    return [];
  }

  /**
   * Given a list of users, createMatches creates private Guild Threads in the channel the command was called,
   * matches 2-3 users in each thread, and sends a brief introduction so they can meet up.
   * @param interaction The original CommandInteraction from calling the /match command.
   * @param users The users to create matches from.
   * @returns The total number of users who were matched.
   */
  private static async createMatches(interaction: CommandInteraction, users: GuildMember[]): Promise<Number> {
    const numMembersMatched = users.length;
    // Now, we make the pairings for Donuts members.
    const shuffledMembersList = Match.shuffle(users);
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
        `# :wave: Hello ${groupAsString} – time to meet up for donuts!\nI'm here to help you get to know your teammates by pairing everyone up every week.\nWhy don't you all pick a time to meet and hang out?`
      );
      // Wait 200 ms before executing the next set of memberPairings.
      await setTimeout(() => {}, 200);
    }
    /* eslint-enable no-await-in-loop */
    return numMembersMatched;
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

    // Next, we add confirmation buttons to make sure the command isn't being run by accident.
    const row = new MessageActionRow().addComponents(
      new MessageButton().setCustomId('Confirm').setLabel('Confirm').setStyle('PRIMARY'),
      new MessageButton().setCustomId('Cancel').setLabel('Cancel').setStyle('DANGER')
    );

    // Our confirmation message will warn the user of how many members will be pinged and when the command was previously run.
    const usersToBeMatched = await this.getRoleUsers(interaction);
    let confirmationMessage = `Are you sure you want to run this command? This will ping **${usersToBeMatched.length}** users on your server.`;
    // We add this section if the command was run previously so users are aware if the command has already been run.
    if (this.lastRun) {
      confirmationMessage += ` Matches were last generated on <t:${Math.trunc(this.lastRun.toSeconds())}:F>`;
    }
    const message = (await interaction.editReply({
      content: confirmationMessage,
      components: [row],
    })) as Message;

    // When the "Confirm" button is pressed, we can begin matching members.
    message
      .awaitMessageComponent({ componentType: 'BUTTON', time: 15000 })
      .then(async buttonInteraction => {
        // buttonInteraction is the interaction associated with pressing the button.
        if (buttonInteraction.customId === 'Cancel') {
          await super.edit(interaction, { content: '/match was canceled!', components: [] });
          return;
        }
        // Otherwise, the 'Confirm' button was called.
        this.lastRun = DateTime.now();
        await buttonInteraction.deferReply();
        await buttonInteraction.editReply({ content: 'Matching members!' });
        // Remove the button so they can't press it again.
        await super.edit(interaction, { components: [] });
        const numMembersMatched = await Match.createMatches(interaction, usersToBeMatched);
        await buttonInteraction.editReply({
          content: `**/match** was called by ${interaction.user}: **${numMembersMatched}** members were successfully matched!`,
        });
      })
      .catch(async () => {
        // This occurs when the max timeout on awaitMessageComponent is hit.
        // We now remove the button so it can't be pressed.
        await super.edit(interaction, { content: 'The call to /match expired!', components: [] });
      });
  }
}
