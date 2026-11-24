
import {
  Music2,
  Loader2,
} from "lucide-react";

import {
  useNavigate,
} from "react-router-dom";

import CreatorCard from "../components/CreatorCard";
import useCreators from "../hooks/useCreators";

import "./CreatorDirectory.css";


/* ======================================================
   GET JSON FROM LOCAL STORAGE
====================================================== */

function getStoredUser() {

  const possibleKeys = [
    "user",
    "currentUser",
    "authUser",
    "userData",
  ];


  for (const key of possibleKeys) {

    try {

      const value =
        localStorage.getItem(key);


      if (!value) {
        continue;
      }


      const parsed =
        JSON.parse(value);


      if (parsed) {
        return parsed;
      }

    } catch (error) {

      console.warn(
        `Unable to read ${key} from localStorage.`,
        error
      );

    }

  }


  return null;

}


/* ======================================================
   GET USER FROM JWT TOKEN
====================================================== */

function getUserFromToken() {

  try {

    const token =
      localStorage.getItem("token");


    if (!token) {
      return null;
    }


    const parts =
      token.split(".");


    if (parts.length !== 3) {
      return null;
    }


    const payload =
      parts[1]
        .replace(/-/g, "+")
        .replace(/_/g, "/");


    const decoded =
      JSON.parse(
        decodeURIComponent(
          atob(payload)
            .split("")
            .map(
              (character) =>
                "%" +
                (
                  "00" +
                  character
                    .charCodeAt(0)
                    .toString(16)
                ).slice(-2)
            )
            .join("")
        )
      );


    return decoded;

  } catch (error) {

    console.warn(
      "Unable to decode authentication token.",
      error
    );

    return null;

  }

}


/* ======================================================
   GET USER ID
====================================================== */

function getUserId(user) {

  if (!user) {
    return null;
  }


  return (
    user.id ||
    user.user_id ||
    user.userId ||
    user.sub ||
    null
  );

}


/* ======================================================
   GET USER EMAIL
====================================================== */

function getUserEmail(user) {

  if (!user?.email) {
    return "";
  }


  return String(
    user.email
  )
    .trim()
    .toLowerCase();

}


/* ======================================================
   DJs PAGE
====================================================== */

