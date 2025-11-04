import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useUser } from "@clerk/clerk-react";
import App from "./App";
import LoginPage from "./pages/LoginPage";

export default function Router() {
  const { isSignedIn, isLoaded } = useUser();

  // Wait until Clerk finishes loading user info to prevent flicker
  if (!isLoaded) return null;

  return (
    <BrowserRouter>
      <Routes>
        {/* Base URL redirect logic */}
        <Route
          path="/"
          element={
            isSignedIn ? <Navigate to="/app" replace /> : <Navigate to="/sign-in" replace />
          }
        />

        {/* Actual protected app route */}
        <Route path="/app" element={<App />} />

        {/* Sign-in page */}
        <Route path="/sign-in" element={<LoginPage />} />

        {/* Optional catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
