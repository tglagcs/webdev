/**
 * Links, meta tags, and the small details reports about the page itself.
 */

import { getContentDocument, getContentWindow } from "@/lib/dom/documents";
import { perDocument, sortedUnique, type Report } from "./report";

export function getLinks(): Report<{ url: string; links: string[] }> {
  return perDocument((contentDocument) => ({
    // `document.links` is <a href> and <area href> only, which is what the
    // report means by a link -- not every element with an href.
    links: sortedUnique(Array.from(contentDocument.links, (link) => link.href)),
  }));
}

export interface MetaTag {
  name?: string;
  content?: string;
}

/** Case-insensitive, by name then content. */
export function sortMetaTags(one: MetaTag, two: MetaTag): number {
  const oneName = one.name?.toLowerCase();
  const twoName = two.name?.toLowerCase();
  const oneContent = one.content?.toLowerCase();
  const twoContent = two.content?.toLowerCase();

  if (oneName === twoName && oneContent === twoContent) {
    return 0;
  }

  const earlier = oneName! < twoName! || (oneName === twoName && oneContent! < twoContent!);

  return earlier ? -1 : 1;
}

/**
 * The four ways a meta tag names itself, in the order upstream tests them.
 * A tag matching none of them is still reported, as an empty entry.
 */
function describeMetaTag(metaTag: Element): MetaTag {
  if (metaTag.hasAttribute("name")) {
    return { name: metaTag.getAttribute("name")!, content: metaTag.getAttribute("content")! };
  }

  if (metaTag.hasAttribute("charset")) {
    return { name: "charset", content: metaTag.getAttribute("charset")! };
  }

  if (metaTag.hasAttribute("http-equiv")) {
    return { name: metaTag.getAttribute("http-equiv")!, content: metaTag.getAttribute("content")! };
  }

  if (metaTag.hasAttribute("property")) {
    return { name: metaTag.getAttribute("property")!, content: metaTag.getAttribute("content")! };
  }

  return {};
}

export function getMetaTags(): Report<{ url: string; metaTags: MetaTag[] }> {
  return perDocument((contentDocument) => ({
    metaTags: Array.from(contentDocument.getElementsByTagName("meta"), describeMetaTag).sort(
      sortMetaTags,
    ),
  }));
}

export function getDocumentDetails(): { pageTitle: string; pageURL: string } {
  const contentDocument = getContentDocument();

  return { pageTitle: contentDocument.title, pageURL: contentDocument.documentURI };
}

export function getLocationDetails(): { host: string; path: string } {
  const location = getContentWindow().location;

  return { host: location.hostname, path: location.pathname };
}

export function getWindowSize(): {
  innerHeight: number;
  innerWidth: number;
  outerHeight: number;
  outerWidth: number;
} {
  return {
    innerHeight: window.innerHeight,
    innerWidth: window.innerWidth,
    outerHeight: window.outerHeight,
    outerWidth: window.outerWidth,
  };
}
