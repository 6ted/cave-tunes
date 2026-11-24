// ======================================================
// CAVE TUNES
// NOTIFICATIONS PAGE
// src/pages/Notifications.jsx
// ======================================================

import {
    useCallback,
    useEffect,
    useMemo,
    useState,
} from "react";

import {
    AlertCircle,
    ArrowLeft,
    Banknote,
    Bell,
    Check,
    CheckCheck,
    CircleDollarSign,
    Download,
    FileMusic,
    Heart,
    ListMusic,
    Loader2,
    Lock,
    MessageCircle,
    Music2,
    Play,
    RefreshCw,
    Send,
    Settings,
    ShieldAlert,
    ShieldCheck,
    Upload,
    User,
    UserPlus,
    WalletCards,
    XCircle,
} from "lucide-react";

import {
    useNavigate,
} from "react-router-dom";

import {
    useAuth,
} from "../context/useAuth";

import {
    getNotifications,
    markNotificationRead,
    markAllNotificationsRead,
} from "../services/api";

import "./Notifications.css";


// ======================================================
// NORMALIZE NOTIFICATION TYPE
// ======================================================

function normalizeNotificationType(notification) {

    const type =
        notification?.type ||
        notification?.notification_type ||
        notification?.notificationType ||
        notification?.event_type ||
        notification?.eventType ||
        "default";

    return String(type)
        .trim()
        .toLowerCase()
        .replace(/[\s-]+/g, "_");

}


// ======================================================
// CHECK READ STATUS
// ======================================================

function isNotificationRead(notification) {

    const values = [
        notification?.read,
        notification?.is_read,
        notification?.isRead,
    ];

    return values.some((value) => {

        if (value === true) {
            return true;
        }

        if (
            typeof value === "string" &&
            value.toLowerCase() === "true"
        ) {
            return true;
        }

        if (
            typeof value === "number" &&
            value === 1
        ) {
            return true;
        }

        return false;

    });

}


// ======================================================
// GET NOTIFICATION ICON
// ======================================================

