import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // aceita conexões externas
    allowedHosts: [
      ".replit.dev", // permite qualquer domínio do Replit
    ],
  },
});
