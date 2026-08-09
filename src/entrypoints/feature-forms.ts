// Injected into the page with chrome.scripting.executeScript({ files }).
// See feature-css.ts for why the namespace assignment is not optional.
import { WebDeveloper } from "@/legacy/globals";
import "@/legacy/shims/dom";
import "@/legacy/shims/notify";

import * as forms from "@/features/forms";
import { register, run } from "@/features/entries";

WebDeveloper.Forms = { ...WebDeveloper.Forms, ...forms };

register(forms.FORMS_ENTRIES);
WebDeveloper.run = run;

export default defineUnlistedScript(() => {});
