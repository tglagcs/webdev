/**
 * The Forms menu.
 *
 * Sixteen features over the same three inputs: `document.forms` (a form's own
 * controls), a query across the whole document (every control, form or not),
 * and the labels drawn beside them. Which of the first two a feature uses is
 * not cosmetic -- Clear Form Fields misses a stray input outside a form and
 * Clear Radio Buttons does not -- so each one keeps the collection upstream
 * gave it.
 *
 * Every result is reported as a count, singular or plural, through the popup.
 */

import { NAME, BADGE_COLOUR } from "@/branding";
import { addClass, removeClass, removeMatchingElements } from "@/lib/dom/elements";
import { toggleStyleSheet } from "@/lib/dom/stylesheets";
import { displayCount, displayNotification } from "./notify";
import type { Entry } from "./entries";

const CSS = "/features/css/forms";
const BEFORE = "/features/css/before.css";

/** The input types that are not text-like, whatever else they are. */
const BUTTON_LIKE = ["button", "checkbox", "file", "hidden", "image", "radio", "reset", "submit"];

type FormControl = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

/** Every control every form in the document owns, in document order. */
function formControls(contentDocument: Document): FormControl[] {
  return Array.from(contentDocument.forms).flatMap((form) =>
    Array.from(form.elements as unknown as ArrayLike<FormControl>),
  );
}

/** Removes an attribute wherever it appears, and counts what it removed. */
function stripAttribute(documents: Document[], attribute: string): number {
  let removed = 0;

  for (const contentDocument of documents) {
    for (const element of contentDocument.querySelectorAll(`[${attribute}]`)) {
      element.removeAttribute(attribute);

      removed++;
    }
  }

  return removed;
}

export function clearFormFields(documents: Document[]): void {
  let clearedForms = 0;

  for (const contentDocument of documents) {
    for (const form of contentDocument.forms) {
      for (const formElement of Array.from(form.elements as unknown as ArrayLike<FormControl>)) {
        const tag = formElement.tagName.toLowerCase();

        if (tag === "input") {
          // An input with no type attribute at all is a text field, and is
          // cleared; one with a type is cleared unless the type says the value
          // is not the user's to begin with.
          if (!formElement.hasAttribute("type")) {
            formElement.value = "";

            continue;
          }

          const type = formElement.getAttribute("type");

          if (type === "checkbox" || type === "radio") {
            (formElement as HTMLInputElement).checked = false;
          } else if (type !== "hidden" && type !== "reset" && type !== "submit") {
            formElement.value = "";
          }
        } else if (tag === "select") {
          (formElement as HTMLSelectElement).selectedIndex = -1;
        } else if (tag === "textarea") {
          formElement.value = "";
        }
      }

      // Forms, not fields: the count is of what the user pointed at.
      clearedForms++;
    }
  }

  displayCount(clearedForms, "clearFormFieldsSingleResult", "clearFormFieldsMultipleResult");
}

export function clearRadioButtons(documents: Document[]): void {
  let clearedRadioButtons = 0;

  for (const contentDocument of documents) {
    for (const radioButton of contentDocument.querySelectorAll<HTMLInputElement>(
      "input[type=radio]",
    )) {
      radioButton.checked = false;

      clearedRadioButtons++;
    }
  }

  displayCount(
    clearedRadioButtons,
    "clearRadioButtonsSingleResult",
    "clearRadioButtonsMultipleResult",
  );
}

export function convertFormMethods(method: string, documents: Document[]): void {
  let convertedForms = 0;

  for (const contentDocument of documents) {
    for (const form of contentDocument.forms) {
      const current = form.getAttribute("method");

      // A form with no method attribute is already a get, so only post counts
      // as a conversion for it.
      if (current === null ? method === "post" : current.toLowerCase() !== method) {
        form.setAttribute("method", method);

        convertedForms++;
      }
    }
  }

  // Not displayCount: both the singular and the plural name the method, so
  // the singular takes a substitution too.
  if (convertedForms === 1) {
    displayNotification("convertFormMethodsSingleResult", [method]);
  } else {
    displayNotification("convertFormMethodsMultipleResult", [convertedForms, method]);
  }
}

