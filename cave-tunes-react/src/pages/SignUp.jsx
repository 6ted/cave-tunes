
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  User,
  Music2,
} from "lucide-react";

import { useAuth } from "../context/useAuth";
import "../styles/Signup.css";
function SignUp() {
  const navigate = useNavigate();

  const { register } = useAuth();

  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [showPassword, setShowPassword] = useState(false);

  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const [loading, setLoading] = useState(false);

  const [googleLoading, setGoogleLoading] =
    useState(false);

  const [error, setError] = useState("");

  const [success, setSuccess] = useState("");

  // ======================================================
  // INPUT CHANGE
  // ======================================================

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    setError("");
    setSuccess("");
  };

  // ======================================================
  // GOOGLE AUTH
  // ======================================================

  const handleGoogleSignup = () => {
    setError("");
    setSuccess("");
    setGoogleLoading(true);

    const API_BASE_URL =
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1"
        ? "http://localhost:5000"
        : window.location.origin;

    window.location.href =
      `${API_BASE_URL}/api/auth/google`;
  };

  // ======================================================
  // SUBMIT
  // ======================================================

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    const username = form.username.trim();

    const email =
      form.email.trim().toLowerCase();

    const password = form.password;

    const confirmPassword =
      form.confirmPassword;

    // ====================================================
    // VALIDATION
    // ====================================================

    if (
      !username ||
      !email ||
      !password ||
      !confirmPassword
    ) {
      setError(
        "Please fill in all fields."
      );

      return;
    }

    if (username.length < 3) {
      setError(
        "Username must be at least 3 characters."
      );

      return;
    }

    if (password.length < 6) {
      setError(
        "Password must be at least 6 characters."
      );

      return;
    }

    if (password !== confirmPassword) {
      setError(
        "Passwords do not match."
      );

      return;
    }

    try {
      setLoading(true);

const response = await register({
  username,
  email,
  password,
  role: "listener",
});

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
  email: response.email || email,
});

navigate(
  `/verify-otp?${params.toString()}`,
  {
    replace: true,
  }
);

    } catch (requestError) {
      console.error(
        "Registration error:",
        requestError
      );

      setError(
        requestError?.message ||
          "Unable to create your account."
      );

    } finally {
      setLoading(false);
    }
  };

  // ======================================================
  // PAGE
  // ======================================================

  return (
    <main className="auth-page">

      <section className="signup-card">

        {/* ==================================================
            BRAND
        ================================================== */}

        <div className="signup-brand">

          <div className="signup-brand-icon">
            <Music2 size={25} />
          </div>

          <div className="signup-brand-text">

            <strong>
              CAVE TUNES
            </strong>

            <span>
              Music lives here
            </span>

          </div>

        </div>


        {/* ==================================================
            HEADER
        ================================================== */}

        <div className="signup-header">

          <h1>
            Create your account
          </h1>

          <p>
            Join Cave Tunes and discover
            music from artists around the world.
          </p>

        </div>


        {/* ==================================================
            ERROR
        ================================================== */}

        {error && (
          <div
            className="signup-message signup-error"
            role="alert"
          >
            {error}
          </div>
        )}


        {/* ==================================================
            SUCCESS
        ================================================== */}

        {success && (
          <div
            className="signup-message signup-success"
            role="status"
          >
            {success}
          </div>
        )}


      


        {/* ==================================================
            FORM
        ================================================== */}

        <form
          className="signup-form"
          onSubmit={handleSubmit}
        >

          {/* USERNAME */}

          <div className="signup-field">

            <label htmlFor="signup-username">
              Username
            </label>

            <div className="signup-input-wrapper">

              <User
                size={18}
                className="signup-input-icon"
              />

              <input
                id="signup-username"
                name="username"
                type="text"
                value={form.username}
                onChange={handleChange}
                placeholder="Enter your username"
                autoComplete="username"
                disabled={loading || googleLoading}
              />

            </div>

          </div>


          {/* EMAIL */}

          <div className="signup-field">

            <label htmlFor="signup-email">
              Email address
            </label>

            <div className="signup-input-wrapper">

              <Mail
                size={18}
                className="signup-input-icon"
              />

              <input
                id="signup-email"
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                placeholder="you@example.com"
                autoComplete="email"
                disabled={loading || googleLoading}
              />

            </div>

          </div>


          {/* PASSWORD */}

          <div className="signup-field">

            <label htmlFor="signup-password">
              Password
            </label>

            <div className="signup-input-wrapper">

              <Lock
                size={18}
                className="signup-input-icon"
              />

              <input
                id="signup-password"
                name="password"
                type={
                  showPassword
                    ? "text"
                    : "password"
                }
                value={form.password}
                onChange={handleChange}
                placeholder="Create a password"
                autoComplete="new-password"
                disabled={loading || googleLoading}
              />

              <button
                type="button"
                className="signup-password-toggle"
                onClick={() =>
                  setShowPassword(
                    (previous) => !previous
                  )
                }
                aria-label={
                  showPassword
                    ? "Hide password"
                    : "Show password"
                }
                disabled={
                  loading ||
                  googleLoading
                }
              >

                {showPassword ? (
                  <EyeOff size={18} />
                ) : (
                  <Eye size={18} />
                )}

              </button>

            </div>

          </div>


          {/* CONFIRM PASSWORD */}

          <div className="signup-field">

            <label htmlFor="signup-confirm-password">
              Confirm password
            </label>

            <div className="signup-input-wrapper">

              <Lock
                size={18}
                className="signup-input-icon"
              />

              <input
                id="signup-confirm-password"
                name="confirmPassword"
                type={
                  showConfirmPassword
                    ? "text"
                    : "password"
                }
                value={form.confirmPassword}
                onChange={handleChange}
                placeholder="Confirm your password"
                autoComplete="new-password"
                disabled={loading || googleLoading}
              />

              <button
                type="button"
                className="signup-password-toggle"
                onClick={() =>
                  setShowConfirmPassword(
                    (previous) => !previous
                  )
                }
                aria-label={
                  showConfirmPassword
                    ? "Hide password"
                    : "Show password"
                }
                disabled={
                  loading ||
                  googleLoading
                }
              >

                {showConfirmPassword ? (
                  <EyeOff size={18} />
                ) : (
                  <Eye size={18} />
                )}

              </button>

            </div>

          </div>


          {/* SUBMIT */}

          <button
            type="submit"
            className="signup-submit"
            disabled={
              loading ||
              googleLoading
            }
          >

            {loading
              ? "Creating account..."
              : "Create account"}

          </button>

        </form>

       
        {/* ==================================================
            DIVIDER
        ================================================== */}

        <div className="auth-divider">

          <span />

          <strong>
            OR
          </strong>

          <span />

        </div>

  {/* ==================================================
            GOOGLE SIGN UP
        ================================================== */}

        <button
          type="button"
          className="google-button"
          onClick={handleGoogleSignup}
          disabled={loading || googleLoading}
        >

          <span className="google-icon">
           G
          </span>

          <span>
            {googleLoading
              ? "Connecting to Google..."
              : "Continue with Google"}
          </span>

        </button>


     

        {/* ==================================================
            LOGIN
        ================================================== */}

        <div className="signup-footer">

          <span>
            Already have a Cave Tunes account?
          </span>

          <Link to="/login">
            Log in
          </Link>

        </div>

      </section>

    </main>
  );
}

export default SignUp;

