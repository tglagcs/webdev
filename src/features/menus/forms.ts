/**
 * The forms menu.
 *
 * Transcribed from popup/index.html and overlay/forms.js by
 * tools/extract-registry.py -- the ids, columns and message keys are the ones
 * that shipped, and the per-tab state is stored under the id, so none of them
 * may be renamed.
 *
 * Eighteen of the nineteen name an entry in the forms bundle; the last opens a
 * report. Convert Form Gets To Posts and its opposite were one handler and an
 * argument, and are two entries now.
 */

import type { Feature } from "../types";

export const FORMS_FEATURES: Feature[] = [
  {
    id: "check-all-checkboxes",
    labelKey: "checkAllCheckboxes",
    column: 1,
    kind: "action",
    inject: {
      bundle: "/feature-forms.js",
    },
  },
  {
    id: "uncheck-all-checkboxes",
    labelKey: "uncheckAllCheckboxes",
    column: 1,
    kind: "action",
    inject: {
      bundle: "/feature-forms.js",
    },
  },
  {
    id: "clear-form-fields",
    labelKey: "clearFormFields",
    column: 1,
    kind: "action",
    inject: {
      bundle: "/feature-forms.js",
    },
  },
  {
    id: "clear-radio-buttons",
    labelKey: "clearRadioButtons",
    column: 1,
    kind: "action",
    inject: {
      bundle: "/feature-forms.js",
    },
  },
  {
    id: "convert-form-gets-to-posts",
    labelKey: "convertFormGetsToPosts",
    column: 1,
    kind: "action",
    inject: {
      bundle: "/feature-forms.js",
    },
  },
  {
    id: "convert-form-posts-to-gets",
    labelKey: "convertFormPostsToGets",
    column: 1,
    kind: "action",
    inject: {
      bundle: "/feature-forms.js",
    },
  },
  {
    id: "convert-select-elements-to-text-inputs",
    labelKey: "convertSelectElementsToTextInputs",
    column: 1,
    kind: "action",
    inject: {
      bundle: "/feature-forms.js",
    },
  },
  {
    id: "convert-text-inputs-to-textareas",
    labelKey: "convertTextInputsToTextareas",
    column: 2,
    kind: "action",
    inject: {
      bundle: "/feature-forms.js",
    },
  },
  {
    id: "display-form-details",
    labelKey: "displayFormDetails",
    column: 2,
    stateful: true,
    kind: "toggle",
    inject: {
      bundle: "/feature-forms.js",
      payload: { enabled: { from: "enabled" } },
    },
  },
  {
    id: "display-passwords",
    labelKey: "displayPasswords",
    column: 2,
    kind: "action",
    inject: {
      bundle: "/feature-forms.js",
    },
  },
  {
    id: "enable-auto-completion",
    labelKey: "enableAutoCompletion",
    column: 2,
    kind: "action",
    inject: {
      bundle: "/feature-forms.js",
    },
  },
  {
    id: "enable-form-fields",
    labelKey: "enableFormFields",
    column: 2,
    kind: "action",
    inject: {
      bundle: "/feature-forms.js",
    },
  },
  {
    id: "expand-select-elements",
    labelKey: "expandSelectElements",
    column: 2,
    kind: "action",
    inject: {
      bundle: "/feature-forms.js",
    },
  },
  {
    id: "make-form-fields-writable",
    labelKey: "makeFormFieldsWritable",
    column: 3,
    kind: "action",
    inject: {
      bundle: "/feature-forms.js",
    },
  },
  {
    id: "outline-form-fields-without-labels",
    labelKey: "outlineFormFieldsWithoutLabels",
    column: 3,
    stateful: true,
    kind: "toggle",
    inject: {
      bundle: "/feature-forms.js",
      payload: { enabled: { from: "enabled" } },
    },
  },
  {
    id: "populate-form-fields",
    labelKey: "populateFormFields",
    column: 3,
    kind: "action",
    inject: {
      bundle: "/feature-forms.js",
      payload: {
        emailAddress: { from: "setting", key: "populate_email_address" },
        password: { from: "message", key: "password" },
      },
    },
  },
  {
    id: "remove-form-validation",
    labelKey: "removeFormValidation",
    column: 3,
    kind: "action",
    inject: {
      bundle: "/feature-forms.js",
    },
  },
  {
    id: "remove-maximum-lengths",
    labelKey: "removeMaximumLengths",
    column: 3,
    kind: "action",
    inject: {
      bundle: "/feature-forms.js",
    },
  },
  {
    id: "view-form-information",
    labelKey: "viewFormInformation",
    column: 3,
    kind: "report",
    handler: "WebDeveloper.Overlay.Forms.viewFormInformation",
  },
];
