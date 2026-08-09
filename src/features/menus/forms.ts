/**
 * The forms menu.
 *
 * Transcribed from popup/index.html and overlay/forms.js by
 * tools/extract-registry.py -- the ids, columns and message keys are the ones
 * that shipped, and the per-tab state is stored under the id, so none of them
 * may be renamed.
 */

import type { Feature } from "../types";

export const FORMS_FEATURES: Feature[] = [
  {
    id: "check-all-checkboxes",
    labelKey: "checkAllCheckboxes",
    column: 1,
    handler: "WebDeveloper.Overlay.Forms.checkAllCheckboxes",
  },
  {
    id: "uncheck-all-checkboxes",
    labelKey: "uncheckAllCheckboxes",
    column: 1,
    handler: "WebDeveloper.Overlay.Forms.uncheckAllCheckboxes",
  },
  {
    id: "clear-form-fields",
    labelKey: "clearFormFields",
    column: 1,
    handler: "WebDeveloper.Overlay.Forms.clearFormFields",
  },
  {
    id: "clear-radio-buttons",
    labelKey: "clearRadioButtons",
    column: 1,
    handler: "WebDeveloper.Overlay.Forms.clearRadioButtons",
  },
  {
    id: "convert-form-gets-to-posts",
    labelKey: "convertFormGetsToPosts",
    column: 1,
    handler: "WebDeveloper.Overlay.Forms.convertFormMethods",
    argument: "post",
  },
  {
    id: "convert-form-posts-to-gets",
    labelKey: "convertFormPostsToGets",
    column: 1,
    handler: "WebDeveloper.Overlay.Forms.convertFormMethods",
    argument: "get",
  },
  {
    id: "convert-select-elements-to-text-inputs",
    labelKey: "convertSelectElementsToTextInputs",
    column: 1,
    handler: "WebDeveloper.Overlay.Forms.convertSelectElementsToTextInputs",
  },
  {
    id: "convert-text-inputs-to-textareas",
    labelKey: "convertTextInputsToTextareas",
    column: 2,
    handler: "WebDeveloper.Overlay.Forms.convertTextInputsToTextareas",
  },
  {
    id: "display-form-details",
    labelKey: "displayFormDetails",
    column: 2,
    stateful: true,
    handler: "WebDeveloper.Overlay.Forms.displayFormDetails",
  },
  {
    id: "display-passwords",
    labelKey: "displayPasswords",
    column: 2,
    handler: "WebDeveloper.Overlay.Forms.displayPasswords",
  },
  {
    id: "enable-auto-completion",
    labelKey: "enableAutoCompletion",
    column: 2,
    handler: "WebDeveloper.Overlay.Forms.enableAutoCompletion",
  },
  {
    id: "enable-form-fields",
    labelKey: "enableFormFields",
    column: 2,
    handler: "WebDeveloper.Overlay.Forms.enableFormFields",
  },
  {
    id: "expand-select-elements",
    labelKey: "expandSelectElements",
    column: 2,
    handler: "WebDeveloper.Overlay.Forms.expandSelectElements",
  },
  {
    id: "make-form-fields-writable",
    labelKey: "makeFormFieldsWritable",
    column: 3,
    handler: "WebDeveloper.Overlay.Forms.makeFormFieldsWritable",
  },
  {
    id: "outline-form-fields-without-labels",
    labelKey: "outlineFormFieldsWithoutLabels",
    column: 3,
    stateful: true,
    handler: "WebDeveloper.Overlay.Forms.outlineFormFieldsWithoutLabels",
  },
  {
    id: "populate-form-fields",
    labelKey: "populateFormFields",
    column: 3,
    handler: "WebDeveloper.Overlay.Forms.populateFormFields",
  },
  {
    id: "remove-form-validation",
    labelKey: "removeFormValidation",
    column: 3,
    handler: "WebDeveloper.Overlay.Forms.removeFormValidation",
  },
  {
    id: "remove-maximum-lengths",
    labelKey: "removeMaximumLengths",
    column: 3,
    handler: "WebDeveloper.Overlay.Forms.removeMaximumLengths",
  },
  {
    id: "view-form-information",
    labelKey: "viewFormInformation",
    column: 3,
    handler: "WebDeveloper.Overlay.Forms.viewFormInformation",
  },
];
