import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const isCapacitor = Boolean(process.env.CAPACITOR_BUILD);

export default defineConfig({
  plugins: [react()],
  base: isCapacitor ? "/" : "/schengen-days/",
});
