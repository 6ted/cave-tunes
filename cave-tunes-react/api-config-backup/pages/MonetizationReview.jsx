// ======================================================
// CAVE TUNES
// MONETIZATION REVIEW
// src/pages/MonetizationReview.jsx
// ======================================================

import {
    useMemo,
    useState,
} from "react";

import {
    useNavigate,
} from "react-router-dom";

import "./MonetizationReview.css";


// ======================================================
// API
// ======================================================

const API_BASE_URL =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1"
        ? "http://localhost:5000"
        : window.location.origin;


// ======================================================
// STORAGE KEYS
// ======================================================

const APPLICATION_STORAGE_KEY =
    "caveTunesMonetizationApplication";

const SETUP_STORAGE_KEY =
    "caveTunesMonetizationSetup";

const SUBMITTED_STORAGE_KEY =
    "caveTunesMonetizationSubmitted";

// ======================================================
// MONETIZATION REQUIREMENTS
// ======================================================
const REQUIRED_MONETIZATION_FOLLOWERS = 1000;
const REQUIRED_MONETIZATION_PLAYS = 1000;

// ======================================================
// TOKEN
// ======================================================

function getToken() {
    return localStorage.getItem("token");
}


// ======================================================
// READ JSON STORAGE
// ======================================================

function readStorage(key) {

    try {

        const value =
            sessionStorage.getItem(key);

        if (!value) {
            return null;
        }

        const parsed =
            JSON.parse(value);

        if (
            !parsed ||
            typeof parsed !== "object"
        ) {
            return null;
        }

        return parsed;

    } catch (error) {

        console.error(
            `Unable to read storage: ${key}`,
            error
        );

        return null;
    }
}


// ======================================================
// READ LOCAL USER
// ======================================================

function readLocalUser() {

    try {

        const value =
            localStorage.getItem("user");

        if (!value) {
            return null;
        }

        const user =
            JSON.parse(value);

        if (
            !user ||
            typeof user !== "object"
        ) {
            return null;
        }

        return user;

    } catch (error) {

        console.error(
            "Unable to read local user:",
            error
        );

        return null;
    }
}


// ======================================================
// DECODE JWT
// ======================================================
//
// This is important because your AuthContext already knows:
//
// role: "producer"
// is_admin: true
//
// but localStorage currently does not contain "user".
//
// Therefore we also inspect the JWT.
// ======================================================

function decodeTokenPayload(token) {

    if (!token) {
        return null;
    }

    try {

        const parts =
            token.split(".");

        if (parts.length !== 3) {
            return null;
        }

        const base64 =
            parts[1]
                .replace(/-/g, "+")
                .replace(/_/g, "/");

        const padded =
            base64.padEnd(
                base64.length +
                (
                    4 -
                    (base64.length % 4)
                ) % 4,
                "="
            );

        const decoded =
            atob(padded);

        return JSON.parse(decoded);

    } catch (error) {

        console.warn(
            "Unable to decode authentication token:",
            error
        );

        return null;
    }
}


// ======================================================
// ADMIN DETECTION
// ======================================================
//
// Supports all of these:
//
// is_admin: true
// isAdmin: true
// role: "admin"
// role: "administrator"
//
// From:
// - localStorage user
// - application
// - application.user
// - JWT payload
// ======================================================

function detectAdmin(
    application,
    localUser,
    tokenUser
) {

    const candidates = [

        localUser,

        application,

        application?.user,

        tokenUser,

        tokenUser?.user,

    ];


    return candidates.some(
        (user) => {

            if (!user) {
                return false;
            }

            return (

                user.is_admin === true ||

                user.isAdmin === true ||

                String(
                    user.role || ""
                ).toLowerCase() === "admin" ||

                String(
                    user.role || ""
                ).toLowerCase() ===
                    "administrator"

            );
        }
    );
}


// ======================================================
// FORMAT VALUE
// ======================================================

function formatValue(value) {

    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {
        return "Not provided";
    }

    return String(value)
        .replace(/_/g, " ")
        .replace(
            /\b\w/g,
            (letter) =>
                letter.toUpperCase()
        );
}


// ======================================================
// FORMAT NUMBER
// ======================================================

function formatNumber(value) {

    const number =
        Number(value);

    if (
        Number.isNaN(number)
    ) {
        return "0";
    }

    return number.toLocaleString();
}


