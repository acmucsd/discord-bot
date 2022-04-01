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
 * April Fools' 2022 Command.
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
  public static async generatePingIcon(guild: string, count: number): Promise<string> {
    // We'll crop our number for the image generation. If higher
    // than 10000, we'll stop.
    const pingText = count > 9999 ? '9999+' : count.toString();

    // Let's get started with the basics. First we'll import our image.
    let image = ImageMagick(`guild_pics/${guild}.png`);

    // Depending on the number of pings we currently have to do, we'll want
    // to have a smaller or bigger red "pill" to hold the number, so we'll
    // check the number of digits here and add the pill to the icon here.
    //
    // Note that ALL of the draw values are hardcoded; we could programatically
    // calculate how big the text should be to fit the circle, but this is a one-off,
    // it's good enough as it is.
    //
    // As an experiment, perhaps this can be a "to-do" thing.
    switch (pingText.length) {
      case 1:
        // 1-digit number of pings. Just use a circle.
        // These are ImageMagick primitives, we'll explain one-by-one.
        // First get the fill and stroke set up for the pill itself.
        // Red fill...
        image = image.fill('#EF4747')
          // Black stroke...
          .stroke('#000000', 35)
          // Then draw the circle via coordinates
          .drawCircle(530, 620, 670, 650)
          .stroke('#FFFFFF', 2)
          .fill('#FFFFFF')
          // Set the font...
          .font('Arial', 245)
          // Then write the text.
          .drawText(461, 707, `${pingText}`);
        break;
      case 2:
        // 2-digit number of pings. Here we need a slightly larger pill,
        // so that needs a round rectangle.
        image = image.fill('#EF4747')
          .stroke('#000000', 30)
          // Only extra argument here is roundness of rectangle corners.
          // Let's just set a high number that looks kind of like the
          // original Discord icon.
          .drawRectangle(365, 495, 705, 750, 80)
          .stroke('#FFFFFF', 2)
          .fill('#FFFFFF')
          .font('Arial', 230)
          .drawText(411, 703, `${pingText}`);
        break;

      case 3:
        // 3-digit number of pings. SLIGHTLY larger pill, we're going to
        // minimize font size more in this case.
        image = image.fill('#EF4747')
          .stroke('#000000', 30)
          .drawRectangle(335, 495, 755, 750, 80)
          .stroke('#FFFFFF', 2)
          .fill('#FFFFFF')
          .font('Arial', 215)
          .drawText(371, 699, `${pingText}`);
        break;

      case 4:
        // 4-digit number of pings. Highest we're gonna go, but we need a
        // bigger pill for this one, too.
        image = image.fill('#EF4747')
          .stroke('#000000', 30)
          .drawRectangle(325, 495, 765, 750, 80)
          .stroke('#FFFFFF', 2)
          .fill('#FFFFFF')
          .font('Arial', 180)
          .drawText(345, 690, `${pingText}`);
        break;

      default:
        // 9999+ case, basically.
        image = image.fill('#EF4747')
          .stroke('#000000', 30)
          .drawRectangle(325, 495, 765, 750, 80)
          .stroke('#FFFFFF', 2)
          .fill('#FFFFFF')
          .font('Arial', 140)
          .drawText(348, 670, `${pingText}`);
        break;
    }

    // Resize and write the image. We need to wrap the callback with a Promise, though.
    return new Promise((resolve, reject) => {
      image.write(`guild_pics/${guild}_ping.png`, (err) => {
        if (err) {
          reject(new Error(`Could not write image with ping on it: ${err}`));
        }
        const imageEncoding = readFileSync(`guild_pics/${guild}_ping.png`, { encoding: 'base64' });
        resolve(imageEncoding);
      });
    });
  }

  public async run(interaction: CommandInteraction): Promise<void> {
    // This command probably takes a minute, so we'll defer for safety.
    await super.defer(interaction);

    // First we need to check whether we need to rate-limit the
    // request. We'll just check if 5 minutes have passed.
    const { guild } = interaction;
    if (guild === null) {
      // Not a guild, we can't change icons.
      await super.edit(interaction, { content: "I can't change icons here, sorry." });
      return;
    }

    const currentGuildID = guild.id;
    const now = DateTime.now();
    const lastCall = this.rateLimit.get(currentGuildID);
    if (lastCall !== undefined) {
      // now - lastCall = ...
      const { minutes } = now.diff(lastCall, ['minutes']).toObject();
      if (minutes !== undefined && minutes < 5) {
        await super.edit(interaction, { content: `That's kinda fast, maybe do it <t:${Math.trunc(lastCall.plus({ minutes: 5 }).toSeconds())}:R>` });
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
        await super.edit(interaction, { content: "Guess this place has no custom icon. Sorry, can't ping." });
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
      const saveFilePromise: Promise<void> = new Promise((resolve, reject) => {
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
              await super.edit(interaction, `Something went wrong. Not sure. *(Error UUID: ${uuid})*`);
              reject(new Error(`Error writing original guild icon to disk: ${err}`));
            }
            resolve();
          });
      });

      await saveFilePromise;
    } else if (pingCount > 10000) {
      await super.edit(interaction, { content: "Y'all have pinged enough 👀" });
      return;
    }

    // Up the ping count.
    this.pingCount.set(currentGuildID, pingCount !== undefined ? pingCount + 1 : 1);
    const newPingCount = this.pingCount.get(currentGuildID) as number;

    // Now we have the image, we can now generate it.
    // Just call our other function as well. Make it easy on ourselves.
    const newIcon = await Everyone.generatePingIcon(currentGuildID, newPingCount);
    const newIconBuffer = Buffer.from(newIcon, 'base64');

    // Set the new icon!
    const fullGuild = await guild.fetch();
    fullGuild.setIcon(newIconBuffer, "April Fools' Prank");

    // Ping the person letting them know they've changed the icon.
    await super.edit(interaction, { content: '🤨' });
  }
}
