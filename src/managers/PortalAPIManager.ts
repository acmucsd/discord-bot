import { Service } from 'typedi';
import got from 'got';
import schedule from 'node-schedule';
import { decode } from 'jsonwebtoken';
import { DateTime } from 'luxon';
import { BotClient } from '../types';
import Logger from '../utils/Logger';

/**
 * PortalAPIManager manages any necessary maintenance of Portal API credentials, tokens,
 * additional meta checks that involve maintaining the checks necessary to allow for calling
 * any routes to the Membership Portal in any other method.
 */
@Service()
export default class {
  /**
   * The API token for the admin account from the Membership Portal.
   *
   */
  public apiToken: string = '';

  /**
   * The cronjob maintaining the API token refreshed.
   */
  public apiTokenRefreshJob!: schedule.Job;

  /**
   * Initialize the procedures involved to handle API token refreshing.
   * @param client The original client, for access to the configuration.
   */
  public initializeTokenHandling(client: BotClient): void {
    this.loginPortal(client).then();
    this.apiTokenRefreshJob = schedule.scheduleJob('0 * * * *', () => {
      Logger.info('Checking Membership Portal API token validity.');
      if (!this.tokenValid()) {
        Logger.info('Membership Portal API token no longer valid! Refreshing.', {
          eventType: 'manager',
          manager: 'portalAPI',
        });
        this.loginPortal(client).then();
      }
    });
  }

  /**
   * Logs in to the portal, saving the provided JWT token into the class variable.
   * @private
   */
  public async loginPortal(client: BotClient): Promise<void> {
    const portalAPIResponse = (await got
      .post(`${client.settings.portalAPI.url}/auth/login`, {
        headers: {
          'Content-Type': 'application/json',
        },
        json: {
          email: client.settings.portalAPI.username,
          password: client.settings.portalAPI.password,
        },
      })
      .json()) as any;

    if (portalAPIResponse.error !== null) {
      throw new Error(portalAPIResponse.error);
    }
    this.apiToken = portalAPIResponse.token;
  }

  /**
   * Checks whether the currently saved JWT token is still valid. Checked by ensuring
   * expiry time is further in the future than our current time. No checks for issuing
   * time currently, as we're only getting token directly from the portal API.
   * @private
   */
  public tokenValid(): boolean {
    const payload = decode(this.apiToken);
    if (payload === null) {
      throw new Error('JWT payload for portal API empty!');
    } else if (typeof payload === 'string' || !payload.exp) {
      throw new Error('JWT payload for portal API does not contain expiry date!');
    }
    const expiryEpochSeconds: number = payload.exp;
    const expiryDate = DateTime.fromSeconds(expiryEpochSeconds);
    const currentTime = DateTime.now();
    return expiryDate > currentTime;
  }
}
