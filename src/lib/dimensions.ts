/**
 * The "Width = 120px Height = 80px" label.
 *
 * Shared by Display Image Dimensions and Display Div Dimensions, which is why
 * it does not live in either. The labels are localised, so the caller passes
 * them in rather than this reaching for the catalogue -- the injected bundles
 * are handed pre-resolved strings by the popup.
 */

export interface DimensionsLocale {
  width: string;
  height: string;
}

/** An element with neither dimension gets no label at all. */
export function formatDimensions(width: number, height: number, locale: DimensionsLocale): string {
  if (width && height) {
    return `${locale.width} = ${width}px ${locale.height} = ${height}px`;
  }

  if (width) {
    return `${locale.width} = ${width}px`;
  }

  if (height) {
    return `${locale.height} = ${height}px`;
  }

  return "";
}
