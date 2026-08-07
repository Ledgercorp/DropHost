import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { AuthProvider, type AuthClientLike } from "./auth/AuthProvider";
import { supabase } from "./integrations/supabase/client";
import { createSiteAssetStorage } from "./sites/siteAssetStorage";
import { createSiteRepository } from "./sites/siteRepository";
import "./index.css";

const repository = createSiteRepository(supabase);
const storage = createSiteAssetStorage(supabase);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider authClient={supabase.auth as unknown as AuthClientLike}>
        <App repository={repository} storage={storage} />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
