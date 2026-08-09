// Injected into the page with chrome.scripting.executeScript({ files }).
// See feature-css.ts for why the namespace assignment is not optional.
import { WebDeveloper } from "@/legacy/globals";
import "@/legacy/js/common/common.js";
import "@/legacy/js/common/css.js";
import "@/legacy/shims/dom";
import "@/legacy/shims/notify";

import * as information from "@/features/information";

WebDeveloper.Information = { ...WebDeveloper.Information, ...information };

export default defineUnlistedScript(() => {});
