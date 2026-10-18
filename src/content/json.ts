/**
 * JSON responses: recognising one, and framing the viewer over it.
 *
 * A browser shows a JSON response as a document whose body is a `<pre>` of
 * the text -- Chrome adds a "pretty print" checkbox beside it. That shape plus
 * a JSON content type is what is recognised, and nothing looser: replacing a
 * page that only looked like JSON would be far worse than leaving one alone.
 *
 * Firefox has its own viewer, which takes the document over before any
 * content script runs and has no such `<pre>`. So on Firefox this finds
 * nothing unless `devtools.jsonview.enabled` is off, and then it finds the
 * plain-text document Firefox shows instead.
 */

import { JSON_VIEWER_DOCUMENT, isJsonViewerReady, type JsonViewerDocument } from "@/lib/json-embed";
import { isJsonContentType } from "@/lib/json-view";
import { getOr } from "@/lib/storage/settings";

const FRAME_ID = "web-developer-json-viewer";
const STYLE_ID = "web-developer-json-viewer-style";

function responsePre(): HTMLPreElement | null {
  return document.body?.querySelector<HTMLPreElement>(":scope > pre") ?? null;
}

/** The text of a JSON response, or null if this document is not one. */
export function jsonResponseText(): string | null {
  if (!isJsonContentType(document.contentType)) {
    return null;
  }

  return responsePre()?.textContent ?? null;
}

/**
 * What View JSON is given: a JSON response as above, or a plain-text document,
 * which is how a `.json` file served as text/plain arrives. Anything else is
 * no document at all, and the viewer asks for a paste instead.
 */
export function getJson(): { url: string; text: string | null } {
  const text =
    jsonResponseText() ??
    (document.contentType === "text/plain" ? responsePre()?.textContent : null);

  return { url: location.href, text: text ?? null };
}

/**
 * Frames the viewer over a JSON response, unless the user has switched that
 * off.
 *
 * The original stays in the document, hidden: the viewer's Raw tab shows the
 * same text, and Save Page or View Source still see the real response.
 */
export async function mountJsonViewer(): Promise<void> {
  const text = jsonResponseText();

  if (text === null || document.getElementById(FRAME_ID)) {
    return;
  }

  if (!(await getOr("json_viewer_auto", true))) {
    return;
  }

  const style = document.createElement("style");

  style.id = STYLE_ID;
  style.textContent = `
    html, body { margin: 0 !important; overflow: hidden !important; }
    body > :not(#${FRAME_ID}) { display: none !important; }
    #${FRAME_ID} {
      border: 0 !important; display: block !important; height: 100vh !important;
      inset: 0 !important; position: fixed !important; width: 100vw !important;
      z-index: 2147483647 !important;
    }
  `;

  const frame = document.createElement("iframe");

  frame.id = FRAME_ID;
  // Without it the async clipboard is refused inside the frame, and Copy
  // falls back to execCommand.
  frame.allow = "clipboard-write";
  frame.src = `${browser.runtime.getURL("/json-viewer.html")}?embed`;

  // The extension's origin, spelled from its base URL rather than through
  // URL.origin, which is "null" for a moz-extension: address.
  const origin = browser.runtime.getURL("/").replace(/\/$/, "");

  window.addEventListener("message", (event) => {
    if (event.source !== frame.contentWindow || !isJsonViewerReady(event.data)) {
      return;
    }

    const message: JsonViewerDocument = { type: JSON_VIEWER_DOCUMENT, text, url: location.href };

    frame.contentWindow?.postMessage(message, origin);
  });

  (document.head ?? document.documentElement).append(style);
  document.body.append(frame);
}
