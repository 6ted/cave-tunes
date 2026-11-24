
import {
  Navigate,
  Outlet,
  useLocation,
} from "react-router-dom";

import { useAuth } from "../context/useAuth";

function ProtectedRoute({
  adminOnly = false,
  children,
}) {
  const {
    user,
    loading,
  } = useAuth();

  const location = useLocation();

  if (loading) {
    return (
      <div className="auth-loading">
        <div className="auth-loading-spinner" />

        <p>
          Loading Cave Tunes...
        </p>
      </div>
    );
  }

  // User must be authenticated.
  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{
          from: location.pathname,
        }}
      />
    );
  }

  // Admin check.
  const isAdmin =
    user?.is_admin === true ||
    user?.is_admin === 1 ||
    user?.is_admin === "true" ||
    user?.role === "admin";

  if (adminOnly && !isAdmin) {
    return (
      <Navigate
        to="/"
        replace
      />
    );
  }

  // Only treat an explicit false value as incomplete.
  // The backend must return profile_completed for new users.
  const profileCompleted =
    user?.profile_completed === true ||
    user?.profile_completed === 1 ||
    user?.profile_completed === "true";

  const isEditProfilePage =
    location.pathname === "/edit-profile";

  // Force incomplete users to finish onboarding.
  if (
    !profileCompleted &&
    !isEditProfilePage
  ) {
    return (
      <Navigate
        to="/edit-profile"
        replace
      />
    );
  }

  // Supports both nested Outlet routes and direct children.
  return children || <Outlet />;
}

export default ProtectedRoute;
