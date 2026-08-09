/**
 * Golden tests for the Forms feature bundle.
 *
 * Taken against the legacy implementation before the port, and expected to be
 * unchanged across it -- byte-identical snapshots are the evidence that the
 * port kept the behaviour, not the fact that the tests pass.
 *
 * The bundle mutates the page and returns nothing, so the assertion is the
 * mutation plus the notification, which carries the count the user sees.
 *
 * Not reachable from happy-dom, and so not covered here:
 *
 *  - input.value coercion for date, time, week, month and colour, which a real
 *    engine validates and happy-dom stores verbatim. The snapshot pins what
 *    the feature assigns, which is the part the port could change.
 *  - the two stylesheets displayFormDetails toggles are asserted by id only;
 *    happy-dom does not fetch them.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fakeBrowser } from "wxt/testing/fake-browser";

import { WebDeveloper } from "@/legacy/globals";
import "@/legacy/js/common/common.js";
import "@/legacy/shims/dom";
import "@/legacy/shims/notify";
import "@/legacy/js/features/forms.js";

const Forms = WebDeveloper.Forms;

const fixture = readFileSync(resolve("tests/fixtures/forms-page.html"), "utf-8");

const documents = (): Document[] => [document];

/** See the note in style-features.test.ts: the message is the whole result. */
const notifications: unknown[] = [];

/** Every form control, with the state these features move around. */
function controls(): object {
  return Array.from(
    document.querySelectorAll("input, select, textarea, button, form"),
    (element) => ({
      tag: element.tagName.toLowerCase(),
      attributes: Object.fromEntries(
        Array.from(element.attributes, (attribute) => [attribute.name, attribute.value]).sort(),
      ),
      value: (element as HTMLInputElement).value ?? null,
      checked: (element as HTMLInputElement).checked ?? null,
      disabled: (element as HTMLInputElement).disabled ?? null,
      selectedIndex: (element as HTMLSelectElement).selectedIndex ?? null,
    }),
  );
}

/** The labels the feature drew, and the stylesheets it added. */
function injected(): object {
  return {
    labels: Array.from(document.querySelectorAll('span[class^="web-developer-"]'), (span) => ({
      className: span.className,
      text: span.textContent,
      before: span.nextElementSibling?.id || span.nextElementSibling?.tagName.toLowerCase() || null,
    })),
    outlined: Array.from(
      document.querySelectorAll(".web-developer-outline-form-fields-without-labels"),
      (element) => element.id,
    ),
    styleSheets: Array.from(
      document.querySelectorAll('link[id^="web-developer-"]'),
      (link) => link.id,
    ),
  };
}

/**
 * Every element left in the page, with its extension-inserted labels dropped.
 *
 * Two normalisations, both for genuine legacy behaviour that the raw markup
 * would report as a difference:
 *
 *  - `removeClass` writes the filtered list back, so the last class removed
 *    leaves `class=""` behind rather than no attribute.
 *  - `displayFormDetails` restores a hidden input by re-adding `type`, which
 *    moves it to the end of the attribute list.
 *
 * Attributes are sorted rather than compared in order for the second, and an
 * empty class is dropped for the first.
 */
function pageShape(): string[] {
  const clone = document.body.cloneNode(true) as HTMLElement;

  clone
    .querySelectorAll('span[class^="web-developer-"]')
    .forEach((element) => element.parentNode?.removeChild(element));

  return Array.from(clone.querySelectorAll("*"), (element) =>
    [
      element.tagName.toLowerCase(),
      ...Array.from(element.attributes)
        .filter((attribute) => !(attribute.name === "class" && attribute.value === ""))
        .map((attribute) => `${attribute.name}="${attribute.value}"`)
        .sort(),
    ].join(" "),
  );
}