function getNotificationIcon(type) {

    switch (type) {

        // --------------------------------------------------
        // FOLLOWERS
        // --------------------------------------------------

        case "follower":
        case "follow":
        case "new_follower":
        case "user_followed":
            return <UserPlus size={21} />;


        // --------------------------------------------------
        // UPLOADS
        // --------------------------------------------------

        case "upload":
        case "song_upload":
        case "upload_complete":
        case "upload_completed":
        case "song_uploaded":
        case "album_uploaded":
        case "release_uploaded":
            return <Upload size={21} />;


        case "upload_failed":
        case "upload_error":
            return <XCircle size={21} />;


        // --------------------------------------------------
        // SONGS
        // --------------------------------------------------

        case "song":
        case "song_added":
        case "new_song":
        case "track":
            return <Music2 size={21} />;


        // --------------------------------------------------
        // ALBUMS
        // --------------------------------------------------

        case "album":
        case "new_album":
        case "album_created":
        case "album_published":
            return <FileMusic size={21} />;


        // --------------------------------------------------
        // RELEASES
        // --------------------------------------------------

        case "release":
        case "new_release":
        case "release_published":
            return <Play size={21} />;


        // --------------------------------------------------
        // VERIFICATION
        // --------------------------------------------------

        case "verification":
        case "verification_approved":
        case "account_verified":
        case "verified":
            return <ShieldCheck size={21} />;


        case "verification_rejected":
        case "verification_failed":
            return <ShieldAlert size={21} />;


        // --------------------------------------------------
        // MONETIZATION
        // --------------------------------------------------

        case "monetization":
        case "monetization_approved":
        case "monetization_enabled":
        case "song_monetized":
            return <CircleDollarSign size={21} />;


        case "monetization_rejected":
        case "monetization_disabled":
            return <XCircle size={21} />;


        // --------------------------------------------------
        // ROYALTIES
        // --------------------------------------------------

        case "royalty":
        case "royalties":
        case "royalty_generated":
        case "royalty_earned":
        case "earnings":
        case "earning":
            return <Banknote size={21} />;


        case "royalty_paid":
        case "royalties_paid":
        case "payout":
        case "payout_completed":
        case "withdrawal_completed":
            return <WalletCards size={21} />;


        case "payout_pending":
        case "withdrawal_pending":
            return <Loader2 size={21} />;


        case "payout_failed":
        case "withdrawal_failed":
            return <XCircle size={21} />;


        // --------------------------------------------------
        // LIKES
        // --------------------------------------------------

        case "like":
        case "liked":
        case "song_like":
        case "song_liked":
        case "album_like":
        case "album_liked":
            return <Heart size={21} />;


        // --------------------------------------------------
        // COMMENTS
        // --------------------------------------------------

        case "comment":
        case "commented":
        case "new_comment":
        case "song_comment":
            return <MessageCircle size={21} />;


        // --------------------------------------------------
        // PLAYLISTS
        // --------------------------------------------------

        case "playlist":
        case "playlist_created":
        case "playlist_add":
        case "added_to_playlist":
        case "playlist_added":
            return <ListMusic size={21} />;


        // --------------------------------------------------
        // DOWNLOADS
        // --------------------------------------------------

        case "download":
        case "song_downloaded":
        case "downloaded":
            return <Download size={21} />;


        // --------------------------------------------------
        // STREAMS
        // --------------------------------------------------

        case "stream":
        case "song_stream":
        case "stream_milestone":
        case "plays_milestone":
            return <Play size={21} />;


        // --------------------------------------------------
        // MESSAGES
        // --------------------------------------------------

        case "message":
        case "new_message":
        case "direct_message":
            return <Send size={21} />;


        // --------------------------------------------------
        // ACCOUNT
        // --------------------------------------------------

        case "account":
        case "account_update":
        case "profile_update":
            return <User size={21} />;


        case "password":
        case "password_changed":
        case "security":
        case "security_alert":
            return <Lock size={21} />;


        // --------------------------------------------------
        // ADMIN / SYSTEM
        // --------------------------------------------------

        case "admin":
        case "admin_message":
        case "system":
        case "system_message":
            return <Settings size={21} />;


        case "announcement":
        case "notice":
            return <Bell size={21} />;


        // --------------------------------------------------
        // COPYRIGHT
        // --------------------------------------------------

        case "copyright":
        case "copyright_claim":
        case "copyright_warning":
            return <ShieldAlert size={21} />;


        // --------------------------------------------------
        // DISTRIBUTION
        // --------------------------------------------------

        case "distribution":
        case "distribution_started":
        case "distribution_complete":
        case "distributed":
            return <Send size={21} />;


        // --------------------------------------------------
        // DEFAULT
        // --------------------------------------------------

        default:
            return <Bell size={21} />;

    }

}


// ======================================================
// GET NOTIFICATION TITLE
// ======================================================

