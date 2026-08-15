import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // El puerto queda fijo porque la API de AWS solo acepta orígenes conocidos:
  // si Vite saltara a otro puerto por estar ocupado, el login fallaría por CORS.
  server: { port: 5177, strictPort: true },
  preview: { port: 4173, strictPort: true },
});
