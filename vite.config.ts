import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { existsSync } from "fs";
import { resolve } from "path";

// Si existe la carpeta android/ estamos en un build de Capacitor → rutas relativas
// Si no, es GitHub Pages → /nexusai-app/
const isCapacitor =
  process.env.BUILD_TARGET === "capacitor" ||
  existsSync(resolve(__dirname, "android"));

export default defineConfig({
  plugins: [react(), tailwindcss()],
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
