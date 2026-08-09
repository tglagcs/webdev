/**
 * Where an element sits in the page.
 *
 * `getBoundingClientRect` would be the modern answer, but it is not the same
 * answer: it is viewport-relative and fractional, while these walk the
 * offsetParent chain and return the document-relative integer the ruler and
 * the line guides position themselves against. Changing that would move both
 * widgets by the scroll offset.
 */

interface Positioned extends Element {
  offsetParent: Element | null;
  offsetLeft: number;
  offsetTop: number;
}

function getElementPosition(element: Element | null, xPosition: boolean): number {
  let current = element as Positioned | null;

  if (!current) {
    return 0;
  }

  // An element with no offsetParent is positioned against the initial
  // containing block, so its own offset is already the answer.
  if (!current.offsetParent) {
    return xPosition ? current.offsetLeft : current.offsetTop;
  }

  let position = 0;

  while (current?.offsetParent) {
    position += xPosition ? current.offsetLeft : current.offsetTop;
    current = current.offsetParent as Positioned;
  }

  return position;
}

export function getElementPositionX(element: Element | null): number {
  return getElementPosition(element, true);
}

export function getElementPositionY(element: Element | null): number {
  return getElementPosition(element, false);
}
