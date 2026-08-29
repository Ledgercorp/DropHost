import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import base44Plugin from "@base44/vite-plugin";

export default defineConfig({
  plugins: [react(), ...base44Plugin({ legacySDKImports: true })],
});