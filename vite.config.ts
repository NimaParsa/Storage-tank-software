import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The cloud preview serves the app through one hostname per VM. Vite's dev
// server rejects unknown Host headers, so allow exactly that hostname (passed
// in through PREVIEW_HOSTNAME) plus localhost for local checks. Host checking
// stays enabled.
const allowedHosts: string[] = [
  "localhost",
  "127.0.0.1",
  process.env.PREVIEW_HOSTNAME ?? "",
].filter(Boolean);

export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    port: 3000,
    strictPort: false,
    allowedHosts,
  },
  preview: {
    host: "0.0.0.0",
    allowedHosts,
  },
});
