/**
 * Checks whether provided string is an URL.
 * Taken straight from Stack Overflow. Check it out at https://stackoverflow.com/a/43467144.
 * @param string The string to check for valid URL on.
 * @returns boolean Whether the string is a valid URL or not.
 */
export default (string: string) => {
  let url;

  try {
    url = new URL(string);
  } catch (_) {
    return false;
  }

  return url.protocol === 'http:' || url.protocol === 'https:';
};
