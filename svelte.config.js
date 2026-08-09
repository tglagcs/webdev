import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";

// Only so svelte-check can find the preprocessor; WXT configures the plugin
// itself through @wxt-dev/module-svelte.
export default { preprocess: vitePreprocess() };