export function convertSelectElementsToTextInputs(documents: Document[]): void {
  let convertedSelectElements = 0;

  for (const contentDocument of documents) {
    // Live collection: each replacement shortens it, so this drains index 0
    // rather than walking an index that would skip every other element.
    const selectElements = contentDocument.getElementsByTagName("select");

    while (selectElements.length > 0) {
      const selectElement = selectElements[0]!;
      const inputElement = contentDocument.createElement("input");
      const parentNode = selectElement.parentNode!;

      inputElement.value = selectElement.value;

      for (const attribute of ["id", "name"]) {
        if (selectElement.hasAttribute(attribute)) {
          inputElement.setAttribute(attribute, selectElement.getAttribute(attribute)!);
        }
      }

      parentNode.insertBefore(inputElement, selectElement);
      parentNode.removeChild(selectElement);

      convertedSelectElements++;
    }
  }

  displayCount(
    convertedSelectElements,
    "convertSelectElementsToTextInputsSingleResult",
    "convertSelectElementsToTextInputsMultipleResult",
  );
}

export function convertTextInputsToTextareas(documents: Document[]): void {
  let convertedTextInputs = 0;

  for (const contentDocument of documents) {
    // querySelectorAll rather than getElementsByTagName: this one replaces as
    // it goes and needs a list that does not move under it.
    for (const inputElement of contentDocument.querySelectorAll("input")) {
      const type = inputElement.getAttribute("type");

      if (type && BUTTON_LIKE.includes(type)) {
        continue;
      }

      const textareaElement = contentDocument.createElement("textarea");
      const parentNode = inputElement.parentNode!;

      textareaElement.value = inputElement.value;

      for (const attribute of ["id", "name"]) {
        if (inputElement.hasAttribute(attribute)) {
          textareaElement.setAttribute(attribute, inputElement.getAttribute(attribute)!);
        }
      }

      parentNode.insertBefore(textareaElement, inputElement);
      parentNode.removeChild(inputElement);

      convertedTextInputs++;
    }
  }

  displayCount(
    convertedTextInputs,
    "convertTextInputsToTextareasSingleResult",
    "convertTextInputsToTextareasMultipleResult",
  );
}

/** The markup a control would have, limited to the attributes worth showing. */
function describeElement(element: Element, tag: string, attributes: string[]): string {
  let text = `<${tag}`;

  for (const attribute of attributes) {
    if (element.hasAttribute(attribute)) {
      text += ` ${attribute}="${element.getAttribute(attribute)}"`;
    }
  }

  return text;
}

function labelElement(contentDocument: Document, element: Element, text: string): void {
  const spanElement = contentDocument.createElement("span");

  spanElement.setAttribute("class", "web-developer-display-form-details");
  spanElement.appendChild(contentDocument.createTextNode(`${text}>`));
  element.parentNode!.insertBefore(spanElement, element);
}

