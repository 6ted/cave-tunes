import { API_BASE_URL as SHARED_API_BASE_URL } from "../services/api";
// ======================================================
// CAVE TUNES
// MONETIZATION APPLICATION
// src/pages/MonetizationApplication.jsx
//
// MONETIZATION FLOW
// ------------------------------------------------------
// 01. Eligibility
// 02. Payout Setup
// 03. Review
//
// ADMIN RULE
// ------------------------------------------------------
// Admin users may continue to Monetization Setup even
// when normal eligibility requirements are not met.
//
// NORMAL USERS
// ------------------------------------------------------
// Must:
//   ✓ Be verified
//   ✓ Have 500 plays on at least one song
//   ✓ Have 100 followers
//
// IMPORTANT
// ------------------------------------------------------
// This page only controls the frontend experience.
// The backend MUST also enforce the same permissions.
// ======================================================

import {
    useCallback,
    useEffect,
    useMemo,
    useState,
} from "react";

import {
    useNavigate,
} from "react-router-dom";

import "./MonetizationApplication.css";


// ======================================================
// API
// ======================================================

const API_BASE_URL = SHARED_API_BASE_URL;


// ======================================================
// REQUIREMENTS
// ======================================================

const REQUIRED_PLAYS = 1000;
const REQUIRED_FOLLOWERS = 1000;


// ======================================================
// TOKEN
// ======================================================

function getToken() {
    return localStorage.getItem("token");
}


// ======================================================
// JSON READER
// ======================================================

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


// ======================================================
// NORMALIZE USER
// ======================================================

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
            "Cave Tunes User",

        email:
            user.email ||
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

        followers_count:
            Number(
                user.followers_count ??
                user.followers ??
                0
            ),

        verified:
            Boolean(
                user.verified ??
                user.is_verified ??
                false
            ),

        // --------------------------------------------------
        // ADMIN STATUS
        //
        // Supports:
        // is_admin
        // isAdmin
        // admin
        // role="admin"
        //
        // This is important because your current account
        // can have:
        //
        // role = "producer"
        // is_admin = true
        // --------------------------------------------------

        is_admin:
            Boolean(
                user.is_admin ??
                user.isAdmin ??
                user.admin ??
                String(user.role || "").toLowerCase() === "admin"
            ),
    };
}


// ======================================================
// NORMALIZE SONG
// ======================================================

function normalizeSong(song) {
    if (!song) {
        return null;
    }

    return {
        ...song,

        id:
            song.id ??
            song.song_id ??
            null,

        title:
            song.title ||
            song.song_title ||
            "Untitled",

        artist:
            song.artist_name ||
            song.artist ||
            "Unknown Artist",

        plays:
            Number(
                song.plays ??
                song.play_count ??
                song.plays_count ??
                0
            ),

        downloads:
            Number(
                song.downloads ??
                song.download_count ??
                0
            ),
    };
}


// ======================================================
// CHECK ICON
// ======================================================

function CheckIcon() {
    return (
        <span className="application-check-icon">
            ✓
        </span>
    );
}


// ======================================================
// REQUIREMENT PROGRESS
// ======================================================

function RequirementProgress({
    label,
    current,
    required,
    completed,
    helper,
}) {
    const safeCurrent = Math.max(
        Number(current) || 0,
        0
    );

    const percentage =
        required > 0
            ? Math.min(
                  Math.round(
                      (safeCurrent / required) * 100
                  ),
                  100
              )
            : 0;

    return (
        <div
            className={`requirement-progress ${
                completed ? "completed" : ""
            }`}
        >
            <div className="requirement-progress-top">

                <div className="requirement-progress-label">

                    <span>
                        {completed ? "✓" : "○"}
                    </span>

                    <strong>
                        {label}
                    </strong>

                </div>

                <strong className="requirement-progress-value">
                    {safeCurrent.toLocaleString()} /{" "}
                    {required.toLocaleString()}
                </strong>

            </div>


            <div className="requirement-progress-track">

                <div
                    className="requirement-progress-fill"
                    style={{
                        width: `${percentage}%`,
                    }}
                />

            </div>


            <div className="requirement-progress-bottom">

                <span>
                    {completed
                        ? "Requirement completed"
                        : `${Math.max(
                              required - safeCurrent,
                              0
                          ).toLocaleString()} remaining`}
                </span>

                <span>
                    {percentage}%
                </span>

            </div>


            {helper && (
                <p className="requirement-progress-helper">
                    {helper}
                </p>
            )}

        </div>
    );
}


