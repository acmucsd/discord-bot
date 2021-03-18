/**
 * Checks whether provided string is an URL.
 * Taken straight from Stack Overflow. Check it out at https://stackoverflow.com/a/43467144.
 * @param string The string to check for valid URL on.
 * @returns boolean Whether the string is a valid URL or not.
 */
export function validURL(string: string) {
  let url;

  try {
    url = new URL(string);
  } catch (_) {
    return false;
  }

  return url.protocol === 'http:' || url.protocol === 'https:';
}

/**
 * Checks whether the provided string contains a Number.
 * Useful for argument parsing passed in as strings. Use this to check before converting
 * strings to integers.
 *
 * @param string The string to check a number for.
 */
export function validNumber(string: string) {
  return /^\d+$/.test(string);
}
