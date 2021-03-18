import { DateTime } from 'luxon';
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

/**
 * An Event Model from the Membership Portal API.
 *
 * @see {@link https://documenter.getpostman.com/view/12949536/TVRedVwQ#00ed6877-79b3-4734-8323-911e1790988c Portal API Documentation}
 */
export interface PortalEvent {
 /**
  * UUID of Event in database.
  */
 uuid: UUIDv4;
 /**
  * Organization hosting Event.
  *
  * Typically "ACM".
  */
 organization: string;
 /**
  * Community hosting Event.
  *
  * Any one of "General", "AI", "Cyber", etc. is expected here.
  */
 community: string;
 /**
  * URL to the thumbnail of the Event.
  */
 thumbnail: string;
 /**
  * URL to the cover photo of the Event.
  */
 cover: string;
 /**
  * Title of Event.
  */
 title: string;
 /**
  * Description of Event.
  *
  * Typically marketing pitch.
  */
 description: string;
 /**
  * Location of Event.
  *
  * Discord link, Zoom link, lecture hall, etc.
  */
 location: string;
 /**
  * Link to online Event location.
  */
 eventLink: string;
 /**
  * Checkin code for Event.
  */
 attendanceCode: string;
 /**
  * Start time of Event.
  */
 start: DateTime;
 /**
  * End time of Event.
  */
 end: DateTime;
 /**
  * Points given to Member if checking in to this Event.
  */
 pointValue: string;
 /**
  * Whether the event can only be checked into by Staff.
  */
 requiresStaff: boolean;
 /**
  * Bonus points awarded to any Staff members who check in to an Event.
  */
 staffPointBonus: number;
}