beforeEach(() => {
  fakeBrowser.reset();
  notifications.length = 0;
  fakeBrowser.runtime.onMessage.addListener((message) => {
    notifications.push(message);

    return undefined;
  });
  document.documentElement.innerHTML = fixture
    .replace(/^[\s\S]*?<html[^>]*>/, "")
    .replace(/<\/html>[\s\S]*$/, "");
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("clearing", () => {
  it("clears every field a form owns, by type", () => {
    Forms.clearFormFields(documents());

    expect(controls()).toMatchSnapshot();
    expect(notifications).toMatchSnapshot();
  });

  // document.forms is the input, so a control outside any form survives.
  it("leaves controls outside a form alone", () => {
    Forms.clearFormFields(documents());

    expect(document.querySelector<HTMLInputElement>("#input-outside-form")!.value).toBe("");
    expect(document.querySelector<HTMLInputElement>("#hidden")!.value).toBe("secret");
    expect(document.querySelector<HTMLInputElement>("#submit")!.value).toBe("Send");
  });

  it("clears radio buttons wherever they are", () => {
    Forms.clearRadioButtons(documents());

    expect(document.querySelector<HTMLInputElement>("#radio-a")!.checked).toBe(false);
    expect(notifications).toMatchSnapshot();
  });

  it.each([
    ["checks", true],
    ["unchecks", false],
  ])("%s every checkbox", (_name, check) => {
    Forms.toggleCheckboxes(check, documents());

    expect(
      Array.from(document.querySelectorAll<HTMLInputElement>("input[type=checkbox]"), (box) => [
        box.id,
        box.checked,
      ]),
    ).toMatchSnapshot();
    expect(notifications).toMatchSnapshot();
  });
});

describe("converting", () => {
  it.each([["get"], ["post"]])("converts every form to %s", (method) => {
    Forms.convertFormMethods(method, documents());

    expect(
      Array.from(document.forms, (form) => [form.id, form.getAttribute("method")]),
    ).toMatchSnapshot();
    expect(notifications).toMatchSnapshot();
  });

  it("converts select elements to text inputs, keeping id, name and value", () => {
    Forms.convertSelectElementsToTextInputs(documents());

    expect(document.getElementsByTagName("select")).toHaveLength(0);
    expect(controls()).toMatchSnapshot();
    expect(notifications).toMatchSnapshot();
  });

  it("converts text inputs to textareas, leaving the button-like types", () => {
    Forms.convertTextInputsToTextareas(documents());

    expect(
      Array.from(document.getElementsByTagName("input"), (input) => [
        input.id,
        input.getAttribute("type"),
      ]),
    ).toMatchSnapshot();
    expect(controls()).toMatchSnapshot();
    expect(notifications).toMatchSnapshot();
  });
});

describe("revealing", () => {
  it("takes the type off every password field", () => {
    Forms.displayPasswords(documents());

    expect(document.getElementById("password")!.hasAttribute("type")).toBe(false);
    expect(notifications).toMatchSnapshot();
  });

  it("removes every autocomplete attribute", () => {
    Forms.enableAutoCompletion(documents());

    expect(document.querySelectorAll("[autocomplete]")).toHaveLength(0);
    expect(notifications).toMatchSnapshot();
  });

  it("enables disabled fields, including image inputs outside a form's elements", () => {
    Forms.enableFormFields(documents());

    expect(document.querySelector<HTMLInputElement>("#disabled")!.disabled).toBe(false);
    expect(document.querySelector<HTMLInputElement>("#image")!.disabled).toBe(false);
    expect(document.querySelector<HTMLSelectElement>("#select-disabled")!.disabled).toBe(false);
    expect(notifications).toMatchSnapshot();
  });

  it("makes read-only fields writable", () => {
    Forms.makeFormFieldsWritable(documents());

    expect(document.querySelectorAll("[readonly]")).toHaveLength(0);
    expect(notifications).toMatchSnapshot();
  });

  it("expands select elements to the size of their option list", () => {
    Forms.expandSelectElements(documents());

    expect(
      Array.from(document.getElementsByTagName("select"), (select) => [
        select.id,
        select.getAttribute("size"),
      ]),
    ).toMatchSnapshot();
    expect(notifications).toMatchSnapshot();
  });

  it("removes maximum lengths", () => {
    Forms.removeMaximumLengths(documents());

    expect(document.querySelectorAll("[maxlength]")).toHaveLength(0);
    expect(notifications).toMatchSnapshot();
  });

  it("removes validation attributes and the types that validate", () => {
    Forms.removeFormValidation(documents());

    expect(document.querySelectorAll("[max], [min], [pattern], [required]")).toHaveLength(0);
    expect(
      Array.from(document.getElementsByTagName("input"), (input) => [
        input.id,
        input.getAttribute("type"),
      ]),
    ).toMatchSnapshot();
    expect(notifications).toMatchSnapshot();
  });
});

describe("displayFormDetails", () => {
  it("labels every control and unhides the hidden ones", () => {
    Forms.displayFormDetails(true, documents());

    expect(injected()).toMatchSnapshot();
    expect(document.getElementById("hidden")!.getAttribute("web-developer-unhidden")).toBe("true");
  });

  it("puts the page back, hidden inputs included", () => {
    const before = pageShape();

    Forms.displayFormDetails(true, documents());
    Forms.displayFormDetails(false, documents());

    expect(pageShape()).toEqual(before);
    expect(injected().styleSheets).toEqual([]);
  });
});

describe("outlineFormFieldsWithoutLabels", () => {
  it("outlines only the fields with neither a wrapping label nor one pointing at them", () => {
    Forms.outlineFormFieldsWithoutLabels(true, documents());

    expect(injected()).toMatchSnapshot();
  });

  it("removes the outline again", () => {
    const before = pageShape();

    Forms.outlineFormFieldsWithoutLabels(true, documents());
    Forms.outlineFormFieldsWithoutLabels(false, documents());

    expect(pageShape()).toEqual(before);
  });
});

describe("populateFormFields", () => {
  // Every date-derived value and the random number are pinned, so the snapshot
  // is about which value goes in which field rather than about the clock.
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-09T14:07:00"));
    vi.spyOn(Math, "random").mockReturnValue(0.5);
  });

  it("fills every empty field it recognises", () => {
    Forms.populateFormFields(documents(), "someone@example.com", "hunter2");

    expect(controls()).toMatchSnapshot();
    expect(notifications).toMatchSnapshot();
  });

  it("leaves fields that already have a value, and disabled ones", () => {
    Forms.populateFormFields(documents(), "someone@example.com", "hunter2");

    expect(document.querySelector<HTMLInputElement>("#text-named")!.value).toBe("taken");
    expect(document.querySelector<HTMLInputElement>("#disabled")!.value).toBe("");
    expect(document.querySelector<HTMLTextAreaElement>("#textarea-filled")!.value).toBe(
      "already here",
    );
  });

  it("truncates to the maximum length", () => {
    Forms.populateFormFields(documents(), "someone@example.com", "hunter2");

    expect(document.querySelector<HTMLInputElement>("#text-maxlength")!.value).toHaveLength(4);
    expect(document.querySelector<HTMLTextAreaElement>("#textarea-maxlength")!.value).toHaveLength(
      6,
    );
  });

  // Name matching, not type matching: an ordinary text input called
  // "contactEmail" gets an address.
  it("reads the field name when the type does not say enough", () => {
    Forms.populateFormFields(documents(), "someone@example.com", "hunter2");

    expect(document.querySelector<HTMLInputElement>("#text-email-by-name")!.value).toBe(
      "someone@example.com",
    );
    expect(document.querySelector<HTMLInputElement>("#text-zip-by-name")!.value).toBe("90210");
    expect(document.querySelector<HTMLInputElement>("#text-phone-by-name")!.value).toBe(
      "1234567890",
    );
  });

  it("selects the first option that has both text and a value", () => {
    Forms.populateFormFields(documents(), "someone@example.com", "hunter2");

    expect(document.querySelector<HTMLSelectElement>("#select-blank-first")!.value).toBe("uk");
  });
});
