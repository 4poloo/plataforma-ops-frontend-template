import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],

  // Evita que Vite resuelva copias "fantasma" de React
  resolve: {
    dedupe: ["react", "react-dom"],
  },

  // Asegura prebundle consistente
  optimizeDeps: {
    include: ["react", "react-dom", "react/jsx-runtime", "react-calendar"],
  },
});
