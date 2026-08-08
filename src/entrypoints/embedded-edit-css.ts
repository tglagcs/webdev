// Injected into the host page alongside the always-on content script, which
// has already put WebDeveloper.Common in the isolated world.
import "@/legacy/globals";
import "@/legacy/js/embedded/dashboard/edit-css.js";

export default defineUnlistedScript(() => {});
