// ======================================================
// CAVE TUNES
// SETTINGS PAGE
// src/pages/Settings.jsx
// ======================================================

import {
    ArrowLeft,
    Music2,
    Play,
    Download,
    DollarSign,
    Bell,
    User,
    ShieldCheck,
    Pencil,
    Lock,
    Crown,
    Scissors,
} from "lucide-react";

import {
    useNavigate,
} from "react-router-dom";

import {
    useCallback,
    useEffect,
    useState,
} from "react";

import {
    useAuth,
} from "../context/AuthContext";

import {
    getNotifications,
    getSubscriptionStatus,
} from "../services/api";

import "./Settings.css";


// ======================================================
// SETTINGS
// ======================================================

export default function Settings() {

    const navigate =
        useNavigate();


    const {
        user,
        loading,
    } = useAuth();

// ==================================================
// PREMIUM SUBSCRIPTION STATE
// ==================================================

const [
    isPremium,
    setIsPremium,
] = useState(false);


const [
    premiumLoading,
    setPremiumLoading,
] = useState(true);


// ==================================================
// LOAD PREMIUM SUBSCRIPTION STATUS
// ==================================================

const loadPremiumStatus = useCallback(async () => {

    try {

        setPremiumLoading(true);

        const response =
            await getSubscriptionStatus();

        const active =
            response?.isPremium === true &&
            response?.subscription?.status === "active";

        setIsPremium(active);

    } catch (error) {

        console.error(
            "SETTINGS PREMIUM STATUS ERROR:",
            error
        );

        setIsPremium(false);

    } finally {

        setPremiumLoading(false);

    }

}, []);


// ==================================================
// INITIAL PREMIUM STATUS CHECK
// ==================================================

useEffect(() => {

    if (!user) {
        return;
    }

    const timer = window.setTimeout(() => {

        loadPremiumStatus();

    }, 0);

    return () => {

        window.clearTimeout(timer);

    };

}, [
    user,
    loadPremiumStatus,
]);


// ==================================================
// REFRESH PREMIUM STATUS WHEN RETURNING TO SETTINGS
// ==================================================

useEffect(() => {

    const handleWindowFocus = () => {

        if (user) {
            loadPremiumStatus();
        }

    };

    window.addEventListener(
        "focus",
        handleWindowFocus
    );

    return () => {

        window.removeEventListener(
            "focus",
            handleWindowFocus
        );

    };

}, [
    user,
    loadPremiumStatus,
]);
    // ==================================================
    // UNREAD NOTIFICATION COUNT
    // ==================================================

    const [
        unreadNotifications,
        setUnreadNotifications,
    ] = useState(0);


    const [
        notificationsLoading,
        setNotificationsLoading,
    ] = useState(true);


    // ==================================================
    // LOAD UNREAD NOTIFICATION COUNT
    // ==================================================

    const loadUnreadNotifications =
        useCallback(async () => {

            try {

                setNotificationsLoading(true);


                const response =
                    await getNotifications();


                /*
                 * Backend response:
                 *
                 * {
                 *     success: true,
                 *     notifications: [...],
                 *     unreadCount: 3,
                 *     total: 10
                 * }
                 */


                const count =
                    Number(
                        response?.unreadCount
                    ) || 0;


                setUnreadNotifications(
                    count
                );


            } catch (error) {

                console.error(
                    "SETTINGS NOTIFICATION COUNT ERROR:",
                    error
                );


                /*
                 * If notification loading fails,
                 * do not show a false badge.
                 */

                setUnreadNotifications(0);

            } finally {

                setNotificationsLoading(false);

            }

        }, []);


    // ==================================================
// LOAD UNREAD NOTIFICATION COUNT
// ==================================================

useEffect(() => {

    if (!user) {
        return;
    }


    const timer =
        window.setTimeout(() => {

            loadUnreadNotifications();

        }, 0);


    return () => {

        window.clearTimeout(
            timer
        );

    };

}, [
    user,
    loadUnreadNotifications,
]);

    // ==================================================
    // REFRESH COUNT WHEN RETURNING TO SETTINGS
    // ==================================================

    useEffect(() => {

        const handleWindowFocus = () => {

            if (user) {

                loadUnreadNotifications();

            }

        };


        window.addEventListener(
            "focus",
            handleWindowFocus
        );


        return () => {

            window.removeEventListener(
                "focus",
                handleWindowFocus
            );

        };

    }, [
        user,
        loadUnreadNotifications,
    ]);


    // ==================================================
    // VERIFICATION
    // ==================================================

 // ==================================================
// VERIFICATION
// ==================================================

const isVerified =
    user?.verified === true ||
    user?.verified === "true";



// ==================================================
// UPLOAD STUDIO ACCESS
// ==================================================

const userRole = String(
    user?.role || ""
).trim().toLowerCase();

const isListener =
    userRole === "listener";

// Only verified non-listeners can access Upload Studio.
const canAccessUploadStudio =
    isVerified && !isListener;


// ==================================================
// MONETIZATION
// ==================================================

const isMonetized =
    user?.monetized === true ||
    user?.monetized === "true" ||
    user?.monetized === 1 ||
    user?.monetized === "1";


// ==================================================
// WALLET ACCESS
// ==================================================

const canAccessWallet =
    isMonetized;


// ==================================================
// ROYALTY MANAGEMENT ACCESS
// ==================================================

const canAccessRoyaltyManagement =
    isMonetized;

    // ==================================================
    // PROTECTED NAVIGATION
    // ==================================================

    const handleProtectedNavigation = (
        path
    ) => {

        if (!isVerified) {

            return;

        }


        navigate(path);

    };


    // ==================================================
    // LOADING
    // ==================================================

    if (loading) {

        return (

            <main className="settings-page">

                <div className="settings-loading">

                    Loading settings...

                </div>

            </main>

        );

    }


    // ==================================================
    // PAGE
    // ==================================================

    return (

        <main className="settings-page">


            {/* ==================================================
                HEADER
            ================================================== */}

            <header className="settings-header">

                <button
                    type="button"
                    className="settings-back-button"
                    onClick={() =>
                        navigate(-1)
                    }
                >

                    <ArrowLeft size={18} />

                    Back

                </button>


                <div className="settings-title">

                    <div className="settings-title-icon">

                        <User size={24} />

                    </div>


                    <div>

                        <h1>
                            Settings
                        </h1>

                        <p>
                            Manage your Cave Tunes creator tools and account.
                        </p>

                    </div>

                </div>

            </header>



            {/* ==================================================
                VERIFICATION NOTICE
            ================================================== */}

            {!isVerified && (

                <div className="settings-verification-notice">

                    <div className="settings-verification-notice-icon">

                        <Lock size={20} />

                    </div>


                    <div>

                        <strong>
                            Account verification required
                        </strong>

                        <p>
                            Verify your Cave Tunes creator account to unlock
                            Beneficial Pages and Features.
                        </p>

                    </div>

                </div>

            )}



            {/* ==================================================
                ACCOUNT
            ================================================== */}

            <section className="settings-section">

                <div className="settings-section-header">

                    <div>

                        <h2>
                            Account
                        </h2>

                        <p>
                            Manage your profile and account information.
                        </p>

                    </div>

                </div>


                <div className="settings-grid">


                    {/* ==================================================
                        PROFILE
                    ================================================== */}

                    <button
                        type="button"
                        className="settings-card"
                        onClick={() =>
                            navigate("/profile")
                        }
                    >

                        <div className="settings-card-icon">

                            <User size={28} />

                        </div>


                        <div>

                            <h3>
                                Profile
                            </h3>

                            <p>
                                View your Cave Tunes profile, songs,
                                albums and creator statistics.
                            </p>

                        </div>

                    </button>



                    {/* ==================================================
                        EDIT PROFILE
                    ================================================== */}

                    <button
                        type="button"
                        className="settings-card"
                        onClick={() =>
                            navigate("/edit-profile")
                        }
                    >

                        <div className="settings-card-icon">

                            <Pencil size={28} />

                        </div>


                        <div>

                            <h3>
                                Edit Profile
                            </h3>

                            <p>
                                Change your profile photo, username,
                                role, country and phone number.
                            </p>

                        </div>

                    </button>



                    {/* ==================================================
                        VERIFICATION
                    ================================================== */}

                    <button
                        type="button"
                        className="settings-card"
                        onClick={() =>
                            navigate("/verification-request")
                        }
                    >

                        <div className="settings-card-icon">

                            <ShieldCheck size={28} />

                        </div>


                        <div>

                            <h3>
                                Verification Request
                            </h3>

                            <p>
                                Request verification for your
                                Cave Tunes creator account.
                            </p>

                        </div>

                    </button>


                </div>

            </section>

{/* ==================================================
    FREE ARTIST VERIFICATION
================================================== */}

<button
    type="button"
    className="settings-card settings-free-verification-card"
    onClick={() =>
        navigate("/free-verification")
    }
>

    <div className="settings-card-icon">

        <ShieldCheck size={28} />

    </div>

    <div>

        <div className="settings-card-heading">

            <h3>
                Free Artist Verification
            </h3>

            <span className="settings-free-label">
                FREE
            </span>

        </div>

        <p>
            Apply for your official Cave Tunes verified badge
            completely free through WhatsApp.
        </p>

    </div>

</button>

            {/* ==================================================
                CREATOR TOOLS
            ================================================== */}

            <section className="settings-section">

                <div className="settings-section-header">

                    <div>

                        <h2>
                            Creator Tools
                        </h2>

                        <p>
                            Tools for publishing and growing your music.
                        </p>

                    </div>

                </div>


                <div className="settings-grid">


                  
{/* ==================================================
    UPLOAD STUDIO
================================================== */}

<button
    type="button"
    className={`settings-card ${
        !canAccessUploadStudio
            ? "settings-card-locked"
            : ""
    }`}
    onClick={() => {

        if (canAccessUploadStudio) {
            navigate("/upload-studio");
        }

    }}
    disabled={!canAccessUploadStudio}
>

    <div className="settings-card-icon">

        {canAccessUploadStudio ? (
            <Music2 size={28} />
        ) : (
            <Lock size={28} />
        )}

    </div>

    <div>

        <div className="settings-card-heading">

            <h3>
                Upload Studio
            </h3>

            {!canAccessUploadStudio && (

                <span className="settings-lock-label">
                    Locked
                </span>

            )}

        </div>

        <p>
            Upload songs, albums, EPs and podcasts, Edit already uploaded catalog.
        </p>

        {!canAccessUploadStudio && (

            <small>
                {!isVerified
                    ? "Account verification is required to unlock Upload Studio."
                    : isListener
                        ? "Listener accounts cannot access Upload Studio. Change your account role to Artist or Creator."
                        : "Upload Studio is unavailable for your account."
                }
            </small>

        )}

    </div>

</button>



                    {/* ==================================================
                        ANALYTICS
                    ================================================== */}

                    <button
                        type="button"
                        className={`settings-card ${
                            !isVerified
                                ? "settings-card-locked"
                                : ""
                        }`}
                        onClick={() =>
                            handleProtectedNavigation(
                                "/analytics"
                            )
                        }
                        disabled={!isVerified}
                    >

                        <div className="settings-card-icon">

                            {isVerified ? (
                                <Play size={28} />
                            ) : (
                                <Lock size={28} />
                            )}

                        </div>


                        <div>

                            <div className="settings-card-heading">

                                <h3>
                                    Analytics
                                </h3>


                                {!isVerified && (

                                    <span className="settings-lock-label">
                                        Locked
                                    </span>

                                )}

                            </div>


                            <p>
                                View streams, listeners, downloads and
                                music performance.
                            </p>


                            {!isVerified && (

                                <small>
                                    Account verification required.
                                </small>

                            )}

                        </div>

                    </button>



                    {/* ==================================================
                        MONETIZATION
                    ================================================== */}

                    <button
                        type="button"
                        className={`settings-card ${
                            !isVerified
                                ? "settings-card-locked"
                                : ""
                        }`}
                        onClick={() =>
                            handleProtectedNavigation(
                                "/monetization"
                            )
                        }
                        disabled={!isVerified}
                    >

                        <div className="settings-card-icon">

                            {isVerified ? (
                                <DollarSign size={28} />
                            ) : (
                                <Lock size={28} />
                            )}

                        </div>


                        <div>

                            <div className="settings-card-heading">

                                <h3>
                                    Monetization
                                </h3>


                                {!isVerified && (

                                    <span className="settings-lock-label">
                                        Locked
                                    </span>

                                )}

                            </div>


                            <p>
                                Apply for monetization and manage your
                                creator earnings.
                            </p>


                            {!isVerified && (

                                <small>
                                    Account verification required.
                                </small>

                            )}

                        </div>

                    </button>


{/* ==================================================
    ROYALTY MANAGEMENT
================================================== */}

<button
    type="button"
    className={`settings-card ${
        !canAccessRoyaltyManagement
            ? "settings-card-locked"
            : ""
    }`}
    onClick={() =>
        navigate("/royalty-management")
    }
    disabled={!canAccessRoyaltyManagement}
>

    <div className="settings-card-icon">

        {canAccessRoyaltyManagement ? (
            <DollarSign size={28} />
        ) : (
            <Lock size={28} />
        )}

    </div>

    <div>

        <div className="settings-card-heading">

            <h3>
                Royalty Management
            </h3>

            {!canAccessRoyaltyManagement && (

                <span className="settings-lock-label">
                    Locked
                </span>

            )}

        </div>

        <p>
            Track your royalty splits, streams,
            downloads and estimated earnings.
        </p>

        {!canAccessRoyaltyManagement && (

            <small>
                Account verification or monetization approval required.
            </small>

        )}

    </div>

</button>


                    {/* ==================================================
    WALLET
================================================== */}

<button
    type="button"
    className={`settings-card ${
        !canAccessWallet
            ? "settings-card-locked"
            : ""
    }`}
    onClick={() => {
        if (canAccessWallet) {
            navigate("/wallet");
        }
    }}
    disabled={!canAccessWallet}
>

    <div className="settings-card-icon">

        {canAccessWallet ? (
            <Download size={28} />
        ) : (
            <Lock size={28} />
        )}

    </div>

    <div>

        <div className="settings-card-heading">

            <h3>
                Wallet
            </h3>

            {!canAccessWallet && (
                <span className="settings-lock-label">
                    Locked
                </span>
            )}

        </div>

        <p>
            View royalties, earnings and withdrawal requests.
        </p>

        {!canAccessWallet && (
            <small>
                Monetization approval required.
            </small>
        )}

    </div>

</button>
                    {/* ==================================================
                        PREMIUM SUBSCRIPTION
                    ================================================== */}

                    <button
                        type="button"
                        className="settings-card settings-premium-card"
                        onClick={() =>
                            navigate("/subscription")
                        }
                    >
                        <div className="settings-card-icon">
                            <Crown size={28} />
                        </div>

                        <div>
                            <div className="settings-card-heading">
                                <h3>
                                    Premium Subscription
                                </h3>

                                <span
                                    role="status"
                                    aria-label={
                                        premiumLoading
                                            ? "Checking Premium status"
                                            : isPremium
                                                ? "Premium active"
                                                : "Premium inactive"
                                    }
                                    title={
                                        premiumLoading
                                            ? "Checking status"
                                            : isPremium
                                                ? "Premium active"
                                                : "Premium inactive"
                                    }
                                    style={{
                                        display: "inline-block",
                                        width: 10,
                                        height: 10,
                                        marginLeft: 8,
                                        borderRadius: "50%",
                                        backgroundColor: !premiumLoading && isPremium ? "#22c55e" : "#9ca3af",
                                        boxShadow: !premiumLoading && isPremium ? "0 0 8px rgba(34, 197, 94, 0.65)" : "0 0 0 transparent",
                                        opacity: premiumLoading ? 0.5 : 1,
                                        transition: "background-color 300ms ease, box-shadow 300ms ease, opacity 300ms ease",
                                    }}
                                />

                                {!premiumLoading && (
                                    <span
                                        className={
                                            isPremium
                                                ? "settings-premium-label"
                                                : "settings-lock-label"
                                        }
                                    >
                                        {isPremium
                                            ? ""
                                            : ""}
                                    </span>
                                )}
                            </div>

                            <p>
                                Unlock premium Cave Tunes features with
                                weekly, monthly or yearly membership.
                            </p>
                        </div>
                    </button>
{/* ==================================================
    SCIZZOR AUDIO CONVERSION
================================================== */}

<button
    type="button"
    className={`settings-card ${
        !isPremium
            ? "settings-card-locked"
            : "settings-premium-card"
    }`}
    onClick={() => {

        if (isPremium) {

            navigate("/scizzor");

        } else {

            navigate("/subscription");

        }

    }}
    disabled={premiumLoading}
>

    <div className="settings-card-icon">

        {premiumLoading ? (

            <Crown size={28} />

        ) : isPremium ? (

            <Scissors size={28} />

        ) : (

            <Lock size={28} />

        )}

    </div>


    <div>

        <div className="settings-card-heading">

            <h3>
                Scizzor
            </h3>

            <span
                role="status"
                aria-label={
                    premiumLoading
                        ? "Checking Scizzor status"
                        : isPremium
                            ? "Scizzor active"
                            : "Scizzor inactive"
                }
                title={premiumLoading ? "Checking status" : isPremium ? "Scizzor active" : "Scizzor inactive"}
                style={{
                    display: "inline-block",
                    width: 10,
                    height: 10,
                    marginLeft: 8,
                    borderRadius: "50%",
                    backgroundColor: !premiumLoading && isPremium ? "#22c55e" : "#9ca3af",
                    boxShadow: !premiumLoading && isPremium ? "0 0 8px rgba(34, 197, 94, 0.65)" : "0 0 0 transparent",
                    opacity: premiumLoading ? 0.5 : 1,
                    transition: "background-color 300ms ease, box-shadow 300ms ease, opacity 300ms ease",
                }}
            />


            {!premiumLoading && (

                <span
                    className={
                        isPremium
                            ? "settings-premium-label"
                            : "settings-lock-label"
                    }
                >

                    {isPremium
                        ? ""
                        : " 🔒 Locked"}

                </span>

            )}

        </div>


        <p>
            Capture and convert supported media into audio
            using Cave Tunes Scizzor.
        </p>


        {!premiumLoading && !isPremium && (

            <small>
                An active Premium subscription is required.
            </small>

        )}


        {premiumLoading && (

            <small>
                Checking Premium subscription...
            </small>

        )}

    </div>

</button>

                    {/* ==================================================
                        NOTIFICATIONS
                    ================================================== */}

                    <button
                        type="button"
                        className="settings-card settings-notifications-card"
                        onClick={() =>
                            navigate("/notifications")
                        }
                    >

                        {/* ==============================================
                            NOTIFICATION ICON + BADGE
                        ============================================== */}

                        <div className="settings-card-icon settings-notification-icon">

                            <Bell size={28} />


                            {!notificationsLoading &&
                                unreadNotifications > 0 && (

                                <span
                                    className="settings-notification-badge"
                                    aria-label={
                                        `${unreadNotifications} unread notifications`
                                    }
                                >

                                    {unreadNotifications > 99
                                        ? "99+"
                                        : unreadNotifications}

                                </span>

                            )}

                        </div>


                        <div>

                            <div className="settings-card-heading">

                                <h3>
                                    Notifications
                                </h3>


                                {!notificationsLoading &&
                                    unreadNotifications > 0 && (

                                    <span className="settings-unread-label">

                                        {unreadNotifications === 1
                                            ? "1 new"
                                            : `${unreadNotifications} new`}

                                    </span>

                                )}

                            </div>


                            <p>
                                View notifications from Cave Tunes
                                and your fans.
                            </p>

                        </div>

                    </button>


                </div>

            </section>


        </main>

    );

}