function DJs() {

  const {
    creators,
    loading,
    error,
  } = useCreators("dj");


  const navigate =
    useNavigate();


  /* ====================================================
     CURRENT USER
  ==================================================== */

  const storedUser =
    getStoredUser();


  const tokenUser =
    getUserFromToken();


  /*
    Use the stored user first.
    If unavailable, use the JWT user.
  */

  const currentUser =
    storedUser ||
    tokenUser ||
    null;


  /* ====================================================
     CURRENT USER ID
  ==================================================== */

  const currentUserId =
    getUserId(
      currentUser
    );


  /* ====================================================
     CURRENT USER EMAIL
  ==================================================== */

  const currentUserEmail =
    getUserEmail(
      currentUser
    );


  /* ====================================================
     DEBUG
  ==================================================== */

  console.log(
    "CAVE TUNES CURRENT DJ USER:",
    currentUser
  );


  console.log(
    "CAVE TUNES CURRENT DJ USER ID:",
    currentUserId
  );


  console.log(
    "CAVE TUNES CURRENT DJ USER EMAIL:",
    currentUserEmail
  );


  /* ====================================================
     CHECK OWN PROFILE
  ==================================================== */

  const isOwnCreator =
    (creator) => {

      if (!creator) {
        return false;
      }


      /* -----------------------------------------------
         CREATOR ID
      ------------------------------------------------ */

      const creatorId =
        creator.id ||
        creator.user_id ||
        creator.userId ||
        null;


      /* -----------------------------------------------
         CREATOR EMAIL
      ------------------------------------------------ */

      const creatorEmail =
        creator.email
          ? String(
              creator.email
            )
              .trim()
              .toLowerCase()
          : "";


      /* -----------------------------------------------
         ID MATCH
      ------------------------------------------------ */

      const idMatches =
        currentUserId &&
        creatorId &&
        String(currentUserId) ===
        String(creatorId);


      /* -----------------------------------------------
         EMAIL MATCH
      ------------------------------------------------ */

      const emailMatches =
        currentUserEmail &&
        creatorEmail &&
        currentUserEmail ===
        creatorEmail;


      /*
        If either the ID or email matches,
        this is the logged-in user's DJ profile.
      */

      return Boolean(
        idMatches ||
        emailMatches
      );

    };


  /* ====================================================
     OPEN DJ PROFILE
  ==================================================== */

  const openDJProfile =
    (creator) => {

      if (!creator?.id) {
        return;
      }


      /* -----------------------------------------------
         BLOCK OWN PROFILE
      ------------------------------------------------ */

      if (
        isOwnCreator(
          creator
        )
      ) {

        console.log(
          "Cave Tunes: blocked opening own DJ profile."
        );

        return;

      }


      /* -----------------------------------------------
         OPEN OTHER DJ
      ------------------------------------------------ */

      navigate(
        `/creator/${
          creator.role ||
          "dj"
        }/${
          creator.id
        }`
      );

    };


  /* ======================================================
     LOADING
  ====================================================== */

  if (loading) {

    return (

      <main className="page creator-directory-page">

        <header className="page-header">

          <h1>
            DJs
          </h1>

          <p>
            Discover DJs, mixes and sounds on Cave Tunes.
          </p>

        </header>


        <div className="creator-directory-loading">

          <Loader2
            size={30}
            className="creator-directory-spinner"
          />

          <span>
            Loading DJs...
          </span>

        </div>

      </main>

    );

  }


  /* ======================================================
     ERROR
  ====================================================== */

  if (error) {

    return (

      <main className="page creator-directory-page">

        <header className="page-header">

          <h1>
            DJs
          </h1>

          <p>
            Discover DJs, mixes and sounds on Cave Tunes.
          </p>

        </header>


        <div className="creator-directory-error">

          <Music2 size={34} />

          <h2>
            Unable to load DJs
          </h2>

          <p>
            {error}
          </p>

        </div>

      </main>

    );

  }


  /* ======================================================
     PAGE
  ====================================================== */

  return (

    <main className="page creator-directory-page">


      {/* ==================================================
          HEADER
      ================================================== */}

      <header className="page-header">

        <h1>
          DJs
        </h1>

        <p>
          Discover DJs, mixes and sounds on Cave Tunes.
        </p>

      </header>


      {/* ==================================================
          SUMMARY
      ================================================== */}

      <div className="creator-directory-summary">

        <span className="creator-directory-count">

          {creators.length}{" "}

          {creators.length === 1
            ? "DJ"
            : "DJs"}

        </span>

      </div>


      {/* ==================================================
          EMPTY
      ================================================== */}

      {creators.length === 0 ? (

        <div className="creator-directory-empty">

          <div className="creator-directory-empty-icon">

            <Music2 size={34} />

          </div>


          <h2>
            No DJs yet
          </h2>


          <p>
            DJs who join Cave Tunes
            will appear here.
          </p>

        </div>

      ) : (

        /* ==================================================
           DJ GRID
        ================================================== */

        <section className="creator-directory-grid">

          {creators.map(
            (creator) => {

              const ownProfile =
                isOwnCreator(
                  creator
                );


              console.log(
                "DJ CARD CHECK:",
                {
                  creatorId:
                    creator?.id,

                  creatorEmail:
                    creator?.email,

                  currentUserId,

                  currentUserEmail,

                  ownProfile,
                }
              );


              return (

                <CreatorCard

                  key={
                    creator.id
                  }

                  creator={
                    creator
                  }

                  onClick={() =>
                    openDJProfile(
                      creator
                    )
                  }

                  isOwnProfile={
                    ownProfile
                  }

                />

              );

            }
          )}

        </section>

      )}

    </main>

  );

}


export default DJs;

