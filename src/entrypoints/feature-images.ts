// Injected into the page with chrome.scripting.executeScript({ files }).
// See feature-css.ts for why the namespace assignment is not optional.
import { WebDeveloper } from "@/legacy/globals";
import "@/legacy/shims/dom";
import "@/legacy/shims/notify";

import * as images from "@/features/images";
import { register, run } from "@/features/entries";

WebDeveloper.Images = { ...WebDeveloper.Images, ...images };

register(images.IMAGES_ENTRIES);
WebDeveloper.run = run;

export default defineUnlistedScript(() => {});
