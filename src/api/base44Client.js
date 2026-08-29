import { createClient } from "@base44/sdk";

export const base44 = createClient({
  appId: process.env.VITE_BASE44_APP_ID,
  serverUrl: process.env.VITE_BASE44_BACKEND_URL,
});