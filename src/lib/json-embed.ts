/**
 * The handshake between a JSON response and the viewer framed over it.
 *
 * The viewer is an extension page, so it has the extension's APIs and theme
 * and none of the page's CSS. It cannot read the page, though, and the page
 * cannot know when the frame's module has loaded -- so the frame says it is
 * ready, and the content script answers with the document.
 *
 * The answer is posted to the extension's origin only. The ready message
 * carries nothing, so it may go to any parent.
 */

export const JSON_VIEWER_READY = "web-developer-json-viewer-ready";
export const JSON_VIEWER_DOCUMENT = "web-developer-json-viewer-document";

export interface JsonViewerDocument {
  type: typeof JSON_VIEWER_DOCUMENT;
  text: string;
  url: string;
}

export function isJsonViewerDocument(data: unknown): data is JsonViewerDocument {
  return (
    typeof data === "object" &&
    data !== null &&
    (data as { type?: unknown }).type === JSON_VIEWER_DOCUMENT &&
    typeof (data as { text?: unknown }).text === "string"
  );
}

export function isJsonViewerReady(data: unknown): boolean {
  return (
    typeof data === "object" &&
    data !== null &&
    (data as { type?: unknown }).type === JSON_VIEWER_READY
  );
}
