
import {
  useEffect,
  useState,
} from "react";

import {
  Eye,
  EyeOff,
  Lock,
  Mail,
  Music2,
} from "lucide-react";

import { useNavigate } from "react-router-dom";

import { useAuth } from "../context/useAuth";
import "../styles/Login.css";
function Login() {
  const navigate = useNavigate();

  const {
    login,
    user,
    isAdmin,
    isAuthenticated,
    loading,
  } = useAuth();

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [showPassword, setShowPassword] =
    useState(false);

  const [error, setError] =
    useState("");

  const [submitting, setSubmitting] =
    useState(false);

  // ======================================================
  // REDIRECT ALREADY LOGGED-IN USER
  // ======================================================

useEffect(() => {
  if (
    loading ||
    !isAuthenticated ||
    !user
  ) {
    return;
  }

  if (isAdmin) {
    navigate("/admin-dashboard", {
      replace: true,
    });

    return;
  }

  const profileCompleted =
    user.profile_completed === true ||
    user.profile_completed === 1 ||
    user.profile_completed === "true";

  navigate(
    profileCompleted
      ? "/profile"
      : "/edit-profile",
    {
      replace: true,
    }
  );
}, [
  loading,
  isAuthenticated,
  user,
  isAdmin,
  navigate,
]);
  // ======================================================
  // LOGIN
  // ======================================================
const handleSubmit = async (event) => {
  event.preventDefault();

  setError("");

  const cleanEmail = email.trim();

  if (!cleanEmail) {
    setError("Please enter your email address.");
    return;
  }

  if (!password) {
    setError("Please enter your password.");
    return;
  }

  try {
    setSubmitting(true);

    const response = await login(
      cleanEmail,
      password
    );

    if (
      !response?.requiresOtp ||
      !response?.challengeToken
    ) {
      throw new Error(
        "Unable to start email verification."
      );
    }

    const params = new URLSearchParams({
      challenge: response.challengeToken,
      email: response.email || cleanEmail,
    });

    navigate(
      `/verify-otp?${params.toString()}`,
      {
        replace: true,
      }
    );

  } catch (loginError) {
    console.error(
      "LOGIN ERROR:",
      loginError
    );

    setError(
      loginError?.message ||
      "Unable to login. Please check your details."
    );

  } finally {
    setSubmitting(false);
  }
};
// ======================================================
// GOOGLE LOGIN
// ======================================================

const handleGoogleLogin = () => {
  const API_BASE_URL =
    import.meta.env.VITE_API_BASE_URL ||
    (import.meta.env.DEV
      ? `http://${window.location.hostname}:5000`
      : window.location.origin);

  window.location.href =
    `${API_BASE_URL}/api/auth/google`;
};
  // ======================================================
  // LOADING
  // ======================================================

  if (loading) {
    return (
      <main className="auth-page">
        <div className="auth-loading">
          <Music2 size={28} />

          <p>
            Checking your account...
          </p>
        </div>
      </main>
    );
  }

  // ======================================================
  // PAGE
  // ======================================================

  return (
    <main className="auth-page">

      <div className="auth-container">

        {/* BRAND */}

        <div className="auth-brand">

          <div className="auth-logo">
            <Music2 size={25} />
          </div>

          <span>
            CAVE TUNES
          </span>

        </div>

        {/* HEADER */}

        <div className="auth-header">

          <h1>
            Welcome back
          </h1>

          <p>
            Login to continue listening
            to Cave Tunes.
          </p>

        </div>

        {/* ERROR */}

        {error && (
          <div
            className="auth-error"
            role="alert"
          >
            {error}
          </div>
        )}

        {/* LOGIN FORM */}

        <form
          className="auth-form"
          onSubmit={handleSubmit}
        >

          {/* EMAIL */}

          <div className="auth-field">

            <label htmlFor="login-email">
              Email address
            </label>

            <div className="auth-input-wrapper">

              <Mail
                size={18}
                className="auth-input-icon"
              />

              <input
                id="login-email"
                type="email"
                value={email}
                placeholder="you@example.com"
                autoComplete="email"
                onChange={(event) =>
                  setEmail(
                    event.target.value
                  )
                }
                disabled={submitting}
              />

            </div>

          </div>

          {/* PASSWORD */}

          <div className="auth-field">

            <label htmlFor="login-password">
              Password
            </label>

            <div className="auth-input-wrapper">

              <Lock
                size={18}
                className="auth-input-icon"
              />

              <input
                id="login-password"
                type={
                  showPassword
                    ? "text"
                    : "password"
                }
                value={password}
                placeholder="Enter your password"
                autoComplete="current-password"
                onChange={(event) =>
                  setPassword(
                    event.target.value
                  )
                }
                disabled={submitting}
              />

              <button
                type="button"
                className="password-toggle"
                onClick={() =>
                  setShowPassword(
                    (previous) =>
                      !previous
                  )
                }
                aria-label={
                  showPassword
                    ? "Hide password"
                    : "Show password"
                }
                disabled={submitting}
              >
                {showPassword ? (
                  <EyeOff size={18} />
                ) : (
                  <Eye size={18} />
                )}
              </button>

            </div>

          </div>

          {/* LOGIN */}

          <button
            type="submit"
            className="auth-submit"
            disabled={submitting}
          >
            {submitting
              ? "Logging in..."
              : "Login"}
          </button>

        </form>

        {/* DIVIDER */}

        <div className="auth-divider">

          <span />

          <strong>
            OR
          </strong>

          <span />

        </div>

        {/* GOOGLE */}

        <button
          type="button"
          className="google-button"
          onClick={handleGoogleLogin}
          disabled={submitting}
        >

          <span className="google-icon">
            G
          </span>

          Continue with Google

        </button>

        {/* SIGN UP */}

        <div className="auth-switch">

          <span>
            Don't have a Cave Tunes
            account?
          </span>

          <button
            type="button"
            onClick={() =>
              navigate("/signup")
            }
          >
            Create account
          </button>

        </div>

      </div>

    </main>
  );
}

export default Login;