export function displayFormDetails(display: boolean, documents: Document[]): void {
  for (const contentDocument of documents) {
    for (const inputElement of contentDocument.getElementsByTagName("input")) {
      if (!display) {
        // The type went into a holding attribute so the field could be seen;
        // put it back.
        if (inputElement.hasAttribute("web-developer-unhidden")) {
          inputElement.removeAttribute("web-developer-unhidden");
          inputElement.setAttribute("type", "hidden");
        }

        continue;
      }

      if (inputElement.getAttribute("type")?.toLowerCase() === "hidden") {
        inputElement.setAttribute("web-developer-unhidden", "true");
        inputElement.removeAttribute("type");
      }

      let text = describeElement(inputElement, "input", [
        "autocomplete",
        "id",
        "maxlength",
        "name",
        "size",
        "type",
      ]);
      const type = inputElement.getAttribute("type")?.toLowerCase();

      // Only for the two types where the value is the identity of the control
      // rather than something the user typed.
      if (type === "checkbox" || type === "radio") {
        text += ` value="${inputElement.value}"`;
      }

      labelElement(contentDocument, inputElement, text);
    }

    if (display) {
      for (const buttonElement of contentDocument.getElementsByTagName("button")) {
        let text = describeElement(buttonElement, "button", ["id", "name"]);

        if (buttonElement.value) {
          text += ` value="${buttonElement.value}"`;
        }

        labelElement(contentDocument, buttonElement, text);
      }

      for (const selectElement of contentDocument.getElementsByTagName("select")) {
        let text = describeElement(selectElement, "select", ["id", "name"]);

        // The selected value, which is not an attribute -- so it is read off
        // the element rather than through describeElement.
        if (selectElement.value) {
          text += ` value="${selectElement.value}"`;
        }

        labelElement(contentDocument, selectElement, text);
      }

      for (const textAreaElement of contentDocument.getElementsByTagName("textarea")) {
        labelElement(
          contentDocument,
          textAreaElement,
          describeElement(textAreaElement, "textarea", ["id", "maxlength", "name"]),
        );
      }
    } else {
      removeMatchingElements(".web-developer-display-form-details", contentDocument);
    }

    toggleStyleSheet(BEFORE, "web-developer-display-form-details-before", contentDocument, false);
    toggleStyleSheet(
      `${CSS}/display-form-details.css`,
      "web-developer-display-form-details",
      contentDocument,
      false,
    );
  }
}

export function displayPasswords(documents: Document[]): void {
  let displayedPasswords = 0;

  for (const contentDocument of documents) {
    for (const password of contentDocument.querySelectorAll("input[type=password]")) {
      password.removeAttribute("type");

      displayedPasswords++;
    }
  }

  displayCount(
    displayedPasswords,
    "displayPasswordsSingleResult",
    "displayPasswordsMultipleResult",
  );
}

export function enableAutoCompletion(documents: Document[]): void {
  displayCount(
    stripAttribute(documents, "autocomplete"),
    "enableAutoCompletionSingleResult",
    "enableAutoCompletionMultipleResult",
  );
}

/** Shared by the two collections enableFormFields has to cover. */
export function enableFormElements(formElements: ArrayLike<FormControl>): number {
  let enabledElements = 0;

  for (const formElement of Array.from(formElements)) {
    if (formElement.disabled) {
      formElement.disabled = false;

      enabledElements++;
    }
  }

  return enabledElements;
}

export function enableFormFields(documents: Document[]): void {
  let enabledFields = 0;

  for (const contentDocument of documents) {
    for (const form of contentDocument.forms) {
      enabledFields += enableFormElements(form.elements as unknown as ArrayLike<FormControl>);
    }

    // An image input is a submit button, and a form lists it -- but one
    // outside a form is not reached above, and upstream added this pass for
    // it.
    enabledFields += enableFormElements(
      contentDocument.querySelectorAll<HTMLInputElement>("input[type=image]"),
    );
  }

  displayCount(enabledFields, "enableFormFieldsSingleResult", "enableFormFieldsMultipleResult");
}

export function expandSelectElements(documents: Document[]): void {
  let expandedElements = 0;

  for (const contentDocument of documents) {
    for (const selectElement of contentDocument.querySelectorAll("select")) {
      const selectLength = selectElement.options.length;
      const selectSize = selectElement.getAttribute("size");

      // The second comparison is a number against the size attribute as a
      // string, which JavaScript coerces. Kept as upstream wrote it: a size of
      // "2" on a three-option list expands, which is the intent.
      if ((!selectSize && selectLength > 1) || selectLength > Number(selectSize)) {
        selectElement.setAttribute("size", String(selectLength));

        expandedElements++;
      }
    }
  }

  displayCount(
    expandedElements,
    "expandSelectElementsSingleResult",
    "expandSelectElementsMultipleResult",
  );
}

