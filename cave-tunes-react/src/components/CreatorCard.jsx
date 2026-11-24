import { API_BASE_URL as SHARED_API_BASE_URL } from "../services/api";

import {
  MapPin,
  Users,
  User,
} from "lucide-react";

import "./CreatorCard.css";


const API_BASE_URL = SHARED_API_BASE_URL;


/* ======================================================
   MEDIA URL
====================================================== */

function getMediaUrl(url) {

  if (!url) {
    return "";
  }

  const value =
    String(url).trim();

  if (
    value.startsWith("http://") ||
    value.startsWith("https://")
  ) {
    return value;
  }

  if (value.startsWith("/")) {
    return `${API_BASE_URL}${value}`;
  }

  return `${API_BASE_URL}/${value}`;

}

/* =====================================================
   VERIFIED BADGES
   STANDARD + MASTER VERIFICATION
===================================================== */

function VerifiedBadge({
  verificationLevel,
  verified,
}) {

  const level = String(
    verificationLevel || "none"
  )
    .toLowerCase()
    .trim();

  // MASTER VERIFIED
  if (level === "master") {

    return (

      <span
        className="creator-master-verified-badge"
        title="Master Verified by Cave Tunes"
        aria-label="Master Verified by Cave Tunes"
      >

        <svg
          viewBox="0 0 24 24"
          width="20"
          height="20"
          fill="none"
          aria-hidden="true"
        >

          <path
            d="M12 2L14.7 4.1L18 4.3L19.7 7L22 9L21 12L22 15L19.7 17L18 19.7L14.7 19.9L12 22L9.3 19.9L6 19.7L4.3 17L2 15L3 12L2 9L4.3 7L6 4.3L9.3 4.1L12 2Z"
            fill="#21aa2c"
            stroke="#21aa2c"
            strokeWidth="1"
          />

          <path
            d="M8 12.2L10.5 14.5L16 9"
            stroke="#FFFFFF"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          <path
            d="M12 4.5L13 6.2L15 6.5L13.5 8L13.8 10L12 9L10.2 10L10.5 8L9 6.5L11 6.2L12 4.5Z"
            fill="#21aa2c"
          />

        </svg>

        <span>
          
        </span>

      </span>

    );

  }

  // STANDARD VERIFIED
  if (verified || level === "verified") {

    return (

      <span
        className="creator-verified-badge"
        title="Verified by Cave Tunes"
        aria-label="Verified by Cave Tunes"
      >

        <svg
          viewBox="0 0 24 24"
          width="20"
          height="20"
          fill="none"
        >

          <path
            d="M12 2L14.7 4.1L18 4.3L19.7 7L22 9L21 12L22 15L19.7 17L18 19.7L14.7 19.9L12 22L9.3 19.9L6 19.7L4.3 17L2 15L3 12L2 9L4.3 7L6 4.3L9.3 4.1L12 2Z"
            fill="#a79b7c"
          />

          <path
            d="M8 12.2L10.5 14.5L16 9"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

        </svg>

      </span>

    );

  }

  // NO VERIFICATION
  return null;

}

/* ======================================================
   CREATOR CARD
====================================================== */

function CreatorCard({
  creator,
  onClick,
  isOwnProfile = false,
}) {

  console.log("CREATOR CARD DATA:", creator);
console.log("VERIFICATION LEVEL:", creator?.verification_level);
console.log("VERIFIED:", creator?.verified);

  /* ====================================================
     CREATOR INFORMATION
  ==================================================== */

  const name =
    creator?.username ||
    creator?.artist_name ||
    creator?.name ||
    "Unknown Creator";


  const country =
    creator?.country ||
    "Country not set";


  const image =
    creator?.profileImage ||
    creator?.profile_image_url ||
    creator?.profile_image ||
    creator?.avatar ||
    "";


  const role =
    creator?.role ||
    "creator";


  /* ====================================================
     CARD CLICK
  ==================================================== */

  const handleClick = () => {

    /*
      Never allow the owner to open their own card.
    */

    if (isOwnProfile) {

      console.log(
        "CreatorCard: own profile click blocked."
      );

      return;

    }


    onClick?.();

  };


  /* ====================================================
     KEYBOARD
  ==================================================== */

  const handleKeyDown =
    (event) => {

      /*
        Own profile is completely disabled.
      */

      if (isOwnProfile) {
        return;
      }


      if (
        event.key === "Enter" ||
        event.key === " "
      ) {

        event.preventDefault();

        handleClick();

      }

    };


  /* ====================================================
     CARD
  ==================================================== */

  return (

    <article

      className={`creator-card ${
        isOwnProfile
          ? "creator-card-own-profile"
          : ""
      }`}

      onClick={
        isOwnProfile
          ? undefined
          : handleClick
      }

      role={
        isOwnProfile
          ? undefined
          : "button"
      }

      tabIndex={
        isOwnProfile
          ? -1
          : 0
      }

      onKeyDown={
        isOwnProfile
          ? undefined
          : handleKeyDown
      }

      aria-disabled={
        isOwnProfile
          ? "true"
          : "false"
      }

    >


      {/* ==================================================
          IMAGE
      ================================================== */}

      <div className="creator-card-image">

        {image ? (

          <img

            src={getMediaUrl(image)}

            alt={name}

            loading="lazy"

            onError={(event) => {

              event.currentTarget.style.display =
                "none";


              const fallback =
                event.currentTarget.parentElement
                  ?.querySelector(
                    ".creator-card-image-fallback"
                  );


              if (fallback) {

                fallback.style.display =
                  "flex";

              }

            }}

          />

        ) : null}


        <div

          className="creator-card-image-fallback"

          style={{
            display: image
              ? "none"
              : "flex",
          }}

        >

          <User size={42} />

        </div>


        {/* ==================================================
            OWN PROFILE LABEL
        ================================================== */}

        {isOwnProfile && (

          <div className="creator-card-own-badge">

            This is your profile

          </div>

        )}

      </div>


      {/* ==================================================
          INFO
      ================================================== */}

      <div className="creator-card-info">


      <h2 className="creator-card-name">

          {name}

         <VerifiedBadge
  verificationLevel={creator.verification_level}
  verified={creator.verified}
/>

      </h2>


        <div className="creator-card-country">

          <MapPin size={15} />

          <span>
            {country}
          </span>

        </div>


        <div className="creator-card-bottom">


          <span className="creator-card-role">

            {role}

          </span>


          {creator?.followers !== undefined && (

            <span className="creator-card-followers">

              <Users size={14} />

              {creator.followers}

            </span>

          )}


        </div>


        {/* ==================================================
            OWN PROFILE MESSAGE
        ================================================== */}

        {isOwnProfile && (

          <div className="creator-card-own-message">

            This is your profile

          </div>

        )}


      </div>

    </article>

  );

}


export default CreatorCard;

