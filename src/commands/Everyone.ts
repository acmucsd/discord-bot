import { SlashCommandBuilder } from '@discordjs/builders';
import { CommandInteraction } from 'discord.js';
import { DateTime } from 'luxon';
import stream from 'stream';
import got from 'got';
import { v4 as newUUID } from 'uuid';
import gm from 'gm';
import {
  createWriteStream, existsSync, mkdirSync, readFileSync,
} from 'fs';
import { promisify } from 'util';
import Command from '../Command';
import { BotClient } from '../types';
import Logger from '../utils/Logger';

// // GM is an OLD library, we'll have to include it like this.
// // This is an April Fool's prank, so I won't look for a better one.
// const gm = require('gm').subClass({ imageMagick: true });

// For later usage when downloading files.
const pipeline = promisify(stream.pipeline);

// For changing pictures.
const ImageMagick = gm.subClass({ imageMagick: true });

/**
 * April Fool's 2022 Command.
 *
 * This Command changes the guild icon to the exact same one, but one
 * that looks like everyone got pinged. However, the more this Command
 * is called, the more the number increases for the number of pings.
 *
 * This Command can only be called every 5 minutes per guild.
 */
export default class Everyone extends Command {
  /**
   * The rate limit state for the Command.
   *
   * Key is the Guild ID, value is the time at which we can
   * change the guild icon again (5 minutes in the future from last
   * successful Command call).
   *
   * Each Guild gets one for every Command call in the guild, 5 minutes
   * in the future from the current call.
   */
  private rateLimit: Map<string, DateTime>;

  /**
   * The number of Command calls a particular guild has gone through.
   * Undefined if none have happened.
   */
  private pingCount: Map<string, number>;

  constructor(client: BotClient) {
    const definition = new SlashCommandBuilder()
      .setName('everyone')
      .setDescription('Ping everyone.');

    super(client, {
      name: 'everyone',
      enabled: true,
      description: 'Ping everyone.',
      category: 'Jokes',
      usage: client.settings.prefix.concat('everyone'),
      requiredPermissions: ['SEND_MESSAGES'],
    }, definition);

    this.rateLimit = new Map<string, DateTime>();
    this.pingCount = new Map<string, number>();
  }

  /**
   * Generates a Base64-encoded version of a guild icon for Discord
   * with a ping count on it.
   *
   * Supports any positive non-zero integer for the ping count.
   * Any number higher than 9999 is clipped to "9999+" in the final picture.
   *
   * @param guild The guild ID. The guild icon must be downloaded before running this command.
   * @param count The ping count to put on the image.
   */
  public static generatePingIcon(guild: string, count: number): string {
    // We'll crop our number for the image generation. If higher
    // than 10000, we'll stop.
    const pingText = count > 9999 ? '9999+' : count.toString();

    // Let's get started with the basics. First we'll import our image.
    let image = ImageMagick(`guild_pics/${guild}.png`);

    // Depending on the number of pings we currently have to do, we'll want
    // to have a smaller or bigger red "pill" to hold the number, so we'll
    // check the length here and execute those changes here.
    switch (pingText.length) {
      case 1:
        // 1-digit number of pings. Just use a circle.
        image = image.fill('#EF4747')
          .stroke('#000000', 20)
          .drawCircle(600, 600, 600, 500)
          .stroke('#FFFFFF', 2)
          .fill('#FFFFFF')
          .font('Arial', 150)
          .drawText(555, 653, `${pingText}`);
        break;
      case 2:
        // 2-digit number of pings. Here we need a slightly larger pill,
        // so that needs a round rectangle.
        image = image.fill('#EF4747')
          .stroke('#000000', 20)
          .drawRectangle(490, 525, 710, 685, 80)
          .stroke('#FFFFFF', 2)
          .fill('#FFFFFF')
          .font('Arial', 125)
          .drawText(530, 648, `${pingText}`);
        break;

      case 3:
        // 3-digit number of pings. SLIGHTLY larger pill, we're going to
        // minimize font size more in this case.
        image = image.fill('#EF4747')
          .stroke('#000000', 20)
          .drawRectangle(485, 520, 715, 690, 80)
          .stroke('#FFFFFF', 2)
          .fill('#FFFFFF')
          .font('Arial', 105)
          .drawText(512, 641, `${pingText}`);
        break;

      case 4:
        // 4-digit number of pings. Highest we're gonna go, but we need a
        // bigger pill for this one, too.
        image = image.fill('#EF4747')
          .stroke('#000000', 20)
          .drawRectangle(440, 520, 730, 690, 80)
          .stroke('#FFFFFF', 2)
          .fill('#FFFFFF')
          .font('Arial', 100)
          .drawText(475, 641, `${pingText}`);
        break;

      default:
        // 9999+ case, basically.
        image = image.fill('#EF4747')
          .stroke('#000000', 20)
          .drawRectangle(420, 520, 730, 690, 80)
          .stroke('#FFFFFF', 2)
          .fill('#FFFFFF')
          .font('Arial', 95)
          .drawText(445, 640, `${pingText}`);
        break;
    }

    // Process and write the image
    image.write(`guild_pics/${guild}_ping.png`, async (err) => {
      if (err) {
        throw new Error(`Could not write image with ping on it: ${err}`);
      }
    });

    // Get the Base64 encoded version of the image.
    const imageEncoding = readFileSync(`guild_pics/${guild}_ping.png`, { encoding: 'base64' });
    return imageEncoding;
  }

