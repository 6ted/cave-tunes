import { API_BASE_URL as SHARED_API_BASE_URL } from "../services/api";

// ======================================================
// CAVE TUNES
// ONBOARDING PAGE
// src/pages/Onboarding.jsx
// ======================================================

import {
  useEffect,
  useState,
} from "react";

import {
  useNavigate,
} from "react-router-dom";

import {
  User,
  MapPin,
  Phone,
  Music2,
  ArrowRight,
  Loader2,
} from "lucide-react";

import {
  useAuth,
} from "../context/useAuth";

import "../styles/Onboarding.css";

const ROLES = [
  {
    value: "listener",
    label: "Listener",
    description: "Discover and enjoy music.",
  },
  {
    value: "artist",
    label: "Artist",
    description: "Release and grow your music.",
  },
  {
    value: "producer",
    label: "Producer",
    description: "Create and produce music.",
  },
  {
    value: "dj",
    label: "DJ",
    description: "Share mixes and DJ content.",
  },
  {
    value: "record_label",
    label: "Record Label",
    description: "Manage and represent artists.",
  },
  {
    value: "podcaster",
    label: "Podcaster",
    description: "Publish podcasts and shows.",
  },
];

function Onboarding() {
  const navigate = useNavigate();

  const {
    user,
    loading: authLoading,
    profileCompleted,
    refreshUser,
  } = useAuth();

  const [form, setForm] = useState(() => ({
    username: user?.username || "",
    country: user?.country || "",
    phone: user?.phone || "",
    role: user?.role || "listener",
  }));

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // ------------------------------------------------------
  // REDIRECT COMPLETED USERS
  // ------------------------------------------------------

  useEffect(() => {
    if (
      !authLoading &&
      user &&
      profileCompleted
    ) {
      navigate("/profile", {
        replace: true,
      });
    }
  }, [
    authLoading,
    user,
    profileCompleted,
    navigate,
  ]);

  // ------------------------------------------------------
  // HANDLE INPUT CHANGES
  // ------------------------------------------------------

  const handleChange = (event) => {
    const {
      name,
      value,
    } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    setError("");
  };

  // ------------------------------------------------------
  // HANDLE ROLE CHANGE
  // ------------------------------------------------------

  const handleRoleChange = (role) => {
    setForm((previous) => ({
      ...previous,
      role,
    }));

    setError("");
  };

  // ------------------------------------------------------
  // SUBMIT PROFILE
  // ------------------------------------------------------

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");

    const username = form.username.trim();
    const country = form.country.trim();
    const phone = form.phone.trim();
    const role = form.role;

    if (!username) {
      setError(
        "Please enter your username."
      );
      return;
    }

    if (username.length < 3) {
      setError(
        "Username must be at least 3 characters."
      );
      return;
    }

    if (!country) {
      setError(
        "Please enter your country."
      );
      return;
    }

    if (!phone) {
      setError(
        "Please enter your phone number."
      );
      return;
    }

    if (!role) {
      setError(
        "Please select your account type."
      );
      return;
    }

    try {
      setLoading(true);

      const token =
        localStorage.getItem("token");

      if (!token) {
        throw new Error(
          "Your session has expired. Please log in again."
        );
      }

      const API_BASE_URL = SHARED_API_BASE_URL;

      const response = await fetch(
        `${API_BASE_URL}/api/auth/update-profile`,
        {
          method: "PUT",

          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            username,
            country,
            phone,
            role,
          }),
        }
      );

      let data = null;

      try {
        data = await response.json();
      } catch {
        data = null;
      }

      if (!response.ok) {
        throw new Error(
          data?.message ||
            data?.error ||
            "Unable to complete your profile."
        );
      }

      // --------------------------------------------------
      // SAVE NEW TOKEN
      // --------------------------------------------------

      if (data?.token) {
        localStorage.setItem(
          "token",
          data.token
        );
      }

      // --------------------------------------------------
      // REFRESH AUTH USER
      // --------------------------------------------------

      await refreshUser();

      // --------------------------------------------------
      // PROFILE IS NOW COMPLETE
      // --------------------------------------------------

      navigate("/profile", {
        replace: true,
      });
    } catch (requestError) {
      console.error(
        "Onboarding error:",
        requestError
      );

      setError(
        requestError?.message ||
          "Unable to complete your profile."
      );
    } finally {
      setLoading(false);
    }
  };

  // ------------------------------------------------------
  // AUTH IS STILL INITIALIZING
  // ------------------------------------------------------

  if (authLoading) {
    return (
      <main className="onboarding-page">
        <section className="onboarding-card onboarding-loading-card">
          <div className="onboarding-brand-icon">
            <Music2 size={28} />
          </div>

          <h1>Welcome to Cave Tunes</h1>

          <p>
            Restoring your account...
          </p>

          <Loader2
            size={24}
            className="onboarding-spinner"
          />
        </section>
      </main>
    );
  }

  // ------------------------------------------------------
  // NO AUTHENTICATED USER
  // ------------------------------------------------------

  if (!user) {
    return (
      <main className="onboarding-page">
        <section className="onboarding-card">
          <div className="onboarding-brand-icon">
            <Music2 size={28} />
          </div>

          <h1>
            Welcome to Cave Tunes
          </h1>

          <p>
            Please log in to continue
            setting up your account.
          </p>

          <button
            type="button"
            onClick={() =>
              navigate("/login", {
                replace: true,
              })
            }
            className="onboarding-submit"
          >
            Go to login
          </button>
        </section>
      </main>
    );
  }

  // ------------------------------------------------------
  // ONBOARDING UI
  // ------------------------------------------------------

  return (
    <main className="onboarding-page">
      <section className="onboarding-card">

        <div className="onboarding-brand">
          <div className="onboarding-brand-icon">
            <Music2 size={25} />
          </div>

          <div>
            <strong>
              CAVE TUNES
            </strong>

            <span>
              Music lives here
            </span>
          </div>
        </div>

        <div className="onboarding-header">
          <span className="onboarding-step">
            STEP 1 OF 1
          </span>

          <h1>
            Complete your profile
          </h1>

          <p>
            Just a few details and your
            Cave Tunes account will be ready.
          </p>
        </div>

        {error && (
          <div
            className="onboarding-message onboarding-error"
            role="alert"
          >
            {error}
          </div>
        )}

        <form
          className="onboarding-form"
          onSubmit={handleSubmit}
        >

          {/* USERNAME */}

          <div className="onboarding-field">
            <label htmlFor="onboarding-username">
              Username
            </label>

            <div className="onboarding-input-wrapper">
              <User
                size={18}
                className="onboarding-input-icon"
              />

              <input
                id="onboarding-username"
                name="username"
                type="text"
                value={form.username}
                onChange={handleChange}
                placeholder="Your username"
                autoComplete="username"
                disabled={loading}
              />
            </div>
          </div>

          {/* COUNTRY */}

          <div className="onboarding-field">
            <label htmlFor="onboarding-country">
              Country
            </label>

            <div className="onboarding-input-wrapper">
              <MapPin
                size={18}
                className="onboarding-input-icon"
              />

              <input
                id="onboarding-country"
                name="country"
                type="text"
                value={form.country}
                onChange={handleChange}
                placeholder="e.g. Malawi"
                autoComplete="country-name"
                disabled={loading}
              />
            </div>
          </div>

          {/* PHONE */}

          <div className="onboarding-field">
            <label htmlFor="onboarding-phone">
              Phone number
            </label>

            <div className="onboarding-input-wrapper">
              <Phone
                size={18}
                className="onboarding-input-icon"
              />

              <input
                id="onboarding-phone"
                name="phone"
                type="tel"
                value={form.phone}
                onChange={handleChange}
                placeholder="e.g. 0991234567"
                autoComplete="tel"
                disabled={loading}
              />
            </div>
          </div>

          {/* ROLE */}

          <div className="onboarding-field">
            <label>
              What do you do?
            </label>

            <div className="onboarding-role-grid">
              {ROLES.map((role) => (
                <button
                  key={role.value}
                  type="button"
                  className={
                    form.role === role.value
                      ? "onboarding-role active"
                      : "onboarding-role"
                  }
                  onClick={() =>
                    handleRoleChange(
                      role.value
                    )
                  }
                  disabled={loading}
                >
                  <strong>
                    {role.label}
                  </strong>

                  <span>
                    {role.description}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* SUBMIT */}

          <button
            type="submit"
            className="onboarding-submit"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2
                  size={18}
                  className="onboarding-spinner"
                />

                Saving profile...
              </>
            ) : (
              <>
                Finish setup

                <ArrowRight
                  size={18}
                />
              </>
            )}
          </button>

        </form>
      </section>
    </main>
  );
}

export default Onboarding;