// ======================================================
// APPLICATION PAGE
// ======================================================

export default function MonetizationApplication() {

    const navigate = useNavigate();


    // ==================================================
    // USER
    // ==================================================

    const [user, setUser] = useState(null);


    // ==================================================
    // SONGS
    // ==================================================

    const [songs, setSongs] = useState([]);


    // ==================================================
    // LOADING
    // ==================================================

    const [loading, setLoading] = useState(true);

    const [songsLoading, setSongsLoading] =
        useState(true);


    // ==================================================
    // ERROR
    // ==================================================

    const [error, setError] = useState("");


    // ==================================================
    // FORM
    // ==================================================

    const [formData, setFormData] = useState({
        creatorType: "",
        primaryContent: "",
        audienceSize: "",
        uploadFrequency: "",
        monetizationGoal: "",
        ownsContent: false,
        followsPolicies: false,
        accurateInformation: false,
    });


    // ==================================================
    // LOAD PROFILE
    // ==================================================

    const loadProfile = useCallback(
        async () => {

            const token = getToken();

            if (!token) {
                throw new Error(
                    "Your session has expired. Please log in again."
                );
            }

            const response = await fetch(
                `${API_BASE_URL}/api/auth/me`,
                {
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
                    "Unable to load your profile."
                );
            }

            const currentUser =
                normalizeUser(
                    data.user ||
                    data
                );

            if (!currentUser) {
                throw new Error(
                    "Unable to load your creator profile."
                );
            }

            setUser(currentUser);

            return currentUser;
        },
        []
    );


    // ==================================================
    // LOAD SONGS
    // ==================================================

    const loadSongs = useCallback(
        async () => {

            setSongsLoading(true);

            try {

                const token = getToken();

                if (!token) {
                    throw new Error(
                        "Your session has expired. Please log in again."
                    );
                }

                const response = await fetch(
                    `${API_BASE_URL}/api/music/my-songs`,
                    {
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
                        "Unable to load your songs."
                    );
                }

                const list =
                    data.songs ||
                    data.data ||
                    [];

                const normalizedSongs =
                    Array.isArray(list)
                        ? list
                              .map(normalizeSong)
                              .filter(Boolean)
                        : [];

                setSongs(
                    normalizedSongs
                );

                return normalizedSongs;

            } catch (requestError) {

                console.error(
                    "Unable to load monetization songs:",
                    requestError
                );

                setSongs([]);

                throw requestError;

            } finally {

                setSongsLoading(false);

            }
        },
        []
    );


    // ==================================================
    // INITIAL LOAD
    // ==================================================

    useEffect(() => {

        let mounted = true;

        async function start() {

            try {

                setLoading(true);
                setError("");

                await Promise.all([
                    loadProfile(),
                    loadSongs(),
                ]);

            } catch (requestError) {

                console.error(
                    "Unable to load monetization eligibility:",
                    requestError
                );

                if (mounted) {
                    setError(
                        requestError.message ||
                        "Unable to load monetization eligibility."
                    );
                }

            } finally {

                if (mounted) {
                    setLoading(false);
                }

            }
        }

        start();

        return () => {
            mounted = false;
        };

    }, [
        loadProfile,
        loadSongs,
    ]);


    // ==================================================
    // ADMIN
    // ==================================================

    const isAdmin = useMemo(() => {

        if (!user) {
            return false;
        }

        return Boolean(
            user.is_admin === true ||
            user.isAdmin === true ||
            user.admin === true ||
            String(user.role || "").toLowerCase() === "admin"
        );

    }, [user]);


    // ==================================================
    // FOLLOWERS
    // ==================================================

    const followerCount = useMemo(
        () =>
            Math.max(
                Number(
                    user?.followers_count || 0
                ),
                0
            ),
        [user]
    );


    // ==================================================
    // VERIFIED
    // ==================================================

    const isVerified = useMemo(
        () =>
            Boolean(
                user?.verified
            ),
        [user]
    );


    // ==================================================
    // BEST SONG
    // ==================================================

    const bestSong = useMemo(() => {

        if (!songs.length) {
            return null;
        }

        return songs.reduce(
            (best, song) => {

                if (!best) {
                    return song;
                }

                return Number(song.plays || 0) >
                    Number(best.plays || 0)
                    ? song
                    : best;

            },
            null
        );

    }, [songs]);


    // ==================================================
    // HIGHEST SONG PLAYS
    // ==================================================

    const highestSongPlays = useMemo(
        () =>
            Number(
                bestSong?.plays || 0
            ),
        [bestSong]
    );


    // ==================================================
    // REQUIREMENTS
    // ==================================================

    const playsRequirementComplete =
        highestSongPlays >= REQUIRED_PLAYS;

    const followersRequirementComplete =
        followerCount >= REQUIRED_FOLLOWERS;


    // ==================================================
    // NORMAL ELIGIBILITY
    // ==================================================

    const allRequirementsComplete =
        isVerified &&
        playsRequirementComplete &&
        followersRequirementComplete;


    // ==================================================
    // CAN CONTINUE
    //
    // ADMIN = BYPASS
    // NORMAL USER = MUST BE ELIGIBLE
    // ==================================================

    const canContinue =
        isAdmin ||
        allRequirementsComplete;


    // ==================================================
    // FORM CHANGE
    // ==================================================

    const handleChange = (event) => {

        const {
            name,
            value,
            type,
            checked,
        } = event.target;

        setFormData((previous) => ({
            ...previous,

            [name]:
                type === "checkbox"
                    ? checked
                    : value,
        }));

        if (error) {
            setError("");
        }
    };


    // ==================================================
    // VALIDATE APPLICATION
    // ==================================================

    const validateApplication = () => {

        // ------------------------------------------------
        // NORMAL USER ELIGIBILITY
        // ------------------------------------------------

        if (!isAdmin) {

            if (!isVerified) {
                return (
                    "Your creator account must be verified before you can continue."
                );
            }

            if (!playsRequirementComplete) {
                return (
                    `You need at least ${REQUIRED_PLAYS} plays on one song before continuing.`
                );
            }

            if (!followersRequirementComplete) {
                return (
                    `You need at least ${REQUIRED_FOLLOWERS} followers before continuing.`
                );
            }
        }


        // ------------------------------------------------
        // FORM
        // ------------------------------------------------

        if (!formData.creatorType) {
            return "Please select your creator type.";
        }

        if (!formData.primaryContent) {
            return "Please select your primary content type.";
        }

        if (!formData.audienceSize) {
            return "Please select your current audience size.";
        }

        if (!formData.uploadFrequency) {
            return "Please select how often you release content.";
        }

        if (!formData.monetizationGoal) {
            return (
                "Please tell us what you want to achieve with monetization."
            );
        }


        // ------------------------------------------------
        // DECLARATIONS
        // ------------------------------------------------

        if (!formData.ownsContent) {
            return (
                "You must confirm that you own or have the necessary rights to your content."
            );
        }

        if (!formData.followsPolicies) {
            return (
                "You must confirm that you will follow Cave Tunes policies."
            );
        }

        if (!formData.accurateInformation) {
            return (
                "Please confirm that the information provided is accurate."
            );
        }

        return "";
    };


    // ==================================================
    // CONTINUE
    // ==================================================

    const handleContinue = (event) => {

        event.preventDefault();

        setError("");

        const validationError =
            validateApplication();

        if (validationError) {
            setError(validationError);
            return;
        }


        // ==================================================
        // SAVE APPLICATION
        // ==================================================

        const application = {

            ...formData,

            submitted_at:
                new Date().toISOString(),

            user_id:
                user?.id ?? null,

            username:
                user?.username ?? "",

            eligibility: {

                verified:
                    isVerified,

                followers_count:
                    followerCount,

                highest_song_plays:
                    highestSongPlays,

                best_song_id:
                    bestSong?.id ?? null,

                best_song_title:
                    bestSong?.title ?? null,

                requirements_met:
                    allRequirementsComplete,

                admin_override:
                    isAdmin,
            },

        };


        sessionStorage.setItem(
            "caveTunesMonetizationApplication",
            JSON.stringify(application)
        );


        // ==================================================
        // GO TO SETUP
        // ==================================================

        navigate(
            "/monetization/setup"
        );
    };


    // ==================================================
    // BACK
    // ==================================================

    const handleBack = () => {
        navigate("/monetization");
    };


    // ==================================================
    // LOADING
    // ==================================================

    if (loading) {

        return (
            <div className="monetization-application-page">

                <div className="application-bg-orb application-bg-orb-one" />
                <div className="application-bg-orb application-bg-orb-two" />

                <main className="application-main">

                    <div className="application-loading">

                        <div className="application-loading-spinner" />

                        <h2>
                            Loading creator profile
                        </h2>

                        <p>
                            Checking your Cave Tunes
                            eligibility...
                        </p>

                    </div>

                </main>

            </div>
        );
    }


    // ==================================================
    // PROFILE UNAVAILABLE
    // ==================================================

    if (!user) {

        return (
            <div className="monetization-application-page">

                <div className="application-bg-orb application-bg-orb-one" />
                <div className="application-bg-orb application-bg-orb-two" />

                <main className="application-main">

                    <div className="application-error-state">

                        <span>
                            !
                        </span>

                        <h2>
                            Profile unavailable
                        </h2>

                        <p>
                            {error ||
                                "We could not load your Cave Tunes creator profile."}
                        </p>

                        <button
                            type="button"
                            onClick={() =>
                                navigate("/profile")
                            }
                        >
                            Return to Profile
                        </button>

                    </div>

                </main>

            </div>
        );
    }


    // ==================================================
    // RENDER
    // ==================================================

    return (
        <div className="monetization-application-page">

            {/* ==================================================
                BACKGROUND
            ================================================== */}

            <div className="application-bg-orb application-bg-orb-one" />
            <div className="application-bg-orb application-bg-orb-two" />


            {/* ==================================================
                HEADER
            ================================================== */}

            <header className="application-header">

                <button
                    type="button"
                    className="application-back-button"
                    onClick={handleBack}
                >
                    <span>
                        ←
                    </span>

                    Back to Monetization
                </button>


                <div className="application-brand">

                    <span>
                        CAVE TUNES
                    </span>

                    <small>
                        CREATOR MONETIZATION
                    </small>

                </div>


                {isAdmin && (
                    <div className="application-admin-badge">

                        <span>
                            ✓
                        </span>

                        ADMIN ACCESS

                    </div>
                )}

            </header>


            {/* ==================================================
                MAIN
            ================================================== */}

            <main className="application-main">


                {/* ==================================================
                    PROGRESS
                ================================================== */}

                <div className="application-progress">

                    <div className="progress-step active">

                        <span>
                            01
                        </span>

                        <div>

                            <strong>
                                Eligibility
                            </strong>

                            <small>
                                Creator requirements
                            </small>

                        </div>

                    </div>


                    <div className="progress-line" />


                    <div className="progress-step">

                        <span>
                            02
                        </span>

                        <div>

                            <strong>
                                Setup
                            </strong>

                            <small>
                                Payout information
                            </small>

                        </div>

                    </div>


                    <div className="progress-line" />


                    <div className="progress-step">

                        <span>
                            03
                        </span>

                        <div>

                            <strong>
                                Review
                            </strong>

                            <small>
                                Final submission
                            </small>

                        </div>

                    </div>

                </div>


                {/* ==================================================
                    TITLE
                ================================================== */}

                <div className="application-title">

                    <span className="application-eyebrow">
                        STEP 01 OF 03
                    </span>

                    <h1>
                        Become a
                        <span>
                            {" "}Cave Tunes creator.
                        </span>
                    </h1>

                    <p>
                        Before activating monetization,
                        we check your creator account,
                        audience and music performance.
                        Your progress is automatically
                        checked from your Cave Tunes account.
                    </p>


                    {isAdmin && (

                        <div className="admin-override-notice">

                            <span>
                                ✓
                            </span>

                            <div>

                                <strong>
                                    Administrator access enabled
                                </strong>

                                <p>
                                    Your administrator account can
                                    continue to monetization setup
                                    without meeting the normal
                                    creator eligibility requirements.
                                </p>

                            </div>

                        </div>

                    )}

                </div>


                {/* ==================================================
                    CREATOR SUMMARY
                ================================================== */}

                <section className="creator-summary-card">

                    <div className="creator-summary-avatar">

                        {user.username
                            ? user.username
                                  .charAt(0)
                                  .toUpperCase()
                            : "C"}

                    </div>


                    <div className="creator-summary-info">

                        <span>
                            APPLYING CREATOR
                        </span>

                        <strong>
                            {user.username}
                        </strong>

                        <small>
                            {user.email ||
                                "Your registered account"}
                        </small>

                    </div>


                    <div
                        className={`creator-summary-status ${
                            isAdmin ||
                            isVerified
                                ? "verified"
                                : "not-verified"
                        }`}
                    >

                        {isAdmin ? (

                            <>
                                <CheckIcon />

                                <span>
                                    Administrator
                                </span>
                            </>

                        ) : isVerified ? (

                            <>
                                <CheckIcon />

                                <span>
                                    Verified creator
                                </span>
                            </>

                        ) : (

                            <>
                                <span className="status-dot">
                                    !
                                </span>

                                <span>
                                    Verification required
                                </span>
                            </>

                        )}

                    </div>

                </section>


                {/* ==================================================
                    ELIGIBILITY
                ================================================== */}

                <section className="eligibility-section">

                    <div className="eligibility-heading">

                        <div>

                            <span className="application-eyebrow">
                                MONETIZATION ELIGIBILITY
                            </span>

                            <h2>
                                Complete all requirements
                            </h2>

                            <p>
                                Normal creator accounts must
                                complete every requirement below.
                                Administrator accounts may continue
                                without completing them.
                            </p>

                        </div>


                        <div
                            className={`eligibility-status ${
                                allRequirementsComplete ||
                                isAdmin
                                    ? "complete"
                                    : ""
                            }`}
                        >

                            <span>
                                {allRequirementsComplete ||
                                isAdmin
                                    ? "✓"
                                    : "○"}
                            </span>

                            {allRequirementsComplete
                                ? "Eligible"
                                : isAdmin
                                    ? "Admin access"
                                    : "Not yet eligible"}

                        </div>

                    </div>


                    {/* ==================================================
                        REQUIREMENT 01
                    ================================================== */}

                    <div
                        className={`requirement-card ${
                            isVerified
                                ? "requirement-complete"
                                : isAdmin
                                    ? "requirement-admin-bypass"
                                    : ""
                        }`}
                    >

                        <div className="requirement-card-icon">

                            {isVerified
                                ? "✓"
                                : isAdmin
                                    ? "A"
                                    : "01"}

                        </div>


                        <div className="requirement-card-content">

                            <div className="requirement-card-header">

                                <div>

                                    <span>
                                        REQUIREMENT 01
                                    </span>

                                    <h3>
                                        Verified creator account
                                    </h3>

                                </div>


                                <strong
                                    className={
                                        isVerified ||
                                        isAdmin
                                            ? "complete-text"
                                            : ""
                                    }
                                >
                                    {isVerified
                                        ? "Completed"
                                        : isAdmin
                                            ? "Admin bypass"
                                            : "Required"}
                                </strong>

                            </div>


                            <p>
                                Your Cave Tunes creator account
                                must normally be verified before
                                monetization can be activated.
                            </p>


                            <div className="verification-progress">

                                <div className="verification-progress-track">

                                    <div
                                        className="verification-progress-fill"
                                        style={{
                                            width:
                                                isVerified
                                                    ? "100%"
                                                    : "0%",
                                        }}
                                    />

                                </div>

                            </div>


                            <div className="requirement-note">

                                {isVerified ? (

                                    <>
                                        <CheckIcon />

                                        Your creator account is verified.
                                    </>

                                ) : isAdmin ? (

                                    <>
                                        <CheckIcon />

                                        Administrator access bypasses
                                        this eligibility requirement.
                                    </>

                                ) : (

                                    <>
                                        <span>
                                            !
                                        </span>

                                        Complete creator verification
                                        to unlock this requirement.
                                    </>

                                )}

                            </div>

                        </div>

                    </div>


                    {/* ==================================================
                        REQUIREMENT 02
                    ================================================== */}

                    <div
                        className={`requirement-card ${
                            playsRequirementComplete
                                ? "requirement-complete"
                                : isAdmin
                                    ? "requirement-admin-bypass"
                                    : ""
                        }`}
                    >

                        <div className="requirement-card-icon">

                            {playsRequirementComplete
                                ? "✓"
                                : isAdmin
                                    ? "A"
                                    : "02"}

                        </div>


                        <div className="requirement-card-content">

                            <div className="requirement-card-header">

                                <div>

                                    <span>
                                        REQUIREMENT 02
                                    </span>

                                    <h3>
                                        Reach 1000 plays on one song
                                    </h3>

                                </div>


                                <strong
                                    className={
                                        playsRequirementComplete ||
                                        isAdmin
                                            ? "complete-text"
                                            : ""
                                    }
                                >
                                    {playsRequirementComplete
                                        ? "Completed"
                                        : isAdmin
                                            ? "Admin bypass"
                                            : "In progress"}
                                </strong>

                            </div>


                            <p>
                                At least one of your songs should
                                normally reach 1000 verified plays
                                on Cave Tunes.
                            </p>


                            <RequirementProgress
                                label="Best performing song"
                                current={highestSongPlays}
                                required={REQUIRED_PLAYS}
                                completed={
                                    playsRequirementComplete
                                }
                                helper={
                                    songsLoading
                                        ? "Checking your latest song statistics..."
                                        : isAdmin
                                            ? "Administrator access allows setup to continue regardless of this requirement."
                                            : bestSong
                                                ? `"${bestSong.title}" is currently your best-performing song.`
                                                : "Upload music and start building plays to complete this requirement."
                                }
                            />

                        </div>

                    </div>


                    {/* ==================================================
                        REQUIREMENT 03
                    ================================================== */}

                    <div
                        className={`requirement-card ${
                            followersRequirementComplete
                                ? "requirement-complete"
                                : isAdmin
                                    ? "requirement-admin-bypass"
                                    : ""
                        }`}
                    >

                        <div className="requirement-card-icon">

                            {followersRequirementComplete
                                ? "✓"
                                : isAdmin
                                    ? "A"
                                    : "03"}

                        </div>


                        <div className="requirement-card-content">

                            <div className="requirement-card-header">

                                <div>

                                    <span>
                                        REQUIREMENT 03
                                    </span>

                                    <h3>
                                        Build 1000 followers
                                    </h3>

                                </div>


                                <strong
                                    className={
                                        followersRequirementComplete ||
                                        isAdmin
                                            ? "complete-text"
                                            : ""
                                    }
                                >
                                    {followersRequirementComplete
                                        ? "Completed"
                                        : isAdmin
                                            ? "Admin bypass"
                                            : "In progress"}
                                </strong>

                            </div>


                            <p>
                                Build a community of at least
                                100 followers on your Cave Tunes
                                creator profile.
                            </p>


                            <RequirementProgress
                                label="Creator followers"
                                current={followerCount}
                                required={REQUIRED_FOLLOWERS}
                                completed={
                                    followersRequirementComplete
                                }
                                helper={
                                    isAdmin
                                        ? "Administrator access allows setup to continue regardless of this requirement."
                                        : "Keep releasing music and engaging with your listeners to grow your audience."
                                }
                            />

                        </div>

                    </div>

                </section>


                {/* ==================================================
                    FORM
                ================================================== */}

                <form
                    className="application-form"
                    onSubmit={handleContinue}
                >

                    {/* ==================================================
                        SECTION 01
                    ================================================== */}

                    <section className="application-card">

                        <div className="application-card-heading">

                            <div className="heading-number">
                                01
                            </div>

                            <div>

                                <h2>
                                    Creator profile
                                </h2>

                                <p>
                                    Tell us what kind of creator you are.
                                </p>

                            </div>

                        </div>


                        <div className="application-fields">

                            <div className="application-field">

                                <label htmlFor="creatorType">
                                    Creator type
                                    <span>*</span>
                                </label>

                                <select
                                    id="creatorType"
                                    name="creatorType"
                                    value={
                                        formData.creatorType
                                    }
                                    onChange={
                                        handleChange
                                    }
                                >

                                    <option value="">
                                        Select your creator type
                                    </option>

                                    <option value="artist">
                                        Artist
                                    </option>

                                    <option value="producer">
                                        Producer
                                    </option>

                                    <option value="dj">
                                        DJ
                                    </option>

                                    <option value="songwriter">
                                        Songwriter
                                    </option>

                                    <option value="band">
                                        Band / Group
                                    </option>

                                    <option value="label">
                                        Record Label
                                    </option>

                                    <option value="other">
                                        Other
                                    </option>

                                </select>

                            </div>


                            <div className="application-field">

                                <label htmlFor="primaryContent">
                                    Primary content
                                    <span>*</span>
                                </label>

                                <select
                                    id="primaryContent"
                                    name="primaryContent"
                                    value={
                                        formData.primaryContent
                                    }
                                    onChange={
                                        handleChange
                                    }
                                >

                                    <option value="">
                                        Select your primary content
                                    </option>

                                    <option value="music">
                                        Music
                                    </option>

                                    <option value="instrumentals">
                                        Instrumentals / Beats
                                    </option>

                                    <option value="podcasts">
                                        Podcasts
                                    </option>

                                    <option value="mixed">
                                        Multiple content types
                                    </option>

                                </select>

                            </div>

                        </div>

                    </section>


                    {/* ==================================================
                        SECTION 02
                    ================================================== */}

                    <section className="application-card">

                        <div className="application-card-heading">

                            <div className="heading-number">
                                02
                            </div>

                            <div>

                                <h2>
                                    Your audience
                                </h2>

                                <p>
                                    Help us understand your current reach.
                                </p>

                            </div>

                        </div>


                        <div className="application-fields">

                            <div className="application-field">

                                <label htmlFor="audienceSize">
                                    Current audience size
                                    <span>*</span>
                                </label>

                                <select
                                    id="audienceSize"
                                    name="audienceSize"
                                    value={
                                        formData.audienceSize
                                    }
                                    onChange={
                                        handleChange
                                    }
                                >

                                    <option value="">
                                        Select your audience size
                                    </option>

                                    <option value="starting">
                                        I'm just getting started
                                    </option>

                                    <option value="under_1000">
                                        Under 1,000 listeners
                                    </option>

                                    <option value="1000_10000">
                                        1,000 – 10,000 listeners
                                    </option>

                                    <option value="10000_100000">
                                        10,000 – 100,000 listeners
                                    </option>

                                    <option value="100000_plus">
                                        100,000+ listeners
                                    </option>

                                </select>

                            </div>


                            <div className="application-field">

                                <label htmlFor="uploadFrequency">
                                    Release frequency
                                    <span>*</span>
                                </label>

                                <select
                                    id="uploadFrequency"
                                    name="uploadFrequency"
                                    value={
                                        formData.uploadFrequency
                                    }
                                    onChange={
                                        handleChange
                                    }
                                >

                                    <option value="">
                                        How often do you release?
                                    </option>

                                    <option value="weekly">
                                        Weekly
                                    </option>

                                    <option value="monthly">
                                        Monthly
                                    </option>

                                    <option value="every_few_months">
                                        Every few months
                                    </option>

                                    <option value="occasionally">
                                        Occasionally
                                    </option>

                                    <option value="new">
                                        I haven't released yet
                                    </option>

                                </select>

                            </div>

                        </div>

                    </section>


                    {/* ==================================================
                        SECTION 03
                    ================================================== */}

                    <section className="application-card">

                        <div className="application-card-heading">

                            <div className="heading-number">
                                03
                            </div>

                            <div>

                                <h2>
                                    Monetization goals
                                </h2>

                                <p>
                                    Tell us what you want to achieve.
                                </p>

                            </div>

                        </div>


                        <div className="goal-options">

                            {[
                                {
                                    value: "music_income",
                                    title:
                                        "Generate income from my music",
                                    description:
                                        "I want to build music into a sustainable income stream.",
                                },
                                {
                                    value: "grow_career",
                                    title:
                                        "Grow my creator career",
                                    description:
                                        "I want to grow my audience, catalog and professional presence.",
                                },
                                {
                                    value: "both",
                                    title:
                                        "Both",
                                    description:
                                        "I want to earn while building a long-term music career.",
                                },
                            ].map((goal) => (

                                <label
                                    key={goal.value}
                                    className={`goal-option ${
                                        formData.monetizationGoal ===
                                        goal.value
                                            ? "selected"
                                            : ""
                                    }`}
                                >

                                    <input
                                        type="radio"
                                        name="monetizationGoal"
                                        value={goal.value}
                                        checked={
                                            formData.monetizationGoal ===
                                            goal.value
                                        }
                                        onChange={
                                            handleChange
                                        }
                                    />

                                    <span className="goal-radio" />

                                    <div>

                                        <strong>
                                            {goal.title}
                                        </strong>

                                        <small>
                                            {goal.description}
                                        </small>

                                    </div>

                                </label>

                            ))}

                        </div>

                    </section>


                    {/* ==================================================
                        SECTION 04
                    ================================================== */}

                    <section className="application-card declarations-card">

                        <div className="application-card-heading">

                            <div className="heading-number">
                                04
                            </div>

                            <div>

                                <h2>
                                    Creator declarations
                                </h2>

                                <p>
                                    Please confirm the following before continuing.
                                </p>

                            </div>

                        </div>


                        <div className="declarations">

                            {[
                                {
                                    name: "ownsContent",
                                    title:
                                        "I own or have the necessary rights to the content I submit.",
                                    description:
                                        "I understand that I am responsible for having the appropriate rights, permissions or licenses for my content.",
                                },
                                {
                                    name: "followsPolicies",
                                    title:
                                        "I agree to follow Cave Tunes policies.",
                                    description:
                                        "I understand that monetization may be restricted or removed if my account violates applicable policies.",
                                },
                                {
                                    name: "accurateInformation",
                                    title:
                                        "The information I have provided is accurate.",
                                    description:
                                        "I confirm that the information in this application is truthful and belongs to my Cave Tunes account.",
                                },
                            ].map((declaration) => (

                                <label
                                    key={declaration.name}
                                    className="declaration"
                                >

                                    <input
                                        type="checkbox"
                                        name={
                                            declaration.name
                                        }
                                        checked={
                                            formData[
                                                declaration.name
                                            ]
                                        }
                                        onChange={
                                            handleChange
                                        }
                                    />

                                    <span className="custom-checkbox">
                                        {formData[
                                            declaration.name
                                        ] && "✓"}
                                    </span>

                                    <div>

                                        <strong>
                                            {declaration.title}
                                        </strong>

                                        <p>
                                            {declaration.description}
                                        </p>

                                    </div>

                                </label>

                            ))}

                        </div>

                    </section>


                    {/* ==================================================
                        ERROR
                    ================================================== */}

                    {error && (

                        <div className="application-error">

                            <span>
                                !
                            </span>

                            <p>
                                {error}
                            </p>

                        </div>

                    )}


                    {/* ==================================================
                        ACTIONS
                    ================================================== */}

                    <div className="application-actions">

                        <button
                            type="button"
                            className="application-cancel"
                            onClick={handleBack}
                        >
                            Back
                        </button>


                        <button
                            type="submit"
                            className="application-continue"
                            disabled={!canContinue}
                        >

                            <span>
                                Continue to Setup
                            </span>

                            <span>
                                →
                            </span>

                        </button>

                    </div>


                    {/* ==================================================
                        NORMAL USER LOCKED
                    ================================================== */}

                    {!allRequirementsComplete &&
                        !isAdmin && (

                            <div className="application-locked-message">

                                <div className="locked-icon">
                                    🔒
                                </div>

                                <div>

                                    <strong>
                                        Monetization setup is currently locked
                                    </strong>

                                    <p>
                                        {isVerified
                                            ? "Complete the remaining eligibility requirements above to continue."
                                            : "Complete creator verification and the remaining eligibility requirements above to continue."}
                                    </p>

                                </div>

                            </div>

                        )}


                    {/* ==================================================
                        ADMIN READY
                    ================================================== */}

                    {isAdmin &&
                        !allRequirementsComplete && (

                            <div className="application-ready-message">

                                <div className="ready-icon">
                                    ✓
                                </div>

                                <div>

                                    <strong>
                                        Administrator access enabled
                                    </strong>

                                    <p>
                                        Your administrator account can
                                        continue to payout setup without
                                        completing the normal creator
                                        eligibility requirements.
                                    </p>

                                </div>

                            </div>

                        )}


                    {/* ==================================================
                        NORMAL ELIGIBLE
                    ================================================== */}

                    {!isAdmin &&
                        allRequirementsComplete && (

                            <div className="application-ready-message">

                                <div className="ready-icon">
                                    ✓
                                </div>

                                <div>

                                    <strong>
                                        You're eligible to continue
                                    </strong>

                                    <p>
                                        All creator eligibility requirements
                                        have been completed. Review your
                                        information and continue to payout setup.
                                    </p>

                                </div>

                            </div>

                        )}


                    {/* ==================================================
                        WHY
                    ================================================== */}

                    <div className="application-why-section">

                        <span className="application-eyebrow">
                            WHY THESE STEPS?
                        </span>

                        <h6>
                            Building a sustainable music business
                        </h6>

                        <p>
                            In the music business, you need to understand
                            your audience before building a sustainable
                            income. These requirements encourage creators
                            to first build a loyal fanbase and understand
                            who their listeners are before monetizing
                            their music.
                        </p>

                    </div>


                    {/* ==================================================
                        SECURITY
                    ================================================== */}

                    <p className="application-security-note">
                        🔒 Your application information is securely
                        associated with your Cave Tunes creator account.
                    </p>

                </form>

            </main>

        </div>
    );
}