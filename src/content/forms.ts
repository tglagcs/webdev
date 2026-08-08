/**
 * Forms and their fields.
 */

import { perDocument, type Report } from "./report";

export interface FormElementDetails {
  type: string;
  value?: string;
  label?: string;
  id?: string;
  name?: string;
  maximumLength?: string;
  size?: string;
}

export interface FormDetails {
  elements: FormElementDetails[];
  action?: string;
  method?: string;
  /**
   * `formId` and `formName` rather than `id` and `name`, so a form and its
   * fields do not collide in the report template's scope.
   */
  formId?: string;
  formName?: string;
}

/** Copies an attribute onto the target only when the element carries it. */
function copyAttribute<T extends object>(
  element: Element,
  attribute: string,
  target: T,
  key: keyof T,
): void {
  if (element.hasAttribute(attribute)) {
    target[key] = element.getAttribute(attribute) as T[keyof T];
  }
}

function describeElement(contentDocument: Document, element: Element): FormElementDetails {
  const tag = element.tagName.toLowerCase();
  const details = {} as FormElementDetails;

  if (tag === "input" || tag === "select" || tag === "textarea") {
    details.value = (element as HTMLInputElement).value;
  }

  // An <input> is reported by its type, everything else by its tag name.
  details.type =
    tag === "input" && element.hasAttribute("type") ? element.getAttribute("type")! : tag;

  const parent = element.parentNode as Element | null;

  if (parent?.tagName.toLowerCase() === "label") {
    details.label = parent.textContent!.trim();
  }

  const id = element.getAttribute("id");

  if (id) {
    details.id = id;

    // A wrapping label wins; only fall back to `for=` when there was none.
    if (!details.label) {
      const label = contentDocument.querySelector(`label[for="${id}"]`);

      if (label) {
        details.label = label.textContent!.trim();
      }
    }
  }

  copyAttribute(element, "maxlength", details, "maximumLength");
  copyAttribute(element, "name", details, "name");
  copyAttribute(element, "size", details, "size");

  return details;
}

export function getForms(): Report<{ url: string; forms: FormDetails[] }> {
  return perDocument((contentDocument) => ({
    forms: Array.from(contentDocument.forms, (form) => {
      const details: FormDetails = {
        elements: Array.from(form.elements, (element) => describeElement(contentDocument, element)),
      };

      copyAttribute(form, "action", details, "action");
      copyAttribute(form, "id", details, "formId");
      copyAttribute(form, "method", details, "method");
      copyAttribute(form, "name", details, "formName");

      return details;
    }),
  }));
}