// ======================================================
// PAYOUT METHOD
// ======================================================

function getPayoutMethodName(method) {

    const methods = {

        airtel_money:
            "Airtel Money",

        tnm_mpamba:
            "TNM Mpamba",

        bank_transfer:
            "Bank Transfer",

    };

    return (
        methods[method] ||
        formatValue(method)
    );
}


// ======================================================
// MASK PHONE
// ======================================================

function maskPhoneNumber(phone) {

    if (!phone) {
        return "Not provided";
    }

    const value =
        String(phone);

    if (value.length <= 4) {
        return value;
    }

    return `•••• ${value.slice(-4)}`;
}


// ======================================================
// MASK ACCOUNT
// ======================================================

function maskAccountNumber(accountNumber) {

    if (!accountNumber) {
        return "Not provided";
    }

    const value =
        String(accountNumber);

    if (value.length <= 4) {
        return value;
    }

    return `•••• ${value.slice(-4)}`;
}


// ======================================================
// CHECK ICON
// ======================================================

function CheckIcon({
    checked = true,
}) {

    return (

        <span
            className={`review-check-icon ${
                checked
                    ? "checked"
                    : "unchecked"
            }`}
        >

            {checked
                ? "✓"
                : "!"}

        </span>
    );
}


// ======================================================
// REVIEW ROW
// ======================================================

function ReviewRow({
    label,
    value,
}) {

    return (

        <div className="review-row">

            <span>
                {label}
            </span>

            <strong>
                {value}
            </strong>

        </div>
    );
}


// ======================================================
// MAIN
// ======================================================

