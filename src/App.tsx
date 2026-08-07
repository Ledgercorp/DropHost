import { Navigate, Route, Routes } from "react-router-dom";

import { ProtectedRoute } from "./auth/ProtectedRoute";
import { ForgotPasswordPage } from "./pages/ForgotPasswordPage";
import { LoginPage } from "./pages/LoginPage";
import { MySitesPage } from "./pages/MySitesPage";
import { PublicSitePage } from "./pages/PublicSitePage";
import { RegisterPage } from "./pages/RegisterPage";
import { ResetPasswordPage } from "./pages/ResetPasswordPage";
import { UploadPage } from "./pages/UploadPage";
import type { SiteAssetStorage } from "./sites/publishSite";
import type { SiteRepository } from "./sites/siteRepository";

export type AppProps = {
  repository: SiteRepository;
  storage: SiteAssetStorage;
};

export default function App({ repository, storage }: AppProps) {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/view/:slug" element={<PublicSitePage />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<Navigate to="/sites" replace />} />
        <Route path="/sites" element={<MySitesPage repository={repository} />} />
        <Route
          path="/upload"
          element={<UploadPage repository={repository} storage={storage} />}
        />
      </Route>
    </Routes>
  );
}
