/**
 * The extension's own console channel.
 *
 * Prefixed so that a message from a feature running inside someone else's page
 * is recognisable in their console, and `warn` rather than `log` so it survives
 * a console filtered to warnings and errors.
 */

export function log(message: string, exception?: unknown): void {
  const consoleMessage = `WEBDEV LOG: ${message}`;

  if (exception) {
    console.warn(consoleMessage, exception);
  } else {
    console.warn(consoleMessage);
  }
}
