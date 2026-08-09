/**
 * Reading computed style values across two eras of the CSSOM.
 *
 * `getPropertyCSSValue` returned a typed `CSSPrimitiveValue`; it was removed
 * from Blink and Gecko years ago and `getPropertyValue` returns a plain string
 * instead. Upstream handles both, and so does this: the typed path is kept
 * because dropping it is only safe if no supported engine still takes it, and
 * that is not worth assuming for a behaviour-preserving port. Only the string
 * path is exercised by the tests.
 */

/** The numeric CSSPrimitiveValue constants, with upstream's fallbacks. */
const PRIMITIVE_TYPES = { IDENT: 21, NUMBER: 1, RGBCOLOR: 25, URI: 20 } as const;

type PrimitiveTypeName = keyof typeof PRIMITIVE_TYPES;

interface PrimitiveValue {
  primitiveType?: number;
  getStringValue?(): string;
}

/** A computed value, which is a string on every engine shipping today. */
export type CSSValue = string | PrimitiveValue | null;

export function getCSSPrimitiveValue(type: PrimitiveTypeName): number {
  const global = globalThis as { CSSPrimitiveValue?: Partial<Record<string, number>> };
  const constants = global.CSSPrimitiveValue;

  return constants?.[`CSS_${type}`] ?? PRIMITIVE_TYPES[type];
}

export function getPropertyCSSValue(
  computedStyle: CSSStyleDeclaration | null,
  property: string,
): CSSValue {
  if (!computedStyle) {
    return null;
  }

  const legacy = computedStyle as CSSStyleDeclaration & {
    getPropertyCSSValue?(property: string): PrimitiveValue;
  };

  try {
    // Throws on any current engine, which is the intended path.
    return legacy.getPropertyCSSValue!(property);
  } catch {
    return computedStyle.getPropertyValue(property);
  }
}

/** Matches `url(...)`, with or without quotes, in a computed value string. */
const URI = /(?:\(['|"]?)(.*?)(?:['|"]?\))/;

export function isCSSURI(property: CSSValue): boolean {
  if (!property) {
    return false;
  }

  if (typeof property !== "string" && property.primitiveType) {
    return property.primitiveType === getCSSPrimitiveValue("URI");
  }

  return URI.test(String(property));
}

export function getCSSURI(property: CSSValue): string | null {
  if (!property) {
    return null;
  }

  if (typeof property !== "string" && property.primitiveType) {
    return property.getStringValue!();
  }

  return URI.exec(String(property))?.[1] ?? null;
}

/**
 * The text of a computed value.
 *
 * The old CSSOM returned an object carrying `cssText`; every engine shipping
 * today returns the string itself. Both are handled for the same reason as
 * getPropertyCSSValue above.
 */
export function getCSSText(property: CSSValue): string | null {
  if (!property) {
    return null;
  }

  return (property as { cssText?: string }).cssText ?? String(property);
}
