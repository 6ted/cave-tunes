
import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  useNavigate,
} from "react-router-dom";

import {
  ArrowLeft,
  Camera,
  Check,
  Loader2,
  Save,
  User,
  X,
} from "lucide-react";
import { useAuth } from "../context/useAuth";
import "./EditProfile.css";


/* ======================================================
   API
====================================================== */

const API_BASE_URL =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1"
    ? "http://localhost:5000"
    : window.location.origin;


/* ======================================================
   TOKEN
====================================================== */

function getToken() {
  return localStorage.getItem("token");
}
const SOCIAL_PLATFORMS = [
  { id: "instagram", name: "Instagram", placeholder: "https://www.instagram.com/yourusername/" },
  { id: "tiktok", name: "TikTok", placeholder: "https://www.tiktok.com/@yourusername" },
  { id: "facebook", name: "Facebook", placeholder: "https://www.facebook.com/yourusername" },
  { id: "youtube", name: "YouTube", placeholder: "https://www.youtube.com/@yourchannel" },
  { id: "x", name: "X / Twitter", placeholder: "https://x.com/yourusername" },
  { id: "soundcloud", name: "SoundCloud", placeholder: "https://soundcloud.com/yourusername" },
   { id: "audiomack", name: "Audiomack", placeholder: "https://audiomack.com/yourusername" },
  { id: "spotify", name: "Spotify", placeholder: "https://open.spotify.com/artist/yourartistid" },
  { id: "whatsapp", name: "WhatsApp", placeholder: "https://wa.me/265XXXXXXXXX" },
  { id: "telegram", name: "Telegram", placeholder: "https://t.me/yourusername" },
  { id: "threads", name: "Threads", placeholder: "https://www.threads.net/@yourusername" },
  { id: "snapchat", name: "Snapchat", placeholder: "https://www.snapchat.com/add/yourusername" },
  { id: "linkedin", name: "LinkedIn", placeholder: "https://www.linkedin.com/in/yourusername" },
  { id: "website", name: "Website", placeholder: "https://www.yourwebsite.com" },
];

function createEmptySocialLinks() {
  return Object.fromEntries(
    SOCIAL_PLATFORMS.map((platform) => [platform.id, ""])
  );
}

/* ======================================================
   MEDIA URL
====================================================== */

function getMediaUrl(url) {
  if (!url) {
    return "";
  }

  const value = String(url).trim();

  if (
    value.startsWith("http") ||
    value.startsWith("blob:") ||
    value.startsWith("data:")
  ) {
    return value;
  }

  if (value.startsWith("/")) {
    return `${API_BASE_URL}${value}`;
  }

  return `${API_BASE_URL}/${value}`;
}


/* ======================================================
   JSON READER
====================================================== */

async function readJson(response) {
  const text = await response.text();

  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new Error("Invalid server response.");
  }
}


/* ======================================================
   NORMALIZE USER
====================================================== */

function normalizeUser(user) {
  if (!user) {
    return null;
  }

  return {
    ...user,

    id:
      user.id ??
      user.user_id ??
      null,

    username:
      user.username ||
      user.name ||
      "",

    role:
      user.role ||
      "listener",

    country:
      user.country ||
      "",

    phone:
      user.phone ||
      "",

    profile_image_url:
      user.profile_image_url ||
      user.avatar ||
      "",
  };
}


/* ======================================================
   EDIT PROFILE
====================================================== */

