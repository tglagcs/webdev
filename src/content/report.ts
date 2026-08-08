/**
 * The shape every extractor returns, and the frame walk behind it.
 *
 * All sixteen reports are `{ pageTitle, pageURL, documents: [...] }`, where
 * each entry carries its own `url` and one collection. Upstream repeated that
 * scaffolding in full at the top of each extractor -- five near-identical
 * statements, thirteen times over -- which is why two of them ended up
 * reporting the top document's title against a subframe's URL.
 */

import { getContentDocument, getContentWindow } from "@/lib/dom/documents";

export interface DocumentEntry {
  url: string;
}

export interface Report<T extends DocumentEntry> {
  pageTitle: string;
  pageURL: string;
  documents: T[];
}

/**
 * Every document reachable from a frame, depth first, the frame's own first.
 *
 * Reading `frame.document` throws for a cross-origin frame. That is the normal
 * case on any page carrying an ad or an embed, not an error, so it is caught
 * and the frame contributes nothing -- which is also the only behaviour the
 * same-origin policy permits.
 */
export function getDocuments(frame: Window | null): Document[] {
  if (!frame) {
    return [];
  }

  const documents: Document[] = [];

  try {
    if (frame.document) {
      documents.push(frame.document);
    }
  } catch {
    // Cross-origin frame; nothing readable here.
  }

  for (let index = 0; index < frame.frames.length; index++) {
    documents.push(...getDocuments(frame.frames[index] ?? null));
  }

  return documents;
}

/** Runs `collect` over every reachable document and wraps the result. */
export function perDocument<T>(
  collect: (contentDocument: Document) => T,
): Report<T & DocumentEntry> {
  const contentDocument = getContentDocument();

  return {
    pageTitle: contentDocument.title,
    pageURL: contentDocument.documentURI,
    documents: getDocuments(getContentWindow()).map((document) => ({
      ...collect(document),
      url: document.documentURI,
    })),
  };
}

/**
 * Sorts, then drops adjacent duplicates. Upstream's idiom, kept because the
 * reports depend on the ordering it produces -- a Set would preserve document
 * order instead and change every anchor, id and link list.
 */
export function sortedUnique<T>(values: T[]): T[] {
  const sorted = [...values].sort();

  return sorted.filter((value, index) => value !== sorted[index + 1]);
}
