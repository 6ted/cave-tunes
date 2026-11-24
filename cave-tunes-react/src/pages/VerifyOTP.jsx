
import { useState, useEffect } from "react";

import {
  useNavigate,
  useSearchParams,
} from "react-router-dom";

import { useAuth } from "../context/AuthContext";

import {
  ShieldCheck,
  Mail,
  RefreshCw,
  ArrowLeft,
} from "lucide-react";

import "./VerifyOTP.css";

export default function VerifyOTP() {
  const navigate = useNavigate();

  const [searchParams] = useSearchParams();

  const {
    verifyOtp,
    resendOtp,
  } = useAuth();

  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const challengeToken =
    searchParams.get("challenge");

  const email =
    searchParams.get("email") || "";

  const source =
    searchParams.get("source");

  const missingChallenge = !challengeToken;

  const [cooldown, setCooldown] = useState(0);

  // ======================================================
  // RESEND COUNTDOWN
  // ======================================================

  useEffect(() => {
    if (cooldown <= 0) {
      return;
    }

    const timer = window.setTimeout(() => {
      setCooldown((previous) => previous - 1);
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [cooldown]);

  // ======================================================
  // VERIFY OTP
  // ======================================================

  const handleVerify = async (event) => {
    event.preventDefault();

    setError("");
    setMessage("");

    if (!challengeToken) {
      setError(
        "Verification session not found."
      );

      return;
    }

    if (!/^\d{6}$/.test(code)) {
      setError(
        "Please enter your six-digit OTP."
      );

      return;
    }

    try {
      setLoading(true);

      const response = await verifyOtp(
        challengeToken,
        code
      );

      const verifiedUser = response?.user;

      if (!verifiedUser) {
        throw new Error(
          "Your account was verified, but your profile could not be loaded."
        );
      }

      setMessage(
        "Email verified successfully."
      );

      const isAdmin =
        verifiedUser.is_admin === true ||
        verifiedUser.is_admin === 1 ||
        verifiedUser.is_admin === "true" ||
        verifiedUser.role === "admin";

      const profileCompleted =
        verifiedUser.profile_completed === true ||
        verifiedUser.profile_completed === 1 ||
        verifiedUser.profile_completed === "true";

      let destination = "/profile";

      if (!profileCompleted) {
        destination = "/edit-profile";
      } else if (isAdmin) {
        destination = "/admin-dashboard";
      }

      navigate(destination, {
        replace: true,
      });

    } catch (err) {
      setError(
        err.message ||
        "OTP verification failed."
      );

    } finally {
      setLoading(false);
    }
  };

  // ======================================================
  // RESEND OTP
  // ======================================================

  const handleResend = async () => {
    setError("");
    setMessage("");

    if (!challengeToken) {
      setError(
        "Verification session not found."
      );

      return;
    }

    try {
      setResending(true);

      const response = await resendOtp(
        challengeToken
      );

      setMessage(
        response?.message ||
        "A new verification code has been sent."
      );

      setCode("");
      setCooldown(60);

    } catch (err) {
      setError(
        err.message ||
        "Unable to resend verification code."
      );

    } finally {
      setResending(false);
    }
  };

  // ======================================================
  // PAGE
  // ======================================================

  return (
    <div className="otp-page">

      <div className="otp-card">

        <div className="otp-icon">
          <ShieldCheck size={34} />
        </div>

        <h1>
          Verify your email
        </h1>

        <p className="otp-description">
          We sent a six-digit verification code to
          your email address.
        </p>

        {email && (
          <div className="otp-email">
            <Mail size={17} />
            <span>{email}</span>
          </div>
        )}

        {source === "google" && (
          <p className="otp-google-message">
            Complete email verification to finish
            signing in with Google.
          </p>
        )}

        <form onSubmit={handleVerify}>

          <label htmlFor="otp-code">
            Verification code
          </label>

          <input
            id="otp-code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="000000"
            value={code}
            onChange={(event) => {
              setCode(
                event.target.value
                  .replace(/\D/g, "")
                  .slice(0, 6)
              );
            }}
            disabled={loading}
          />

          {missingChallenge && (
            <p className="otp-error">
              Your verification session is missing.
              Please sign in again.
            </p>
          )}

          {error && (
            <p className="otp-error">
              {error}
            </p>
          )}

          {message && (
            <div className="otp-success">
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={
              loading ||
              missingChallenge
            }
          >
            {loading
              ? "Verifying..."
              : "Verify email"}
          </button>

        </form>

        <div className="otp-resend">

          <span>
            Didn't receive the code?
          </span>

          <button
            type="button"
            onClick={handleResend}
            disabled={
              resending ||
              cooldown > 0 ||
              !challengeToken
            }
          >
            <RefreshCw size={15} />

            {resending
              ? "Sending..."
              : cooldown > 0
                ? `Resend in ${cooldown}s`
                : "Resend code"}
          </button>

        </div>

        <button
          type="button"
          className="otp-back"
          onClick={() => navigate("/login")}
          disabled={loading}
        >
          <ArrowLeft size={16} />
          Back to login
        </button>

      </div>

    </div>
  );
}
