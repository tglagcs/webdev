// Concat order from common/gulp/build.js buildBackground. storage.js registers
// its tab listeners at module top level, which is what MV3 requires -- a
// listener registered inside an async callback misses events when the worker
// restarts. Do not move these behind defineBackground's main().
import "@/legacy/globals";
import "@/legacy/js/background/background.js";
import "@/legacy/js/common/locales.js";
import "@/legacy/js/common/storage.js";
import "@/legacy/js/upgrade/upgrade.js";

export default defineBackground(() => {});