function getNotificationTitle(notification) {

    if (notification?.title) {
        return notification.title;
    }

    const type =
        normalizeNotificationType(
            notification
        );

    switch (type) {

        // Followers

        case "follower":
        case "follow":
        case "new_follower":
        case "user_followed":
            return "New follower";


        // Uploads

        case "upload":
        case "song_upload":
        case "upload_complete":
        case "upload_completed":
        case "song_uploaded":
        case "album_uploaded":
        case "release_uploaded":
            return "Upload complete";


        case "upload_failed":
        case "upload_error":
            return "Upload failed";


        // Songs

        case "song":
        case "song_added":
        case "new_song":
        case "track":
            return "New song";


        // Albums

        case "album":
        case "new_album":
        case "album_created":
        case "album_published":
            return "Album update";


        // Releases

        case "release":
        case "new_release":
        case "release_published":
            return "New release";


        // Verification

        case "verification":
        case "verification_approved":
        case "account_verified":
        case "verified":
            return "Verification approved";


        case "verification_rejected":
        case "verification_failed":
            return "Verification update";


        // Monetization

        case "monetization":
        case "monetization_approved":
        case "monetization_enabled":
        case "song_monetized":
            return "Monetization approved";


        case "monetization_rejected":
        case "monetization_disabled":
            return "Monetization update";


        // Royalties

        case "royalty":
        case "royalties":
        case "royalty_generated":
        case "royalty_earned":
        case "earnings":
        case "earning":
            return "Royalty generated";


        case "royalty_paid":
        case "royalties_paid":
        case "payout":
        case "payout_completed":
        case "withdrawal_completed":
            return "Payment completed";


        case "payout_pending":
        case "withdrawal_pending":
            return "Payment pending";


        case "payout_failed":
        case "withdrawal_failed":
            return "Payment failed";


        // Likes

        case "like":
        case "liked":
        case "song_like":
        case "song_liked":
        case "album_like":
        case "album_liked":
            return "New like";


        // Comments

        case "comment":
        case "commented":
        case "new_comment":
        case "song_comment":
            return "New comment";


        // Playlists

        case "playlist":
        case "playlist_created":
        case "playlist_add":
        case "added_to_playlist":
        case "playlist_added":
            return "Playlist update";


        // Downloads

        case "download":
        case "song_downloaded":
        case "downloaded":
            return "Song downloaded";


        // Streams

        case "stream":
        case "song_stream":
        case "stream_milestone":
        case "plays_milestone":
            return "Stream milestone";


        // Messages

        case "message":
        case "new_message":
        case "direct_message":
            return "New message";


        // Account

        case "account":
        case "account_update":
        case "profile_update":
            return "Account update";


        case "password":
        case "password_changed":
            return "Password updated";


        case "security":
        case "security_alert":
            return "Security alert";


        // Admin

        case "admin":
        case "admin_message":
            return "Cave Tunes Admin";


        // System

        case "system":
        case "system_message":
            return "System notification";


        case "announcement":
        case "notice":
            return "Cave Tunes announcement";


        // Copyright

        case "copyright":
        case "copyright_claim":
        case "copyright_warning":
            return "Copyright notification";


        // Distribution

        case "distribution":
        case "distribution_started":
        case "distribution_complete":
        case "distributed":
            return "Distribution update";


        default:
            return "Cave Tunes notification";

    }

}


// ======================================================
// GET NOTIFICATION MESSAGE
// ======================================================

function getNotificationMessage(notification) {

    return (
        notification?.message ||
        notification?.body ||
        notification?.description ||
        notification?.text ||
        "You have a new notification from Cave Tunes."
    );

}


// ======================================================
// GET NOTIFICATION DATE
// ======================================================

function getNotificationDate(notification) {

    return (
        notification?.created_at ||
        notification?.createdAt ||
        notification?.timestamp ||
        notification?.date ||
        notification?.sent_at ||
        notification?.sentAt ||
        null
    );

}


// ======================================================
// FORMAT DATE
// ======================================================

function formatNotificationDate(date) {

    if (!date) {
        return "";
    }

    const parsedDate =
        new Date(date);

    if (
        Number.isNaN(
            parsedDate.getTime()
        )
    ) {
        return "";
    }

    return parsedDate.toLocaleString(
        undefined,
        {
            dateStyle: "medium",
            timeStyle: "short",
        }
    );

}


// ======================================================
// GET NOTIFICATION ID
// ======================================================

function getNotificationId(notification) {

    return (
        notification?.id ||
        notification?.notification_id ||
        notification?.notificationId ||
        null
    );

}


// ======================================================
// GET NOTIFICATION TARGET
// ======================================================

function getNotificationTarget(notification) {

    return (
        notification?.action_url ||
        notification?.actionUrl ||
        notification?.target_url ||
        notification?.targetUrl ||
        notification?.link ||
        notification?.url ||
        null
    );

}