  public async run(interaction: CommandInteraction): Promise<void> {
    // This command probably takes a minute, so we'll defer for safety.
    await super.defer(interaction);

    // First we need to check whether we need to rate-limit the
    // request. We'll just check if 5 minutes have passed.
    const { guild } = interaction;
    if (guild === null) {
      // Not a guild, we can't change icons.
      await super.respond(interaction, { content: "I can't change icons here, sorry." });
      return;
    }

    const currentGuildID = guild.id;
    const now = DateTime.now();
    const lastCall = this.rateLimit.get(currentGuildID);
    if (lastCall !== undefined) {
      // now - lastCall = ...
      const { minutes } = now.diff(lastCall, ['minutes']).toObject();
      if (minutes !== undefined && minutes < 5) {
        await super.respond(interaction, { content: "Just give it a few minutes; we don't want too many pings." });
        return;
      }
    }

    // Set the new rate limit.
    this.rateLimit.set(currentGuildID, DateTime.now());

    // Now we can change icons! First, we'll check whether
    // we've modified a icon previously. If we didn't, we'll want
    // to save the current icon for preservation and more
    // ping calls.
    //
    // Also check to make sure we haven't reached a number higher than 10000. If we have
    // we're done with changing icons, so we can just send a response acknowledging we're done
    // with changing icons.
    const pingCount = this.pingCount.get(currentGuildID);
    if (pingCount === undefined) {
      const iconURL = guild.iconURL();
      if (iconURL === null) {
        await super.respond(interaction, { content: "Guess this place has no custom icon. Sorry, can't ping." });
        return;
      }

      // Make sure guild icon directory exists.
      if (!existsSync('guild_pics')) {
        mkdirSync('guild_pics');
      }

      // Get the guild icon, save it.
      await pipeline(
        got.stream(iconURL),
        createWriteStream(`guild_pics/${currentGuildID}.png`),
      );

      // We'll also want to resize the icon once we're done,
      // since our future ImageMagick finagling won't work without it.
      let goodSave = true;
      ImageMagick(`guild_pics/${currentGuildID}.png`)
        .resize(800, 800)
        .write(`guild_pics/${currentGuildID}.png`, async (err) => {
          if (err) {
            const uuid = newUUID();
            Logger.error('Could not save resized guild icon!', {
              eventType: 'interfaceError',
              interface: 'GM',
              uuid,
            });
            await super.respond(interaction, `Something went wrong. Not sure. *(Error UUID: ${uuid})*`);
            goodSave = false;
          }
        });
      if (!goodSave) {
        return;
      }
    } else if (pingCount > 10000) {
      await super.respond(interaction, { content: "Y'all have pinged enough 👀" });
      return;
    }

    // Up the ping count.
    this.pingCount.set(currentGuildID, pingCount !== undefined ? pingCount + 1 : 1);
    const newPingCount = this.pingCount.get(currentGuildID) as number;

    // Now we have the image, we can now generate it.
    // Just call our other function as well. Make it easy on ourselves.
    const newIcon = Everyone.generatePingIcon(currentGuildID, newPingCount);

    // Set the new icon!
    const fullGuild = await guild.fetch();
    fullGuild.setIcon(newIcon, "April Fool's Prank");

    // Ping the person letting them know they've changed the icon.
    await super.respond(interaction, { content: '🤨' });
  }
}