export default function EditProfile() {
  const navigate = useNavigate();


  /* ====================================================
     STATE
  ==================================================== */

  const [loading, setLoading] = useState(true);

  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");

  const [successMessage, setSuccessMessage] =
    useState("");

  const [selectedImage, setSelectedImage] =
    useState(null);

  const [imagePreview, setImagePreview] =
    useState("");

const [socialLinks, setSocialLinks] = useState(
  createEmptySocialLinks
);

const [savingSocialLinks, setSavingSocialLinks] =
  useState(false);

const [socialSuccess, setSocialSuccess] =
  useState("");

const [socialError, setSocialError] =
  useState("");

const [profileForm, setProfileForm] =
    useState({
      username: "",
      role: "listener",
      country: "",
      bio: "",
      phone: "",
    });
const { refreshUser } = useAuth();
  /* ====================================================
     LOAD PROFILE
  ==================================================== */

  const loadProfile = useCallback(async () => {
    const token = getToken();

    if (!token) {
      throw new Error(
        "You must be logged in."
      );
    }

    const response = await fetch(
      `${API_BASE_URL}/api/auth/me`,
      {
        method: "GET",

        headers: {
          Authorization:
            `Bearer ${token}`,
        },
      }
    );

    const data =
      await readJson(response);

    if (!response.ok) {
      throw new Error(
        data.message ||
        "Unable to load profile."
      );
    }

    const currentUser =
      normalizeUser(
        data.user || data
      );

    if (!currentUser) {
      throw new Error(
        "Profile information was not found."
      );
    }

    return currentUser;
  }, []);


async function handleSaveSocialLinks(event) {
  event.preventDefault();

  setSocialError("");
  setSocialSuccess("");
  setSavingSocialLinks(true);

  try {
    const token = getToken();

    if (!token) {
      throw new Error("You must be logged in.");
    }

    const links = SOCIAL_PLATFORMS.map((platform) => ({
      platform: platform.id,
      url: socialLinks[platform.id].trim(),
    }));

    for (const link of links) {
      if (!link.url) continue;

      try {
        const parsedUrl = new URL(link.url);

        if (
          !["http:", "https:"].includes(parsedUrl.protocol)
        ) {
          throw new Error();
        }
      } catch {
        throw new Error(
          `Please enter a valid URL for ${
            SOCIAL_PLATFORMS.find(
              (platform) => platform.id === link.platform
            ).name
          }.`
        );
      }
    }

    const response = await fetch(
      `${API_BASE_URL}/api/auth/social-links`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ links }),
      }
    );

    const data = await readJson(response);

    if (!response.ok) {
      throw new Error(
        data.message || "Unable to save social links."
      );
    }

    setSocialSuccess("Social links saved successfully.");

    const updatedLinks = createEmptySocialLinks();

    (data.social_links || []).forEach((link) => {
      if (
        Object.prototype.hasOwnProperty.call(
          updatedLinks,
          link.platform
        )
      ) {
        updatedLinks[link.platform] = link.url;
      }
    });

    setSocialLinks(updatedLinks);

  } catch (err) {
    setSocialError(
      err.message || "Unable to save social links."
    );
  } finally {
    setSavingSocialLinks(false);
  }
}

  /* ====================================================
     INITIAL PROFILE LOAD
  ==================================================== */

  useEffect(() => {
    let cancelled = false;

    async function initializeProfile() {
      try {
        const currentUser =
          await loadProfile();

        if (cancelled) {
          return;
        }

        setProfileForm({
          username:
            currentUser.username,

          role:
            currentUser.role,

          country:
            currentUser.country,

bio:
    currentUser.bio || "",

          phone:
            currentUser.phone,
        });

        setImagePreview(
          getMediaUrl(
            currentUser.profile_image_url
          )
        );

      } catch (err) {
        if (!cancelled) {
          setError(
            err.message ||
            "Unable to load profile."
          );
        }

      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    initializeProfile();

    return () => {
      cancelled = true;
    };
  }, [loadProfile]);

useEffect(() => {
  let cancelled = false;

  async function initializeSocialLinks() {
    try {
      const token = getToken();

      if (!token) return;

      const response = await fetch(
        `${API_BASE_URL}/api/auth/social-links`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await readJson(response);

      if (!response.ok) {
        throw new Error(
          data.message || "Unable to load social links."
        );
      }

      if (cancelled) return;

      const loadedLinks = createEmptySocialLinks();

      (data.social_links || []).forEach((link) => {
        if (
          Object.prototype.hasOwnProperty.call(
            loadedLinks,
            link.platform
          )
        ) {
          loadedLinks[link.platform] = link.url;
        }
      });

      setSocialLinks(loadedLinks);

    } catch (err) {
      if (!cancelled) {
        setSocialError(err.message);
      }
    }
  }

  initializeSocialLinks();

  return () => {
    cancelled = true;
  };
}, []);
  /* ====================================================
     FORM CHANGE
  ==================================================== */

  function handleFormChange(event) {
    const {
      name,
      value,
    } = event.target;

    setProfileForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    setError("");
    setSuccessMessage("");
  }


  /* ====================================================
     IMAGE CHANGE
  ==================================================== */

  function handleImageChange(event) {
    const file =
      event.target.files?.[0];

    if (!file) {
      return;
    }

    setSelectedImage(file);

    setError("");
    setSuccessMessage("");

    const reader =
      new FileReader();

    reader.onload = () => {
      if (
        typeof reader.result ===
        "string"
      ) {
        setImagePreview(
          reader.result
        );
      }
    };

    reader.readAsDataURL(file);
  }


  /* ====================================================
     SAVE PROFILE
  ==================================================== */

  async function handleSaveProfile(event) {
    event.preventDefault();

    setError("");
    setSuccessMessage("");
    setSaving(true);

    try {
      const token = getToken();

      if (!token) {
        throw new Error(
          "You must be logged in."
        );
      }


      /* ================================================
         BASIC VALIDATION
      ================================================= */

      const username =
        profileForm.username.trim();

      if (!username) {
        throw new Error(
          "Username is required."
        );
      }

      if (username.length < 3) {
        throw new Error(
          "Username must be at least 3 characters."
        );
      }

if (!profileForm.country.trim()) {
  throw new Error(
    "Please select your country to complete your profile."
  );
}
      /* ================================================
         FORM DATA
      ================================================= */

      const formData =
        new FormData();

      formData.append(
        "username",
        username
      );

      formData.append(
        "role",
        profileForm.role
      );

      formData.append(
        "country",
        profileForm.country
      );

      formData.append(
    "bio",
    profileForm.bio.trim()
);

      formData.append(
        "phone",
        profileForm.phone.trim()
      );

      if (selectedImage) {
        formData.append(
          "profile_image",
          selectedImage
        );
      }


      /* ================================================
         UPDATE PROFILE
      ================================================= */

      const response =
        await fetch(
          `${API_BASE_URL}/api/auth/profile`,
          {
            method: "POST",

            headers: {
              Authorization:
                `Bearer ${token}`,
            },

            body: formData,
          }
        );


      const data =
        await readJson(response);


      if (!response.ok) {
        throw new Error(
          data.message ||
          "Profile update failed."
        );
      }


      /* ================================================
         SUCCESS
      ================================================= */

      setSuccessMessage(
        "Profile updated successfully."
      );

      setSelectedImage(null);


      /* ================================================
         RELOAD SAVED PROFILE
      ================================================= */

      const updatedUser =
  await refreshUser();

if (!updatedUser) {
  throw new Error(
    "Unable to refresh your profile."
  );
}

const profileCompleted =
  updatedUser.profile_completed === true ||
  updatedUser.profile_completed === 1 ||
  updatedUser.profile_completed === "true";

if (!profileCompleted) {
  throw new Error(
    "Your profile was saved, but the server has not marked it as complete. Please try again."
  );
}


      setProfileForm({
        username:
          updatedUser.username,

        role:
          updatedUser.role,

        country:
          updatedUser.country,

bio:
    updatedUser.bio || "",

        phone:
          updatedUser.phone,
      });


      setImagePreview(
        getMediaUrl(
          updatedUser.profile_image_url
        )
      );


      /* ================================================
         CONTINUE TO PROFILE
         
         IMPORTANT:
         replace: true prevents the user from
         returning to the signup/onboarding step
         through browser history.
      ================================================= */

      window.setTimeout(() => {
        navigate("/profile", {
          replace: true,
        });
      }, 700);

    } catch (err) {
      console.error(
        "Profile update error:",
        err
      );

      setError(
        err.message ||
        "Unable to update profile."
      );

    } finally {
      setSaving(false);
    }
  }


  /* ====================================================
     CANCEL / BACK
     
     For normal profile editing this goes back to
     Profile.

     IMPORTANT:
     If this page is being used as mandatory
     onboarding, we will later prevent this action
     from bypassing onboarding.
  ==================================================== */

  function handleCancel() {
    navigate("/profile");
  }


  /* ====================================================
     LOADING
  ==================================================== */

  if (loading) {
    return (
      <main className="page edit-profile-page">

        <div className="edit-profile-loading">

          <Loader2
            className="loading-spinner"
            size={30}
          />

          <span>
            Loading profile...
          </span>

        </div>

      </main>
    );
  }


  /* ====================================================
     PAGE
  ==================================================== */

  return (
    <main className="page edit-profile-page">

      {/* ==================================================
          HEADER
      ================================================== */}

      <header className="page-header">

        <button
          type="button"
          className="edit-profile-back"
          onClick={handleCancel}
          disabled={saving}
        >
          <ArrowLeft size={18} />

          Back to Profile
        </button>

        <h1>
          Edit Profile
        </h1>

        <p>
          Update your Cave Tunes profile information.
        </p>

      </header>


      {/* ==================================================
          MESSAGES
      ================================================== */}

      {successMessage && (
        <div
          className="profile-success"
          role="status"
        >
          <Check size={17} />

          {successMessage}
        </div>
      )}


      {error && (
        <div
          className="error-message"
          role="alert"
        >
          {error}
        </div>
      )}


      {/* ==================================================
          EDIT CARD
      ================================================== */}

      <section className="edit-profile-panel">

        <div className="edit-profile-header">

          <div>

            <h2>
              Profile Information
            </h2>

            <p>
              Change your profile photo and account
              information.
            </p>

          </div>

          <button
            type="button"
            className="edit-close-button"
            onClick={handleCancel}
            aria-label="Close"
            disabled={saving}
          >
            <X size={20} />
          </button>

        </div>


        {/* ==================================================
            FORM
        ================================================== */}

        <form
          onSubmit={handleSaveProfile}
          className="edit-profile-form"
        >

          {/* ==============================================
              PROFILE IMAGE
          =============================================== */}

          <div className="edit-image-section">

            <div className="edit-image-wrapper">

              {imagePreview ? (
                <img
                  src={imagePreview}
                  alt="Profile preview"
                />
              ) : (
                <User size={52} />
              )}

            </div>


            <div className="edit-image-content">

              <h3>
                Profile Photo
              </h3>

              <p>
                Choose a clear image for your
                Cave Tunes profile.
              </p>

              <label
                className="change-photo-button"
              >

                <Camera size={17} />

                Change Photo

                <input
                  type="file"
                  accept="image/*"
                  hidden
                  disabled={saving}
                  onChange={
                    handleImageChange
                  }
                />

              </label>

            </div>

          </div>


          {/* ==============================================
              PROFILE FORM GRID
          =============================================== */}

          <div className="profile-form-grid">

            {/* USERNAME */}

            <div className="profile-field">

              <label htmlFor="username">
                Username
              </label>

              <input
                id="username"
                name="username"
                type="text"
                value={
                  profileForm.username
                }
                onChange={
                  handleFormChange
                }
                placeholder="Username"
                autoComplete="username"
                disabled={saving}
              />

            </div>


            {/* ROLE */}

            <div className="profile-field">

              <label htmlFor="role">
                Account Role
              </label>

              <select
                id="role"
                name="role"
                value={
                  profileForm.role
                }
                onChange={
                  handleFormChange
                }
                disabled={saving}
              >

                <option value="artist">
                  Artist
                </option>

                <option value="listener">
                  Listener
                </option>

                <option value="producer">
                  Producer
                </option>

                <option value="dj">
                  DJ
                </option>

                  <option value="record_label">
                  Record Label
                </option>

              </select>

            </div>


            {/* COUNTRY */}

            <div className="profile-field">

              <label htmlFor="country">
                Country
              </label>

              <select
                id="country"
                name="country"
                value={
                  profileForm.country
                }
                onChange={
                  handleFormChange
                }
                disabled={saving}
              >

                <option value="">
                  Select Country
                </option>

                <option value="Malawi">
                  Malawi
                </option>

                <option value="Nigeria">
                  Nigeria
                </option>

                <option value="South Africa">
                  South Africa
                </option>

                <option value="Ghana">
                  Ghana
                </option>

                <option value="Kenya">
                  Kenya
                </option>

                <option value="Tanzania">
                  Tanzania
                </option>

                <option value="Zambia">
                  Zambia
                </option>

                <option value="Zimbabwe">
                  Zimbabwe
                </option>

                <option value="United Kingdom">
                  United Kingdom
                </option>

                <option value="United States">
                  United States
                </option>

                <option value="Canada">
                  Canada
                </option>

                <option value="Australia">
                  Australia
                </option>

              </select>

            </div>
{/* BIO */}

<div className="profile-field profile-bio-field">

    <label htmlFor="bio">
        About Me
    </label>

    <textarea
        id="bio"
        name="bio"
        value={profileForm.bio}
        onChange={handleFormChange}
        placeholder="Tell people about yourself, your music, your experience..."
        rows={5}
        maxLength={1000}
        disabled={saving}
    />

    <small>
        {profileForm.bio.length}/1000 characters
    </small>

</div>

            {/* PHONE */}

            <div className="profile-field">

              <label htmlFor="phone">
                Phone
              </label>

              <input
                id="phone"
                name="phone"
                type="tel"
                value={
                  profileForm.phone
                }
                onChange={
                  handleFormChange
                }
                placeholder="Phone number"
                autoComplete="tel"
                disabled={saving}
              />

            </div>

          </div>


          {/* ==============================================
              ACTIONS
          =============================================== */}

          <div className="edit-profile-actions">

            <button
              type="button"
              className="cancel-profile-button"
              onClick={handleCancel}
              disabled={saving}
            >
              <X size={17} />

              Cancel
            </button>


            <button
              type="submit"
              className="save-profile-button"
              disabled={saving}
            >

              {saving ? (
                <>
                  <Loader2
                    size={17}
                    className="loading-spinner"
                  />

                  Saving...
                </>
              ) : (
                <>
                  <Save size={17} />

                  Save Changes
                </>
              )}

            </button>

          </div>

        </form>

        {/* ==================================================
    SOCIAL MEDIA LINKS
================================================== */}

<section className="social-links-editor">

  <div className="social-links-heading">
    <div>
      <h2>Social Media Links</h2>

      <p>
        Connect your social media accounts so fans
        can find and follow you.
      </p>
    </div>
  </div>

  {socialSuccess && (
    <div className="social-editor-success" role="status">
      <Check size={16} />
      {socialSuccess}
    </div>
  )}

  {socialError && (
    <div className="social-editor-error" role="alert">
      {socialError}
    </div>
  )}

  <form onSubmit={handleSaveSocialLinks}>

    <div className="social-links-grid">

      {SOCIAL_PLATFORMS.map((platform) => (
        <div
          className="social-link-field"
          key={platform.id}
        >

          <label htmlFor={`social-${platform.id}`}>
            {platform.name}
          </label>

          <input
            id={`social-${platform.id}`}
            type="url"
            value={socialLinks[platform.id] || ""}
            placeholder={platform.placeholder}
            disabled={savingSocialLinks}
            onChange={(event) => {
              const value = event.target.value;

              setSocialLinks((previous) => ({
                ...previous,
                [platform.id]: value,
              }));

              setSocialSuccess("");
              setSocialError("");
            }}
          />

        </div>
      ))}

    </div>

    <div className="social-links-actions">

      <button
        type="submit"
        className="save-profile-button"
        disabled={savingSocialLinks}
      >
        {savingSocialLinks ? (
          <>
            <Loader2
              size={17}
              className="loading-spinner"
            />
            Saving Social Links...
          </>
        ) : (
          <>
            <Save size={17} />
            Save Social Links
          </>
        )}
      </button>

    </div>

  </form>

</section>

      </section>

    </main>
  );
}