export default function MonetizationReview() {

    const navigate =
        useNavigate();


    // ==================================================
    // SESSION DATA
    // ==================================================

    const [
        application,
    ] = useState(
        () =>
            readStorage(
                APPLICATION_STORAGE_KEY
            )
    );


    const [
        payout,
    ] = useState(
        () =>
            readStorage(
                SETUP_STORAGE_KEY
            )
    );


    // ==================================================
    // AUTH DATA
    // ==================================================

    const localUser =
        useMemo(
            () =>
                readLocalUser(),
            []
        );


    const token =
        useMemo(
            () =>
                getToken(),
            []
        );


    const tokenUser =
        useMemo(
            () =>
                decodeTokenPayload(
                    token
                ),
            [token]
        );


    // ==================================================
    // ADMIN
    // ==================================================

    const isAdmin =
        useMemo(
            () =>
                detectAdmin(
                    application,
                    localUser,
                    tokenUser
                ),
            [
                application,
                localUser,
                tokenUser,
            ]
        );


    // ==================================================
    // DEBUG
    // ==================================================

    console.log(
        "CAVE TUNES MONETIZATION REVIEW",
        {
            application,
            payout,
            localUser,
            tokenUser,
            isAdmin,
        }
    );


    // ==================================================
    // STATE
    // ==================================================

    const [
        submitting,
        setSubmitting,
    ] = useState(false);


    const [
        error,
        setError,
    ] = useState("");


    const [
        termsAccepted,
        setTermsAccepted,
    ] = useState(false);


    const [
        finalConfirmation,
        setFinalConfirmation,
    ] = useState(false);


    // ==================================================
    // PAYOUT TYPE
    // ==================================================

    const isMobileMoney =
        payout?.payoutMethod ===
            "airtel_money" ||
        payout?.payoutMethod ===
            "tnm_mpamba";


    const isBank =
        payout?.payoutMethod ===
        "bank_transfer";


    // ==================================================
    // ELIGIBILITY
    // ==================================================

    const eligibility =
        application?.eligibility || {};


    const verified =
        Boolean(
            eligibility.verified
        );


    const followers =
        Number(
            eligibility.followers_count || 0
        );


    const highestPlays =
        Number(
            eligibility.highest_song_plays || 0
        );


  const requirementsComplete =
    verified &&
    followers >= REQUIRED_MONETIZATION_FOLLOWERS &&
    highestPlays >= REQUIRED_MONETIZATION_PLAYS;


    const eligibilityAllowed =
        isAdmin ||
        requirementsComplete;


    // ==================================================
    // CREATOR DECLARATIONS
    // ==================================================

    const ownsContent =
        application?.ownsContent === true;


    const followsPolicies =
        application?.followsPolicies === true;


    const accurateInformation =
        application?.accurateInformation === true;


    const declarationsComplete =
        ownsContent &&
        followsPolicies &&
        accurateInformation;


    // ==================================================
    // APPLICATION VALIDATION
    // ==================================================

    const applicationValid =
        Boolean(

            application &&

            application.creatorType &&

            application.primaryContent &&

            application.audienceSize &&

            application.uploadFrequency &&

            application.monetizationGoal &&

            declarationsComplete

        );


    // ==================================================
    // PAYOUT VALIDATION
    // ==================================================

    const payoutValid =
        useMemo(() => {

            if (!payout) {
                return false;
            }


            if (
                !payout.payoutMethod
            ) {
                return false;
            }


            if (
                !String(
                    payout.accountHolderName || ""
                ).trim()
            ) {
                return false;
            }


            if (isMobileMoney) {

                return Boolean(
                    String(
                        payout.phoneNumber || ""
                    ).trim()
                );
            }


            if (isBank) {

                return Boolean(

                    String(
                        payout.bankName || ""
                    ).trim() &&

                    String(
                        payout.accountNumber || ""
                    ).trim() &&

                    payout.accountType &&

                    String(
                        payout.branchName || ""
                    ).trim()

                );
            }


            return false;

        }, [
            payout,
            isMobileMoney,
            isBank,
        ]);


    // ==================================================
    // SUBMIT VALIDATION
    // ==================================================
    //
    // ADMIN:
    //
    // ONLY:
    //   ✓ Terms
    //   ✓ Final confirmation
    //
    // NORMAL CREATOR:
    //
    //   ✓ Eligibility
    //   ✓ Application
    //   ✓ Payout
    //   ✓ Terms
    //   ✓ Confirmation
    //
    // ==================================================

    const canSubmit =
        isAdmin

            ? (
                termsAccepted &&
                finalConfirmation &&
                !submitting
            )

            : (
                eligibilityAllowed &&
                applicationValid &&
                payoutValid &&
                termsAccepted &&
                finalConfirmation &&
                !submitting
            );


    // ==================================================
    // PAYOUT DISPLAY
    // ==================================================

    const payoutAccountDisplay =
        useMemo(() => {

            if (!payout) {

                return {

                    method:
                        "Not provided",

                    account:
                        "Not provided",

                    holder:
                        "Not provided",

                };
            }


            if (isMobileMoney) {

                return {

                    method:
                        getPayoutMethodName(
                            payout.payoutMethod
                        ),

                    account:
                        maskPhoneNumber(
                            payout.phoneNumber
                        ),

                    holder:
                        payout.accountHolderName ||
                        "Not provided",

                };
            }


            if (isBank) {

                return {

                    method:
                        getPayoutMethodName(
                            payout.payoutMethod
                        ),

                    account:
                        maskAccountNumber(
                            payout.accountNumber
                        ),

                    holder:
                        payout.accountHolderName ||
                        "Not provided",

                };
            }


            return {

                method:
                    getPayoutMethodName(
                        payout.payoutMethod
                    ),

                account:
                    "Not provided",

                holder:
                    payout.accountHolderName ||
                    "Not provided",

            };

        }, [
            payout,
            isMobileMoney,
            isBank,
        ]);


    // ==================================================
    // NAVIGATION
    // ==================================================

    const handleBack = () => {

        if (submitting) {
            return;
        }

        navigate(
            "/monetization/setup"
        );
    };


    const handleMonetization = () => {

        if (submitting) {
            return;
        }

        navigate(
            "/monetization"
        );
    };


    // ==================================================
    // SUBMIT
    // ==================================================

    const handleSubmit =
        async (event) => {

            event.preventDefault();


            if (submitting) {
                return;
            }


            setError("");


            // ==========================================
            // FINAL CHECK
            // ==========================================

            if (!canSubmit) {

                if (!termsAccepted) {

                    setError(
                        "Please agree to the Cave Tunes monetization terms."
                    );

                    return;
                }


                if (!finalConfirmation) {

                    setError(
                        "Please confirm that all information provided is accurate."
                    );

                    return;
                }


                return;
            }


            // ==========================================
            // DATA CHECKS
            // ==========================================
            //
            // Admin is allowed to bypass the normal
            // application/payout eligibility checks.
            //
            // We still need the data objects because
            // they are included in the submission.
            // ==========================================

            if (!application) {

                setError(
                    "Application information is missing. Please return to Step 01."
                );

                return;
            }


            if (!payout) {

                setError(
                    "Payout information is missing. Please return to Step 02."
                );

                return;
            }


            // ==========================================
            // NORMAL CREATOR VALIDATION ONLY
            // ==========================================

            if (!isAdmin) {

                if (!requirementsComplete) {

                    setError(
                        "You do not currently meet all Cave Tunes monetization eligibility requirements."
                    );

                    return;
                }


                if (!applicationValid) {

                    setError(
                        "Please return to Step 01 and complete all required creator information."
                    );

                    return;
                }


                if (!payoutValid) {

                    setError(
                        "Your payout information is incomplete. Please return to Step 02 and verify your details."
                    );

                    return;
                }

            }


            // ==========================================
            // TOKEN
            // ==========================================

            const authToken =
                getToken();


            if (!authToken) {

                setError(
                    "Your session has expired. Please log in again."
                );

                return;
            }


            setSubmitting(true);


            try {

                // ======================================
                // REVIEW
                // ======================================

                const review = {

                    termsAccepted:
                        true,

                    finalConfirmation:
                        true,

                    submittedFrom:
                        "monetization_review",

                    reviewedAt:
                        new Date().toISOString(),

                    isAdmin:
                        isAdmin,

                };


                // ======================================
                // APPLICATION DATA
                // ======================================

                const applicationData = {

                    creatorType:
                        application.creatorType ||
                        null,

                    primaryContent:
                        application.primaryContent ||
                        null,

                    audienceSize:
                        application.audienceSize ||
                        null,

                    uploadFrequency:
                        application.uploadFrequency ||
                        null,

                    monetizationGoal:
                        application.monetizationGoal ||
                        null,

                    ownsContent:
                        ownsContent,

                    followsPolicies:
                        followsPolicies,

                    accurateInformation:
                        accurateInformation,

                    eligibility: {

                        verified:
                            verified,

                        followers_count:
                            followers,

                        highest_song_plays:
                            highestPlays,

                    },

                };


                // ======================================
                // PAYOUT DATA
                // ======================================

                const payoutData = {

                    payoutMethod:
                        payout.payoutMethod,

                    accountHolderName:
                        String(
                            payout.accountHolderName || ""
                        ).trim(),

                };


                // ======================================
                // MOBILE MONEY
                // ======================================

                if (isMobileMoney) {

                    payoutData.phoneNumber =
                        String(
                            payout.phoneNumber || ""
                        )
                            .replace(
                                /\s+/g,
                                ""
                            )
                            .trim();
                }


                // ======================================
                // BANK
                // ======================================

                if (isBank) {

                    payoutData.bankName =
                        String(
                            payout.bankName || ""
                        ).trim();


                    payoutData.accountNumber =
                        String(
                            payout.accountNumber || ""
                        )
                            .replace(
                                /\s+/g,
                                ""
                            )
                            .trim();


                    payoutData.accountType =
                        payout.accountType;


                    payoutData.branchName =
                        String(
                            payout.branchName || ""
                        ).trim();


                    payoutData.bankCode =
                        payout.bankCode
                            ? String(
                                payout.bankCode
                            ).trim()
                            : null;
                }


                // ======================================
                // COMPLETE PAYLOAD
                // ======================================

                const payload = {

                    application:
                        applicationData,

                    payout:
                        payoutData,

                    review:
                        review,

                };


                console.log(
                    "Submitting Cave Tunes monetization request:",
                    payload
                );


                // ======================================
                // API
                // ======================================

                const response =
                    await fetch(
                        `${API_BASE_URL}/api/creator/monetization-request`,
                        {

                            method:
                                "POST",

                            headers: {

                                "Content-Type":
                                    "application/json",

                                Authorization:
                                    `Bearer ${authToken}`,

                            },

                            body:
                                JSON.stringify(
                                    payload
                                ),

                        }
                    );


                // ======================================
                // RESPONSE
                // ======================================

                const responseText =
                    await response.text();


                let data = {};


                if (responseText) {

                    try {

                        data =
                            JSON.parse(
                                responseText
                            );

                    } catch (parseError) {

                        console.error(
                            "Invalid API response:",
                            parseError
                        );

                        console.error(
                            "Raw server response:",
                            responseText
                        );

                        setError(
                            "The server returned an invalid response. Please check that the Cave Tunes backend is running correctly."
                        );

                        return;
                    }
                }


                // ======================================
                // API ERROR
                // ======================================

                if (!response.ok) {

                    throw new Error(
                        data.message ||
                        data.error ||
                        "Unable to submit your monetization request."
                    );
                }


                // ======================================
                // SUCCESS
                // ======================================

                const request =
                    data.request ||
                    data.data?.request ||
                    null;


                sessionStorage.setItem(
                    SUBMITTED_STORAGE_KEY,
                    JSON.stringify({

                        submitted:
                            true,

                        requestId:
                            request?.id ||
                            data.requestId ||
                            null,

                        submittedAt:
                            new Date().toISOString(),

                    })
                );


                // ======================================
                // CLEAR TEMP DATA
                // ======================================

                sessionStorage.removeItem(
                    APPLICATION_STORAGE_KEY
                );


                sessionStorage.removeItem(
                    SETUP_STORAGE_KEY
                );


                // ======================================
                // SUCCESS PAGE
                // ======================================

                navigate(
                    "/monetization/success",
                    {
                        replace:
                            true,

                        state: {
                            request:
                                request,
                        },
                    }
                );

            } catch (submitError) {

                console.error(
                    "MONETIZATION SUBMISSION ERROR:",
                    submitError
                );


                setError(
                    submitError.message ||
                    "Unable to submit your monetization request. Please try again."
                );

            } finally {

                setSubmitting(false);
            }
        };


    // ==================================================
    // MISSING DATA
    // ==================================================

    if (
        !application ||
        !payout
    ) {

        const missingMessage =
            !application

                ? "Your monetization application could not be found. Please complete Step 01 first."

                : !payout

                    ? "Your payout setup could not be found. Please complete Step 02 first."

                    : "We could not load your monetization review information.";


        return (

            <div className="monetization-review-page">

                <div className="review-bg-grid" />

                <div className="review-bg-orb review-bg-orb-one" />

                <div className="review-bg-orb review-bg-orb-two" />


                <main className="review-main">

                    <div className="review-error-state">

                        <div className="review-error-icon">
                            !
                        </div>

                        <span className="review-eyebrow">
                            MONETIZATION REVIEW
                        </span>

                        <h2>
                            Review information unavailable
                        </h2>

                        <p>
                            {missingMessage}
                        </p>

                        <button
                            type="button"
                            onClick={
                                handleMonetization
                            }
                        >
                            Return to Monetization
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

        <div className="monetization-review-page">

            <div className="review-bg-grid" />

            <div className="review-bg-orb review-bg-orb-one" />

            <div className="review-bg-orb review-bg-orb-two" />


            {/* ==========================================
                HEADER
            ========================================== */}

            <header className="review-header">

                <button
                    type="button"
                    className="review-back-button"
                    onClick={
                        handleBack
                    }
                    disabled={
                        submitting
                    }
                >

                    <span>
                        ←
                    </span>

                    Back to Setup

                </button>


                <div className="review-brand">

                    <span>
                        CAVE TUNES
                    </span>

                    <small>
                        CREATOR MONETIZATION
                    </small>

                </div>

            </header>


            {/* ==========================================
                MAIN
            ========================================== */}

            <main className="review-main">


                {/* ======================================
                    PROGRESS
                ====================================== */}

                <div className="review-progress">

                    <div className="review-progress-step completed">

                        <span>
                            ✓
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


                    <div className="review-progress-line completed" />


                    <div className="review-progress-step completed">

                        <span>
                            ✓
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


                    <div className="review-progress-line active" />


                    <div className="review-progress-step active">

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


                {/* ======================================
                    TITLE
                ====================================== */}

                <section className="review-title">

                    <span className="review-eyebrow">
                        STEP 03 OF 03
                    </span>

                    <h1>

                        Review your

                        <span>
                            {" "}monetization request.
                        </span>

                    </h1>

                    <p>

                        Everything is ready. Carefully review
                        your creator information and payout
                        details before sending your application
                        to the Cave Tunes monetization team.

                    </p>

                </section>


                {/* ======================================
                    READY
                ====================================== */}

                <div className="review-ready-banner">

                    <div className="review-ready-icon">
                        ✓
                    </div>

                    <div>

                        <strong>
                            Application ready for final review
                        </strong>

                        <p>
                            Your Step 01 application and Step 02
                            payout information have been combined
                            for review.
                        </p>

                    </div>

                </div>


                {/* ======================================
                    ADMIN NOTICE
                ====================================== */}

                {isAdmin && (

                    <div className="admin-review-note">

                        <span>
                            A
                        </span>

                        <div>

                            <strong>
                                Administrator account
                            </strong>

                            <p>
                                Administrator privileges allow
                                this account to continue through
                                the monetization workflow without
                                the normal creator eligibility
                                thresholds.
                            </p>

                        </div>

                    </div>

                )}


                {/* ======================================
                    ELIGIBILITY
                ====================================== */}

                <section className="review-card">

                    <div className="review-card-heading">

                        <div className="review-heading-number">
                            01
                        </div>

                        <div>

                            <span>
                                ELIGIBILITY
                            </span>

                            <h2>
                                Creator requirements
                            </h2>

                            <p>
                                The eligibility information
                                captured when your application
                                was prepared.
                            </p>

                        </div>


                        <div
                            className={`review-section-status ${
                                eligibilityAllowed
                                    ? "complete"
                                    : ""
                            }`}
                        >

                            <CheckIcon
                                checked={
                                    eligibilityAllowed
                                }
                            />

                            {isAdmin
                                ? "Admin Access"
                                : requirementsComplete
                                    ? "Complete"
                                    : "Review"}

                        </div>

                    </div>


                    <div className="eligibility-review-grid">

                        <div className="eligibility-review-item">

                            <span>
                                Creator verification
                            </span>

                            <strong
                                className={
                                    verified
                                        ? "success"
                                        : "warning"
                                }
                            >

                                {verified
                                    ? "Verified"
                                    : "Not verified"}

                            </strong>

                        </div>


                        <div className="eligibility-review-item">

                            <span>
                                Creator followers
                            </span>

                            <strong
                                className={
                                    followers >= REQUIRED_MONETIZATION_FOLLOWERS
                                        ? "success"
                                        : "warning"
                                }
                            >

                                {formatNumber(
                                    followers
                                )}

                                <small>
                                    {" "} / {formatNumber(REQUIRED_MONETIZATION_FOLLOWERS)} required
                                </small>

                            </strong>

                        </div>


                        <div className="eligibility-review-item">

                            <span>
                                Highest song plays
                            </span>

                            <strong
                                className={
                                   highestPlays >= REQUIRED_MONETIZATION_PLAYS
                                        ? "success"
                                        : "warning"
                                }
                            >

                                {formatNumber(
                                    highestPlays
                                )}

                                <small>
                                    {" "} / {formatNumber(REQUIRED_MONETIZATION_PLAYS)} required
                                </small>

                            </strong>

                        </div>

                    </div>


                    {isAdmin &&
                        !requirementsComplete && (

                            <div className="admin-review-note">

                                <span>
                                    A
                                </span>

                                <div>

                                    <strong>
                                        Administrator eligibility bypass
                                    </strong>

                                    <p>
                                        The normal creator thresholds
                                        are not required for this
                                        administrator account.
                                    </p>

                                </div>

                            </div>

                        )}

                </section>


                {/* ======================================
                    CREATOR APPLICATION
                ====================================== */}

                <section className="review-card">

                    <div className="review-card-heading">

                        <div className="review-heading-number">
                            02
                        </div>

                        <div>

                            <span>
                                CREATOR APPLICATION
                            </span>

                            <h2>
                                Your creator profile
                            </h2>

                            <p>
                                Information provided in Step 01.
                            </p>

                        </div>


                        <div
                            className={`review-section-status ${
                                applicationValid
                                    ? "complete"
                                    : ""
                            }`}
                        >

                            <CheckIcon
                                checked={
                                    applicationValid
                                }
                            />

                            {applicationValid
                                ? "Complete"
                                : "Review"}

                        </div>

                    </div>


                    <div className="review-details">

                        <ReviewRow
                            label="Creator type"
                            value={formatValue(
                                application.creatorType
                            )}
                        />

                        <ReviewRow
                            label="Primary content"
                            value={formatValue(
                                application.primaryContent
                            )}
                        />

                        <ReviewRow
                            label="Current audience"
                            value={formatValue(
                                application.audienceSize
                            )}
                        />

                        <ReviewRow
                            label="Release frequency"
                            value={formatValue(
                                application.uploadFrequency
                            )}
                        />

                        <ReviewRow
                            label="Monetization goal"
                            value={formatValue(
                                application.monetizationGoal
                            )}
                        />

                    </div>


                    <div className="review-declarations">

                        <div className="review-declaration">

                            <CheckIcon
                                checked={
                                    ownsContent
                                }
                            />

                            <span>
                                Content ownership / rights confirmed
                            </span>

                        </div>


                        <div className="review-declaration">

                            <CheckIcon
                                checked={
                                    followsPolicies
                                }
                            />

                            <span>
                                Cave Tunes policies accepted
                            </span>

                        </div>


                        <div className="review-declaration">

                            <CheckIcon
                                checked={
                                    accurateInformation
                                }
                            />

                            <span>
                                Information accuracy confirmed
                            </span>

                        </div>

                    </div>

                </section>


                {/* ======================================
                    PAYOUT
                ====================================== */}

                <section className="review-card">

                    <div className="review-card-heading">

                        <div className="review-heading-number">
                            03
                        </div>

                        <div>

                            <span>
                                PAYOUT INFORMATION
                            </span>

                            <h2>
                                Your payout account
                            </h2>

                            <p>
                                Information provided in Step 02.
                            </p>

                        </div>


                        <div
                            className={`review-section-status ${
                                payoutValid
                                    ? "complete"
                                    : ""
                            }`}
                        >

                            <CheckIcon
                                checked={
                                    payoutValid
                                }
                            />

                            {payoutValid
                                ? "Complete"
                                : "Review"}

                        </div>

                    </div>


                    <div className="payout-review-header">

                        <div className="payout-review-icon">

                            {isBank
                                ? "🏦"
                                : "📱"}

                        </div>

                        <div>

                            <span>
                                SELECTED PAYOUT METHOD
                            </span>

                            <strong>
                                {
                                    payoutAccountDisplay.method
                                }
                            </strong>

                        </div>

                    </div>


                    <div className="review-details">

                        <ReviewRow
                            label="Account holder"
                            value={
                                payoutAccountDisplay.holder
                            }
                        />


                        {isMobileMoney && (

                            <ReviewRow
                                label="Mobile number"
                                value={
                                    payoutAccountDisplay.account
                                }
                            />

                        )}


                        {isBank && (

                            <>

                                <ReviewRow
                                    label="Bank"
                                    value={formatValue(
                                        payout.bankName
                                    )}
                                />

                                <ReviewRow
                                    label="Account number"
                                    value={
                                        payoutAccountDisplay.account
                                    }
                                />

                                <ReviewRow
                                    label="Account type"
                                    value={formatValue(
                                        payout.accountType
                                    )}
                                />

                                <ReviewRow
                                    label="Branch"
                                    value={formatValue(
                                        payout.branchName
                                    )}
                                />

                                {payout.bankCode && (

                                    <ReviewRow
                                        label="Bank / branch code"
                                        value={
                                            payout.bankCode
                                        }
                                    />

                                )}

                            </>

                        )}

                    </div>


                    <div className="payout-security">

                        <span>
                            🔒
                        </span>

                        <p>
                            Your payout information will
                            only be used to process eligible
                            Cave Tunes monetization payments.
                        </p>

                    </div>

                </section>


                {/* ======================================
                    FINAL CONFIRMATION
                ====================================== */}

                <form
                    className="review-submit-form"
                    onSubmit={
                        handleSubmit
                    }
                >

                    <section className="review-confirmation-card">

                        <div className="confirmation-top">

                            <div className="confirmation-icon">
                                ✓
                            </div>

                            <div>

                                <span>
                                    FINAL CONFIRMATION
                                </span>

                                <h2>
                                    Ready to submit?
                                </h2>

                                <p>
                                    Please confirm the statements
                                    below before sending your
                                    monetization request.
                                </p>

                            </div>

                        </div>


                        <div className="confirmation-options">


                            {/* ==================================
                                TERMS
                            ================================== */}

                            <label
                                className={`confirmation-option ${
                                    termsAccepted
                                        ? "checked"
                                        : ""
                                }`}
                            >

                                <input
                                    type="checkbox"
                                    checked={
                                        termsAccepted
                                    }
                                    onChange={(event) => {

                                        const checked =
                                            event.target.checked;

                                        setTermsAccepted(
                                            checked
                                        );

                                        setError("");

                                    }}
                                    disabled={
                                        submitting
                                    }
                                />


                                <span className="confirmation-checkbox">

                                    {termsAccepted
                                        ? "✓"
                                        : ""}

                                </span>


                                <div>

                                    <strong>
                                        I agree to the Cave Tunes
                                        monetization terms and policies.
                                    </strong>

                                    <p>
                                        I understand that submitting
                                        this application does not
                                        guarantee monetization approval.
                                        Cave Tunes may review my account
                                        and request additional information.
                                    </p>

                                </div>

                            </label>


                            {/* ==================================
                                ACCURACY
                            ================================== */}

                            <label
                                className={`confirmation-option ${
                                    finalConfirmation
                                        ? "checked"
                                        : ""
                                }`}
                            >

                                <input
                                    type="checkbox"
                                    checked={
                                        finalConfirmation
                                    }
                                    onChange={(event) => {

                                        const checked =
                                            event.target.checked;

                                        setFinalConfirmation(
                                            checked
                                        );

                                        setError("");

                                    }}
                                    disabled={
                                        submitting
                                    }
                                />


                                <span className="confirmation-checkbox">

                                    {finalConfirmation
                                        ? "✓"
                                        : ""}

                                </span>


                                <div>

                                    <strong>
                                        I confirm that all information
                                        in this application is accurate.
                                    </strong>

                                    <p>
                                        I confirm that the creator,
                                        audience, content and payout
                                        information above belongs to
                                        me or my authorized creator
                                        account.
                                    </p>

                                </div>

                            </label>

                        </div>

                    </section>


                    {/* ======================================
                        ERROR
                    ====================================== */}

                    {error && (

                        <div className="review-error">

                            <span>
                                !
                            </span>

                            <p>
                                {error}
                            </p>

                        </div>

                    )}


                    {/* ======================================
                        ACTIONS
                    ====================================== */}

                    <div className="review-actions">

                        <button
                            type="button"
                            className="review-cancel"
                            onClick={
                                handleBack
                            }
                            disabled={
                                submitting
                            }
                        >
                            ← Back to Setup
                        </button>


                        <button
                            type="submit"
                            className={`review-submit ${
                                canSubmit
                                    ? "ready"
                                    : ""
                            }`}
                            disabled={
                                !canSubmit
                            }
                        >

                            {submitting ? (

                                <>

                                    <span className="review-button-spinner" />

                                    Submitting...

                                </>

                            ) : (

                                <>

                                    <span>
                                        Submit Monetization Request
                                    </span>

                                    <span>
                                        →
                                    </span>

                                </>

                            )}

                        </button>

                    </div>


                    {/* ======================================
                        NOT READY
                    ====================================== */}

                    {!canSubmit &&
                        !submitting && (

                            <div className="review-locked-message">

                                <span>
                                    🔒
                                </span>

                                <div>

                                    <strong>
                                        Final confirmation required
                                    </strong>

                                    <p>

                                        {isAdmin

                                            ? !termsAccepted

                                                ? "Please agree to the Cave Tunes monetization terms."

                                                : !finalConfirmation

                                                    ? "Please confirm that all information provided is accurate."

                                                    : "Your administrator application is not ready for submission."

                                            : !eligibilityAllowed

                                                ? "You must meet all creator eligibility requirements before submitting."

                                                : !applicationValid

                                                    ? "Please complete all required creator information."

                                                    : !payoutValid

                                                        ? "Please complete your payout information."

                                                        : !termsAccepted

                                                            ? "Please agree to the Cave Tunes monetization terms."

                                                            : !finalConfirmation

                                                                ? "Please confirm that all information provided is accurate."

                                                                : "Your application is not ready for submission."

                                        }

                                    </p>

                                </div>

                            </div>

                        )}


                    {/* ======================================
                        SECURITY
                    ====================================== */}

                    <p className="review-security-note">

                        🔒 Your application is securely associated
                        with your Cave Tunes creator account.

                    </p>

                </form>

            </main>

        </div>
    );
}