export function makeFormFieldsWritable(documents: Document[]): void {
  displayCount(
    stripAttribute(documents, "readonly"),
    "makeFormFieldsWritableSingleResult",
    "makeFormFieldsWritableMultipleResult",
  );
}

export function outlineFormFieldsWithoutLabels(outline: boolean, documents: Document[]): void {
  const className = "web-developer-outline-form-fields-without-labels";

  for (const contentDocument of documents) {
    if (outline) {
      for (const formElement of formControls(contentDocument)) {
        // Two ways to be labelled: wrapped in a label, or named by one. A
        // field with no id cannot be named by one, and is left alone rather
        // than reported -- upstream's choice, since the id is what a label
        // would point at.
        if (formElement.parentNode instanceof Element) {
          if (formElement.parentNode.tagName.toLowerCase() === "label") {
            continue;
          }
        }

        const formElementId = formElement.getAttribute("id");

        if (formElementId && !contentDocument.querySelector(`label[for="${formElementId}"]`)) {
          addClass(formElement, className);
        }
      }
    } else {
      // Live collection again: removing the class shortens it.
      const outlined = contentDocument.getElementsByClassName(className);

      while (outlined.length > 0) {
        removeClass(outlined[0]!, className);
      }
    }

    toggleStyleSheet(
      `${CSS}/outline-form-fields-without-labels.css`,
      className,
      contentDocument,
      false,
    );
  }
}

/** The date-derived values every run of populateFormFields shares. */
function dateValues(): {
  date: string;
  localDateTime: string;
  month: string;
  time: string;
  week: string;
} {
  const now = new Date();
  const date = now.toISOString().split("T")[0]!;
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const time = `${hours}:${minutes}`;

  // ISO week: step to the Thursday of this week, then count weeks from the
  // start of that year. Sunday is day 7 rather than day 0.
  //
  // The year is read before the step, not after: in the last days of December
  // the Thursday can fall into the next year, and counting from that year's
  // January would give week 0.
  const weekDate = new Date();
  const year = weekDate.getFullYear();
  const day = now.getDay() === 0 ? 7 : now.getDay();

  weekDate.setDate(weekDate.getDate() + (4 - day));

  const weekNumber =
    1 +
    Math.floor(
      Math.floor((weekDate.getTime() - new Date(year, 0, 1, -6).getTime()) / 86400000) / 7,
    );

  return {
    date,
    localDateTime: `${date}T${time}`,
    month: date.split("-").slice(0, 2).join("-"),
    time,
    week: `${now.getFullYear()}-W${weekNumber}`,
  };
}

/** A random integer in the input's range, defaulting to 0..1. */
function randomNumber(inputElement: HTMLInputElement): string {
  const maximumValue = parseInt(inputElement.max, 10);
  const minimumValue = parseInt(inputElement.min, 10);

  return String(
    Math.round(
      Math.random() *
        ((isNaN(maximumValue) ? 1 : maximumValue) - (isNaN(minimumValue) ? 0 : minimumValue)),
    ),
  );
}

/**
 * The value to put in a text-like input.
 *
 * Type first, then the field name, then the name itself as the value -- so an
 * ordinary text input called "contactEmail" gets an address, and one called
 * "street" gets "street".
 */
