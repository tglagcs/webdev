/**
 * Fetching the files a report lists.
 *
 * The View CSS and View JavaScript reports are given a list of URLs and have
 * to show the contents of each. The contract is upstream's and the call sites
 * depend on it: each request object is **mutated** with a `content` field, and
 * the callback runs once, after the last one has finished. A failure is not an
 * error -- the error message goes in as the content, so the report shows a
 * commented-out placeholder in place of the file.
 */

/** Ten seconds, as upstream's `WebDeveloper.Common.requestTimeout`. */
const REQUEST_TIMEOUT = 10000;

export interface URLContentRequest {
  url: string;
  content?: string;
  [key: string]: unknown;
}

/**
 * A URL the extension has no business fetching.
 *
 * `wyciwyg://` is Firefox's scheme for a document written by document.write --
 * there is nothing at the other end to fetch.
 */
function isFetchable(url: string): boolean {
  return !url.startsWith("wyciwyg://");
}

export function getURLContents(
  urlContentRequests: URLContentRequest[],
  errorMessage: string,
  callback: () => void,
): void {
  let remaining = urlContentRequests.length;

  // Upstream never called back for an empty list, and neither does this: the
  // reports build their page from the same array they passed in.
  const complete = (request: URLContentRequest, content: string): void => {
    request.content = content;

    remaining--;

    if (remaining === 0) {
      callback();
    }
  };

  for (const request of urlContentRequests) {
    // Skipped rather than failed, and it never completes -- so a list of only
    // these leaves the callback unfired, which is upstream's behaviour too.
    if (!isFetchable(request.url)) {
      continue;
    }

    fetch(request.url, { signal: AbortSignal.timeout(REQUEST_TIMEOUT) })
      .then((response) => response.text())
      .then((text) => complete(request, text))
      // Timeout, network failure and a cross-origin refusal all land here, and
      // all mean the same thing to the report: show the placeholder.
      .catch(() => complete(request, errorMessage));
  }
}