// ======================================================
// NOTIFICATIONS PAGE
// ======================================================

export default function Notifications() {

    const navigate =
        useNavigate();


    const {
        user,
        isAuthenticated,
        loading: authLoading,
    } = useAuth();


    const [
        notifications,
        setNotifications,
    ] = useState([]);


    const [
        loading,
        setLoading,
    ] = useState(true);


    const [
        error,
        setError,
    ] = useState("");


    const [
        markingAll,
        setMarkingAll,
    ] = useState(false);


    // ==================================================
    // LOAD NOTIFICATIONS
    // ==================================================

    const loadNotifications =
        useCallback(async () => {

            if (
                !isAuthenticated ||
                !user
            ) {
                return;
            }

            try {

                setError("");

                const response =
                    await getNotifications();


                const list =
                    Array.isArray(response)
                        ? response
                        : Array.isArray(
                            response?.notifications
                        )
                            ? response.notifications
                            : Array.isArray(
                                response?.data
                            )
                                ? response.data
                                : [];


                setNotifications(list);

            } catch (requestError) {

                console.error(
                    "Failed to load notifications:",
                    requestError
                );

                setError(
                    requestError?.message ||
                    "Unable to load notifications."
                );

            } finally {

                setLoading(false);

            }

        }, [
            isAuthenticated,
            user,
        ]);


    // ==================================================
    // AUTHENTICATION
    // ==================================================

    useEffect(() => {

        if (authLoading) {
            return;
        }


        // ------------------------------------------------
        // NOT LOGGED IN
        // ------------------------------------------------

        if (
            !isAuthenticated ||
            !user
        ) {

            navigate(
                "/login",
                {
                    replace: true,
                }
            );

            return;

        }


        // ------------------------------------------------
        // LOAD AFTER EFFECT
        //
        // This avoids React's
        // set-state-in-effect ESLint warning.
        // ------------------------------------------------

        const timer =
            window.setTimeout(() => {

                loadNotifications();

            }, 0);


        return () => {

            window.clearTimeout(
                timer
            );

        };

    }, [
        authLoading,
        isAuthenticated,
        user,
        navigate,
        loadNotifications,
    ]);


    // ==================================================
    // UNREAD COUNT
    // ==================================================

    const unreadCount =
        useMemo(() => {

            return notifications.filter(
                notification =>
                    !isNotificationRead(
                        notification
                    )
            ).length;

        }, [
            notifications,
        ]);


    // ==================================================
    // MARK ONE READ
    // ==================================================

    const handleMarkRead =
        useCallback(
            async (notification) => {

                const notificationId =
                    getNotificationId(
                        notification
                    );


                if (!notificationId) {
                    return;
                }


                const alreadyRead =
                    isNotificationRead(
                        notification
                    );


                const target =
                    getNotificationTarget(
                        notification
                    );


                try {

                    // ------------------------------------------
                    // MARK READ
                    // ------------------------------------------

                    if (!alreadyRead) {

                        await markNotificationRead(
                            notificationId
                        );


                        setNotifications(
                            current =>
                                current.map(
                                    item =>
                                        getNotificationId(
                                            item
                                        ) === notificationId
                                            ? {
                                                ...item,
                                                read: true,
                                                is_read: true,
                                                isRead: true,
                                            }
                                            : item
                                )
                        );

                    }


                    // ------------------------------------------
                    // NAVIGATE
                    // ------------------------------------------

                    if (target) {

                        if (
                            target.startsWith("/")
                        ) {

                            navigate(target);

                        } else {

                            window.location.href =
                                target;

                        }

                    }

                } catch (requestError) {

                    console.error(
                        "Failed to process notification:",
                        requestError
                    );

                }

            },
            [
                navigate,
            ]
        );


    // ==================================================
    // MARK ALL READ
    // ==================================================

    const handleMarkAllRead =
        useCallback(async () => {

            if (
                markingAll ||
                unreadCount === 0
            ) {
                return;
            }


            try {

                setMarkingAll(true);


                await markAllNotificationsRead();


                setNotifications(
                    current =>
                        current.map(
                            notification => ({
                                ...notification,
                                read: true,
                                is_read: true,
                                isRead: true,
                            })
                        )
                );

            } catch (requestError) {

                console.error(
                    "Failed to mark all notifications as read:",
                    requestError
                );

                setError(
                    requestError?.message ||
                    "Unable to mark notifications as read."
                );

            } finally {

                setMarkingAll(false);

            }

        }, [
            markingAll,
            unreadCount,
        ]);


    // ==================================================
    // REFRESH
    // ==================================================

    const handleRefresh =
        useCallback(() => {

            setLoading(true);

            loadNotifications();

        }, [
            loadNotifications,
        ]);


    // ==================================================
    // AUTH LOADING
    // ==================================================

    if (authLoading) {

        return (

            <main className="notifications-page">

                <section className="notifications-loading">

                    <Loader2
                        size={30}
                        className="notifications-spinning"
                    />

                    <p>
                        Checking your account...
                    </p>

                </section>

            </main>

        );

    }


    // ==================================================
    // NOT AUTHENTICATED
    // ==================================================

    if (
        !isAuthenticated ||
        !user
    ) {

        return (

            <main className="notifications-page">

                <section className="notifications-empty">

                    <div className="notifications-empty-icon">

                        <Bell size={34} />

                    </div>


                    <h2>
                        Login required
                    </h2>


                    <p>
                        Please login to view your
                        Cave Tunes notifications.
                    </p>


                    <button
                        type="button"
                        className="notifications-login-button"
                        onClick={() =>
                            navigate("/login")
                        }
                    >
                        Login
                    </button>

                </section>

            </main>

        );

    }


    // ==================================================
    // PAGE
    // ==================================================

    return (

        <main className="notifications-page">


            {/* ==================================================
                HEADER
            ================================================== */}

            <header className="notifications-header">

                <button
                    type="button"
                    className="notifications-back-button"
                    onClick={() =>
                        navigate(-1)
                    }
                >

                    <ArrowLeft size={18} />

                    Back

                </button>


                <div className="notifications-title">

                    <div className="notifications-title-icon">

                        <Bell size={24} />

                    </div>


                    <div>

                        <h1>
                            Notifications
                        </h1>

                        <p>
                            Stay updated with everything
                            happening on your Cave Tunes account.
                        </p>

                    </div>

                </div>


                <div className="notifications-header-actions">

                    <button
                        type="button"
                        className="notifications-refresh-button"
                        onClick={handleRefresh}
                        disabled={loading}
                        title="Refresh notifications"
                    >

                        <RefreshCw
                            size={18}
                            className={
                                loading
                                    ? "notifications-spinning"
                                    : ""
                            }
                        />

                    </button>


                    {unreadCount > 0 && (

                        <button
                            type="button"
                            className="notifications-mark-all"
                            onClick={
                                handleMarkAllRead
                            }
                            disabled={markingAll}
                        >

                            <CheckCheck size={18} />

                            {markingAll
                                ? "Marking..."
                                : "Mark all read"
                            }

                        </button>

                    )}

                </div>

            </header>


            {/* ==================================================
                SUMMARY
            ================================================== */}

            <section className="notifications-summary">

                <div className="notifications-summary-icon">

                    <Bell size={20} />

                </div>


                <div>

                    <strong>
                        {unreadCount}
                    </strong>

                    <span>
                        {unreadCount === 1
                            ? " unread notification"
                            : " unread notifications"
                        }
                    </span>

                </div>

            </section>


            {/* ==================================================
                ERROR
            ================================================== */}

            {error && (

                <div className="notifications-error">

                    <AlertCircle size={20} />

                    <span>
                        {error}
                    </span>


                    <button
                        type="button"
                        onClick={handleRefresh}
                    >
                        Try again
                    </button>

                </div>

            )}


            {/* ==================================================
                LOADING
            ================================================== */}

            {loading && (

                <section className="notifications-loading">

                    <Loader2
                        size={30}
                        className="notifications-spinning"
                    />

                    <p>
                        Loading notifications...
                    </p>

                </section>

            )}


            {/* ==================================================
                EMPTY
            ================================================== */}

            {!loading &&
                !error &&
                notifications.length === 0 && (

                    <section className="notifications-empty">

                        <div className="notifications-empty-icon">

                            <Bell size={34} />

                        </div>


                        <h2>
                            No notifications yet
                        </h2>


                        <p>
                            When someone follows you, your
                            music uploads finish, your songs
                            receive likes or comments, your
                            account is verified, monetization
                            is approved, royalties are generated,
                            or Cave Tunes sends you an important
                            message, you'll see it here.
                        </p>

                    </section>

                )}


            {/* ==================================================
                NOTIFICATION LIST
            ================================================== */}

            {!loading &&
                notifications.length > 0 && (

                    <section className="notifications-list">

                        {notifications.map(
                            (
                                notification,
                                index
                            ) => {

                                const notificationId =
                                    getNotificationId(
                                        notification
                                    );


                                const isRead =
                                    isNotificationRead(
                                        notification
                                    );


                                const notificationType =
                                    normalizeNotificationType(
                                        notification
                                    );


                                const target =
                                    getNotificationTarget(
                                        notification
                                    );


                                return (

                                    <article
                                        key={
                                            notificationId ||
                                            `notification-${index}`
                                        }
                                        className={
                                            `notification-item ${
                                                isRead
                                                    ? "notification-read"
                                                    : "notification-unread"
                                            } ${
                                                target
                                                    ? "notification-clickable"
                                                    : ""
                                            }`
                                        }
                                        onClick={() =>
                                            handleMarkRead(
                                                notification
                                            )
                                        }
                                        role={
                                            target
                                                ? "button"
                                                : undefined
                                        }
                                        tabIndex={
                                            target
                                                ? 0
                                                : undefined
                                        }
                                        onKeyDown={
                                            target
                                                ? (
                                                    event
                                                ) => {

                                                    if (
                                                        event.key ===
                                                        "Enter" ||
                                                        event.key ===
                                                        " "
                                                    ) {

                                                        event.preventDefault();

                                                        handleMarkRead(
                                                            notification
                                                        );

                                                    }

                                                }
                                                : undefined
                                        }
                                    >

                                        {/* ==========================================
                                            ICON
                                        ========================================== */}

                                        <div
                                            className={
                                                `notification-icon notification-icon-${notificationType}`
                                            }
                                        >

                                            {getNotificationIcon(
                                                notificationType
                                            )}

                                        </div>


                                        {/* ==========================================
                                            CONTENT
                                        ========================================== */}

                                        <div className="notification-content">

                                            <div className="notification-top">

                                                <h3>
                                                    {getNotificationTitle(
                                                        notification
                                                    )}
                                                </h3>


                                                {!isRead && (

                                                    <span className="notification-new">
                                                        New
                                                    </span>

                                                )}

                                            </div>


                                            <p>
                                                {getNotificationMessage(
                                                    notification
                                                )}
                                            </p>


                                            <time>
                                                {formatNotificationDate(
                                                    getNotificationDate(
                                                        notification
                                                    )
                                                )}
                                            </time>

                                        </div>


                                        {/* ==========================================
                                            STATUS
                                        ========================================== */}

                                        <div className="notification-status">

                                            {isRead ? (

                                                <Check
                                                    size={17}
                                                />

                                            ) : (

                                                <span className="notification-unread-dot" />

                                            )}

                                        </div>

                                    </article>

                                );

                            }
                        )}

                    </section>

                )}

        </main>

    );

}