import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const isCapacitor = process.env.BUILD_TARGET === "capacitor";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // GitHub Pages necesita /nexusai-app/ como base.
  // Capacitor (APK) necesita ./ para rutas relativas dentro del webview.
  base: isCapacitor ? "./" : "/nexusai-app/",
  build: {
    rollupOptions: {
      output: {
        entryFileNames: `assets/[name]-[hash].js`,
        chunkFileNames: `assets/[name]-[hash].js`,
        assetFileNames: `assets/[name]-[hash].[ext]`,
      },
    },
  },
});
