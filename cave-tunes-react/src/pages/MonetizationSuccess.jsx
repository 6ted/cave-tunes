// ======================================================
// CAVE TUNES
// MONETIZATION SUCCESS
// src/pages/MonetizationSuccess.jsx
// ======================================================

import {
    useEffect,
    useMemo,
} from "react";

import {
    useLocation,
    useNavigate,
} from "react-router-dom";

import "./MonetizationSuccess.css";


// ======================================================
// STORAGE
// ======================================================

const SUBMITTED_STORAGE_KEY =
    "caveTunesMonetizationSubmitted";


// ======================================================
// FORMAT DATE
// ======================================================

function formatDate(value) {

    if (!value) {
        return "Just now";
    }

    try {

        return new Date(value).toLocaleString(
            undefined,
            {
                dateStyle: "medium",
                timeStyle: "short",
            }
        );

    } catch {

        return "Just now";

    }

}


// ======================================================
// MAIN COMPONENT
// ======================================================

export default function MonetizationSuccess() {

    const navigate =
        useNavigate();

    const location =
        useLocation();


    // ==================================================
    // REQUEST FROM NAVIGATION
    // ==================================================

    const navigationRequest =
        location.state?.request || null;


    // ==================================================
    // STORED SUBMISSION
    // ==================================================

    const storedSubmission =
        useMemo(() => {

            try {

                const stored =
                    sessionStorage.getItem(
                        SUBMITTED_STORAGE_KEY
                    );

                if (!stored) {
                    return null;
                }

                return JSON.parse(stored);

            } catch (error) {

                console.error(
                    "Unable to read monetization submission:",
                    error
                );

                return null;

            }

        }, []);


    // ==================================================
    // REQUEST
    // ==================================================

    const request =
        navigationRequest ||
        storedSubmission?.request ||
        null;


    // ==================================================
    // REQUEST ID
    // ==================================================

    const requestId =
        request?.id ||
        storedSubmission?.requestId ||
        null;


    // ==================================================
    // SUBMITTED DATE
    // ==================================================

    const submittedAt =
        request?.created_at ||
        request?.createdAt ||
        request?.submitted_at ||
        storedSubmission?.submittedAt ||
        null;


    // ==================================================
    // CLEAN URL STATE
    // ==================================================

    useEffect(() => {

        if (location.state) {

            window.history.replaceState(
                {},
                document.title,
                window.location.pathname
            );

        }

    }, [
        location.state,
    ]);


    // ==================================================
    // DASHBOARD
    // ==================================================

    const handleDashboard =
        () => {

            navigate(
                "/monetization"
            );

        };


    // ==================================================
    // WALLET
    // ==================================================

    const handleWallet =
        () => {

            navigate(
                "/wallet"
            );

        };


    // ==================================================
    // APPLICATION
    // ==================================================

    const handleViewApplication =
        () => {

            navigate(
                "/monetization"
            );

        };


    // ==================================================
    // RENDER
    // ==================================================

    return (

        <div className="monetization-success-page">

            {/* ==========================================
                BACKGROUND
            ========================================== */}

            <div className="success-bg-grid" />

            <div className="success-bg-orb success-bg-orb-one" />

            <div className="success-bg-orb success-bg-orb-two" />


            {/* ==========================================
                HEADER
            ========================================== */}

            <header className="success-header">

                <div className="success-brand">

                    <span>
                        CAVE TUNES
                    </span>

                    <small>
                        CREATOR MONETIZATION
                    </small>

                </div>

                <div className="success-status">

                    <span className="success-status-dot" />

                    Application Submitted

                </div>

            </header>


            {/* ==========================================
                MAIN
            ========================================== */}

            <main className="success-main">


                {/* ======================================
                    SUCCESS ICON
                ====================================== */}

                <div className="success-icon-wrapper">

                    <div className="success-icon-ring">

                        <div className="success-icon">

                            ✓

                        </div>

                    </div>

                </div>


                {/* ======================================
                    EYEBROW
                ====================================== */}

                <span className="success-eyebrow">

                    MONETIZATION REQUEST RECEIVED

                </span>


                {/* ======================================
                    TITLE
                ====================================== */}

                <h1>

                    Your request has been

                    <span>
                        {" "}successfully submitted.
                    </span>

                </h1>


                {/* ======================================
                    DESCRIPTION
                ====================================== */}

                <p className="success-description">

                    Thank you for completing your Cave Tunes
                    monetization application. Your creator
                    information and payout details have been
                    securely submitted for review.

                </p>


                {/* ======================================
                    REQUEST CARD
                ====================================== */}

                <section className="success-request-card">

                    <div className="success-card-header">

                        <div>

                            <span>
                                APPLICATION STATUS
                            </span>

                            <h2>
                                Under Review
                            </h2>

                        </div>

                        <div className="success-review-badge">

                            <span />

                            Pending Review

                        </div>

                    </div>


                    <div className="success-divider" />


                    <div className="success-details">

                        <div className="success-detail">

                            <span>
                                Request ID
                            </span>

                            <strong>
                                {requestId
                                    ? `#${requestId}`
                                    : "Processing"}
                            </strong>

                        </div>


                        <div className="success-detail">

                            <span>
                                Submitted
                            </span>

                            <strong>
                                {formatDate(
                                    submittedAt
                                )}
                            </strong>

                        </div>


                        <div className="success-detail">

                            <span>
                                Application
                            </span>

                            <strong>
                                Creator Monetization
                            </strong>

                        </div>


                        <div className="success-detail">

                            <span>
                                Payout Setup
                            </span>

                            <strong className="success-confirmed">

                                <span>
                                    ✓
                                </span>

                                Received

                            </strong>

                        </div>

                    </div>

                </section>


                {/* ======================================
                    WHAT HAPPENS NEXT
                ====================================== */}

                <section className="success-next-card">

                    <div className="success-next-heading">

                        <span className="success-next-number">
                            01
                        </span>

                        <div>

                            <span>
                                WHAT HAPPENS NEXT
                            </span>

                            <h2>
                                Your application is now in review
                            </h2>

                        </div>

                    </div>


                    <div className="success-timeline">

                        <div className="success-timeline-item active">

                            <div className="success-timeline-marker">
                                ✓
                            </div>

                            <div>

                                <strong>
                                    Application submitted
                                </strong>

                                <p>
                                    Your monetization request and
                                    payout information have been
                                    received successfully.
                                </p>

                            </div>

                        </div>


                        <div className="success-timeline-line" />


                        <div className="success-timeline-item">

                            <div className="success-timeline-marker">
                                2
                            </div>

                            <div>

                                <strong>
                                    Cave Tunes review
                                </strong>

                                <p>
                                    Our monetization team will review
                                    your creator information, content
                                    eligibility and account details.
                                </p>

                            </div>

                        </div>


                        <div className="success-timeline-line" />


                        <div className="success-timeline-item">

                            <div className="success-timeline-marker">
                                3
                            </div>

                            <div>

                                <strong>
                                    Approval decision
                                </strong>

                                <p>
                                    Once the review is complete, your
                                    monetization status will be updated
                                    on your Cave Tunes account.
                                </p>

                            </div>

                        </div>

                    </div>

                </section>


                {/* ======================================
                    IMPORTANT NOTICE
                ====================================== */}

                <div className="success-notice">

                    <div className="success-notice-icon">
                        i
                    </div>

                    <div>

                        <strong>
                            Please keep your account active
                        </strong>

                        <p>
                            Do not submit another monetization
                            application while this request is under
                            review. You can continue uploading,
                            managing and growing your Cave Tunes
                            creator profile.

                        </p>

                    </div>

                </div>


                {/* ======================================
                    ACTIONS
                ====================================== */}

                <div className="success-actions">

                    <button
                        type="button"
                        className="success-primary-button"
                        onClick={
                            handleDashboard
                        }
                    >

                        <span>
                            Return to Monetization
                        </span>

                        <span>
                            →
                        </span>

                    </button>


                    <button
                        type="button"
                        className="success-secondary-button"
                        onClick={
                            handleViewApplication
                        }
                    >

                        View Application

                    </button>


                    <button
                        type="button"
                        className="success-text-button"
                        onClick={
                            handleWallet
                        }
                    >

                        Go to Wallet
                        <span>
                            →
                        </span>

                    </button>

                </div>


                {/* ======================================
                    SECURITY
                ====================================== */}

                <p className="success-security">

                    🔒 Your monetization request is securely
                    associated with your Cave Tunes creator account.

                </p>

            </main>

        </div>

    );

}