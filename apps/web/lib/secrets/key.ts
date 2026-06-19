/** Valid environment-variable name: letters, digits, underscores; no leading digit. */
const ENV_KEY_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;

export function isValidEnvKey(key: string): boolean {
  return ENV_KEY_PATTERN.test(key);
}