function populatedValue(
  inputElement: HTMLInputElement,
  type: string | null,
  name: string | null,
  emailAddress: string,
  password: string,
  dates: ReturnType<typeof dateValues>,
): string {
  const lower = type?.toLowerCase();
  const lowerName = name?.toLowerCase();

  // Unreachable in a real browser, and kept anyway: an <input type="color">
  // reports "#000000" rather than "" when it has no value, so the caller's
  // "is it empty" test is never true for one. happy-dom leaves it empty, which
  // is why the tests do reach this line. Upstream's, and left as found.
  if (lower === "color") {
    return BADGE_COLOUR.danger;
  }

  if (lower === "date") {
    return dates.date;
  }

  if (lower === "datetime" || lower === "datetime-local") {
    return dates.localDateTime;
  }

  // The type is compared unlowered here, as upstream had it: a field written
  // type="TEXT" falls through to the name checks below instead.
  if (lower === "email" || ((!type || type === "text") && lowerName?.includes("email"))) {
    return emailAddress;
  }

  if (lower === "month") {
    return dates.month;
  }

  if (lower === "password") {
    return password;
  }

  if (lower === "number") {
    return randomNumber(inputElement);
  }

  if (lower === "tel" || lowerName?.includes("phone") || lowerName?.includes("tel")) {
    return "1234567890";
  }

  if (lower === "time") {
    return dates.time;
  }

  if (lower === "url") {
    return "http://localhost/";
  }

  if (lower === "week") {
    return dates.week;
  }

  if (lowerName?.includes("zip")) {
    return "90210";
  }

  return name ?? NAME;
}

/** Truncates to the element's maxlength, if it has one. */
function truncate(element: HTMLInputElement | HTMLTextAreaElement): void {
  const maximumLength = element.getAttribute("maxlength");

  if (maximumLength && element.value.length > Number(maximumLength)) {
    element.value = element.value.substring(0, Number(maximumLength));
  }
}

export function populateFormFields(
  documents: Document[],
  emailAddress: string,
  password: string,
): void {
  const dates = dateValues();
  const populatable = [
    "color",
    "date",
    "datetime",
    "datetime-local",
    "email",
    "month",
    "number",
    "password",
    "search",
    "tel",
    "text",
    "time",
    "url",
    "week",
  ];
  let populatedFormFields = 0;

  for (const contentDocument of documents) {
    for (const inputElement of contentDocument.getElementsByTagName("input")) {
      if (inputElement.disabled) {
        continue;
      }

      const type = inputElement.getAttribute("type");
      const empty = !inputElement.value.trim();

      if (empty && (!type || populatable.includes(type.toLowerCase()))) {
        inputElement.value = populatedValue(
          inputElement,
          type,
          inputElement.getAttribute("name"),
          emailAddress,
          password,
          dates,
        );

        truncate(inputElement);

        populatedFormFields++;
      } else if (type && (type.toLowerCase() === "checkbox" || type.toLowerCase() === "radio")) {
        // Not gated on being empty: a checkbox always has a value, so the
        // branch above never reaches it.
        inputElement.checked = true;

        populatedFormFields++;
      }
    }

    for (const selectElement of contentDocument.getElementsByTagName("select")) {
      if (selectElement.disabled || selectElement.value.trim()) {
        continue;
      }

      const options = selectElement.options;

      // The first option that is not a "Choose one" placeholder -- it has to
      // have both a label and a value.
      for (let index = 0; index < options.length; index++) {
        const option = options.item(index);

        if (option && option.text.trim() && option.value.trim()) {
          selectElement.selectedIndex = index;

          populatedFormFields++;

          break;
        }
      }
    }

    for (const textAreaElement of contentDocument.getElementsByTagName("textarea")) {
      if (textAreaElement.disabled || textAreaElement.value.trim()) {
        continue;
      }

      textAreaElement.value = textAreaElement.getAttribute("name")!;

      truncate(textAreaElement);

      populatedFormFields++;
    }
  }

  displayCount(
    populatedFormFields,
    "populateFormFieldsSingleResult",
    "populateFormFieldsMultipleResult",
  );
}

