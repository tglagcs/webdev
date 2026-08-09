// Injected into the page with chrome.scripting.executeScript({ files }).
// See feature-css.ts for why the namespace assignment is not optional.
import { WebDeveloper } from "@/legacy/globals";
import "@/legacy/shims/dom";
import "@/legacy/shims/notify";

import * as information from "@/features/information";
import { register, run } from "@/features/entries";

WebDeveloper.Information = { ...WebDeveloper.Information, ...information };

register(information.INFORMATION_ENTRIES);
WebDeveloper.run = run;

export default defineUnlistedScript(() => {});
