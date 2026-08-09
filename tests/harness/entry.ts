/**
 * Exposes the extractors on the page for the real-engine harness.
 *
 * See tools/extractor-harness.py. Only the extractors whose behaviour a
 * headless DOM cannot reproduce are here; everything else is covered by the
 * golden snapshots in tests/content-extractors.test.ts.
 */

export { getColors, getDocumentColors } from "@/content/colors";
export { getCSS, getDocumentCSS } from "@/content/resources";
export { getDocuments } from "@/content/report";
