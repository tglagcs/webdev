// Injected into the page with chrome.scripting.executeScript({ files }).
// See feature-css.ts for why the namespace assignment is not optional.
import { WebDeveloper } from "@/legacy/globals";
import "@/legacy/js/common/common.js";
import "@/legacy/shims/dom";
import "@/legacy/shims/notify";

import * as images from "@/features/images";

WebDeveloper.Images = { ...WebDeveloper.Images, ...images };

export default defineUnlistedScript(() => {});