export function removeFormValidation(documents: Document[]): void {
  let alteredElements = 0;

  for (const contentDocument of documents) {
    // Counted per attribute, not per element: one field with both min and max
    // reports as two.
    for (const attributeElement of contentDocument.querySelectorAll(
      "[max], [min], [pattern], [required]",
    )) {
      for (const attribute of ["max", "min", "pattern", "required"]) {
        if (attributeElement.hasAttribute(attribute)) {
          attributeElement.removeAttribute(attribute);

          alteredElements++;
        }
      }
    }

    // The types that validate their own value are made plain text.
    for (const inputElement of contentDocument.querySelectorAll<HTMLInputElement>(
      "input[type=email], input[type=number], input[type=range], input[type=url]",
    )) {
      inputElement.type = "text";

      alteredElements++;
    }
  }

  displayCount(
    alteredElements,
    "removeFormValidationSingleResult",
    "removeFormValidationMultipleResult",
  );
}

export function removeMaximumLengths(documents: Document[]): void {
  displayCount(
    stripAttribute(documents, "maxlength"),
    "removeMaximumLengthsSingleResult",
    "removeMaximumLengthsMultipleResult",
  );
}

export function toggleCheckboxes(check: boolean, documents: Document[]): void {
  let alteredCheckboxes = 0;

  for (const contentDocument of documents) {
    for (const checkbox of contentDocument.querySelectorAll<HTMLInputElement>(
      "input[type=checkbox]",
    )) {
      checkbox.checked = check;

      alteredCheckboxes++;
    }
  }

  if (check) {
    displayCount(
      alteredCheckboxes,
      "checkAllCheckboxesSingleResult",
      "checkAllCheckboxesMultipleResult",
    );
  } else {
    displayCount(
      alteredCheckboxes,
      "uncheckAllCheckboxesSingleResult",
      "uncheckAllCheckboxesMultipleResult",
    );
  }
}

/**
 * The Forms menu, as entries the popup can name in the registry.
 *
 * Eighteen of the nineteen; the last opens a report. Only two have an on
 * state -- the rest change the page once and are done, which is why upstream
 * ran them through `addFeatureOnTab` rather than `toggleFeatureOnTab`.
 *
 * Populate Form Fields is the one that needs both kinds of outside value: the
 * address from the options page, and the word "password" as the password it
 * types, lowercased here because that is the feature's business rather than
 * the locale's.
 */
export const FORMS_ENTRIES: Record<string, Entry> = {
  "check-all-checkboxes": (_payload, documents) => toggleCheckboxes(true, documents),
  "uncheck-all-checkboxes": (_payload, documents) => toggleCheckboxes(false, documents),

  "clear-form-fields": (_payload, documents) => clearFormFields(documents),
  "clear-radio-buttons": (_payload, documents) => clearRadioButtons(documents),
  "convert-select-elements-to-text-inputs": (_payload, documents) =>
    convertSelectElementsToTextInputs(documents),
  "convert-text-inputs-to-textareas": (_payload, documents) =>
    convertTextInputsToTextareas(documents),
  "display-passwords": (_payload, documents) => displayPasswords(documents),
  "enable-auto-completion": (_payload, documents) => enableAutoCompletion(documents),
  "enable-form-fields": (_payload, documents) => enableFormFields(documents),
  "expand-select-elements": (_payload, documents) => expandSelectElements(documents),
  "make-form-fields-writable": (_payload, documents) => makeFormFieldsWritable(documents),
  "remove-form-validation": (_payload, documents) => removeFormValidation(documents),
  "remove-maximum-lengths": (_payload, documents) => removeMaximumLengths(documents),

  "convert-form-gets-to-posts": (_payload, documents) => convertFormMethods("post", documents),
  "convert-form-posts-to-gets": (_payload, documents) => convertFormMethods("get", documents),

  "populate-form-fields": (payload, documents) =>
    populateFormFields(
      documents,
      String(payload.emailAddress),
      String(payload.password).toLowerCase(),
    ),

  "display-form-details": (payload, documents) => displayFormDetails(!payload.enabled, documents),
  "outline-form-fields-without-labels": (payload, documents) =>
    outlineFormFieldsWithoutLabels(!payload.enabled, documents),
};
