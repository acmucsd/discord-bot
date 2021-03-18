import { UUIDv4 } from '../bot/Bot';

/**
 * A User Model from the Membership Portal API.
 *
 * @see {@link https://documenter.getpostman.com/view/12949536/TVRedVwQ#f408287b-1a88-4a02-8094-fb5af6661b48 Portal API Documentation}
 */
export interface User {
 /**
  * UUID of User in database.
  * Also allows to easily find User's profile page.
  */
 uuid: UUIDv4;
 /**
  * First name of User.
  */
 firstName: string;
 /**
  * Last name of User.
  */
 lastName: string;
 /**
  * URL to the profile picture of the User.
  */
 profilePicture: string;
 /**
  * User's current major.
  */
 major: string;
 /**
  * Bio of User on Membership Portal.
  */
 bio: string;
 /**
  * Total points User has on the portal. Earned through checking in to events and bonus
  * provisions and exceptions.
  */
 points: number;
}
