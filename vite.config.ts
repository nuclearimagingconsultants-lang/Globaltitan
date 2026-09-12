import { defineConfig, loadEnv } from "vite";

/** Copy cloud/Origin `VITE_GOOGLE_MAPS_API_KEY` (or alias) into the Vite-prefixed name the browser reads. */
function exposeMapsKey(mode: string): void {
  const file = loadEnv(mode, process.cwd(), "");
  const key = (
    process.env.VITE_GOOGLE_MAPS_API_KEY ||
    file.VITE_GOOGLE_MAPS_API_KEY ||
    process.env.GOOGLE_MAPS_API_KEY ||
    file.GOOGLE_MAPS_API_KEY ||
    ""
  ).trim();
  if (key) process.env.VITE_GOOGLE_MAPS_API_KEY = key;
}

export default defineConfig(({ mode }) => {
  exposeMapsKey(mode);
  return {
    envPrefix: ["VITE_"],
    server: {
      host: true,
      port: 47331,
      strictPort: true,
    },
    preview: {
      host: true,
      port: 47331,
    },
  };
});
