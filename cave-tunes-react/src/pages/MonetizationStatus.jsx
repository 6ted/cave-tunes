import { API_BASE_URL as SHARED_API_BASE_URL } from "../services/api";
// ======================================================
// CAVE TUNES
// MONETIZATION STATUS
// src/pages/MonetizationStatus.jsx
// ======================================================

import {
    useEffect,
    useState,
} from "react";

import {
    useNavigate,
} from "react-router-dom";

import "./MonetizationStatus.css";


// ======================================================
// API
// ======================================================

const API_BASE_URL = SHARED_API_BASE_URL;


// ======================================================
// STATUS CONFIGURATION
// ======================================================

const STATUS_CONFIG = {

    pending_review: {

        eyebrow:
            "APPLICATION UNDER REVIEW",

        title:
            "Your application is",

        highlight:
            "under review.",

        description:
            "Your Cave Tunes monetization application has been submitted successfully. Our team is reviewing your information.",

        icon:
            "◷",

        badge:
            "Under Review",

        badgeClass:
            "pending",

    },


    approved: {

        eyebrow:
            "MONETIZATION APPROVED",

        title:
            "You're ready to",

        highlight:
            "start earning.",

        description:
            "Congratulations! Your Cave Tunes monetization application has been approved. You can now earn from eligible activity on Cave Tunes.",

        icon:
            "✓",

        badge:
            "Approved",

        badgeClass:
            "approved",

    },


    rejected: {

        eyebrow:
            "APPLICATION NOT APPROVED",

        title:
            "Your application was",

        highlight:
            "not approved.",

        description:
            "Your Cave Tunes monetization application could not be approved at this time. Review the information below for the next steps.",

        icon:
            "!",

        badge:
            "Not Approved",

        badgeClass:
            "rejected",

    },


    action_required: {

        eyebrow:
            "ACTION REQUIRED",

        title:
            "We need some",

        highlight:
            "additional information.",

        description:
            "Your monetization application requires an update before our team can complete the review.",

        icon:
            "!",

        badge:
            "Action Required",

        badgeClass:
            "action",

    },

};


// ======================================================
// HELPERS
// ======================================================

function formatDate(dateValue) {

    if (!dateValue) {
        return "Not available";
    }

    const date =
        new Date(dateValue);

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        return "Not available";
    }

    return date.toLocaleDateString(
        "en-MW",
        {
            day: "numeric",
            month: "long",
            year: "numeric",
        }
    );
}


function formatDateTime(dateValue) {

    if (!dateValue) {
        return "Not available";
    }

    const date =
        new Date(dateValue);

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        return "Not available";
    }

    return date.toLocaleString(
        "en-MW",
        {
            day: "numeric",
            month: "long",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        }
    );
}


function formatPayoutMethod(method) {

    switch (method) {

        case "airtel_money":
            return "Airtel Money";

        case "tnm_mpamba":
            return "TNM Mpamba";

        case "bank_transfer":
            return "Bank Transfer";

        default:
            return "Not provided";

    }
}


function maskPhone(phone) {

    if (!phone) {
        return "Not provided";
    }

    const normalized =
        String(phone)
            .replace(/\s+/g, "");

    if (
        normalized.length < 6
    ) {
        return normalized;
    }

    return `${normalized.slice(
        0,
        4
    )} •••• ${normalized.slice(-3)}`;
}


function maskAccountNumber(
    accountNumber
) {

    if (!accountNumber) {
        return "Not provided";
    }

    const normalized =
        String(accountNumber)
            .replace(/\s+/g, "");

    if (
        normalized.length <= 4
    ) {
        return normalized;
    }

    return `•••• ${normalized.slice(-4)}`;
}


// ======================================================
// JSONB PARSER
// ======================================================

function parseJsonData(value) {

    if (!value) {
        return {};
    }

    if (
        typeof value === "object"
    ) {
        return value;
    }

    if (
        typeof value === "string"
    ) {

        try {

            const parsed =
                JSON.parse(value);

            if (
                parsed &&
                typeof parsed === "object"
            ) {
                return parsed;
            }

        } catch (error) {

            console.error(
                "Unable to parse monetization JSON:",
                error
            );

        }

    }

    return {};
}


// ======================================================
// NORMALIZE BACKEND STATUS
// ======================================================

// ======================================================
// NORMALIZE BACKEND STATUS
// ======================================================

function normalizeStatus(backendStatus) {
    const value = String(
        backendStatus || ""
    ).toLowerCase().trim();

    if (
        value === "pending" ||
        value === "pending_review" ||
        value === "under_review" ||
        value === "submitted"
    ) {
        return "pending_review";
    }

    if (
        value === "approved" ||
        value === "approve"
    ) {
        return "approved";
    }

    if (
        value === "rejected" ||
        value === "declined" ||
        value === "denied"
    ) {
        return "rejected";
    }

    if (
        value === "action_required" ||
        value === "needs_action" ||
        value === "needs_information" ||
        value === "more_information"
    ) {
        return "action_required";
    }

    // Safest default for an existing application
    return "pending_review";
}


// ======================================================
// COMPONENT
// ======================================================

export default function MonetizationStatus() {

    const navigate =
        useNavigate();


    // ==================================================
    // STATE
    // ==================================================

    const [
        application,
        setApplication
    ] = useState(null);


    const [
        setup,
        setSetup
    ] = useState(null);


    const [
        request,
        setRequest
    ] = useState(null);


    const [
        status,
        setStatus
    ] = useState(
        "pending_review"
    );


    const [
        loading,
        setLoading
    ] = useState(true);


    const [
        error,
        setError
    ] = useState("");


    // ==================================================
    // LOAD REAL DATABASE DATA
    // ==================================================

    useEffect(() => {

        let cancelled = false;


        const loadStatus =
            async () => {

                try {

                    setLoading(true);

                    setError("");


                    // ======================================
                    // AUTH TOKEN
                    // ======================================

                    const token =
                        localStorage.getItem(
                            "token"
                        ) ||
                        localStorage.getItem(
                            "caveTunesToken"
                        ) ||
                        localStorage.getItem(
                            "authToken"
                        );


                    const headers = {

                        Accept:
                            "application/json",

                    };


                    if (token) {

                        headers.Authorization =
                            `Bearer ${token}`;

                    }


                    // ======================================
                    // REQUEST
                    // ======================================

                    const response =
                        await fetch(
                            `${API_BASE_URL}/api/creator/monetization-request`,
                            {
                                method:
                                    "GET",

                                headers,

                                credentials:
                                    "include",
                            }
                        );


                    let data = null;


                    try {

                        data =
                            await response.json();

                    } catch {

                        data = null;

                    }


                    // ======================================
                    // SERVER ERROR
                    // ======================================

                    if (
                        !response.ok
                    ) {

                        throw new Error(
                            data?.message ||
                            `Unable to load monetization status. Server returned ${response.status}.`
                        );

                    }


                    if (
                        !data?.success
                    ) {

                        throw new Error(
                            data?.message ||
                            "Unable to load your monetization status."
                        );

                    }


                    if (
                        cancelled
                    ) {
                        return;
                    }


                    // ======================================
                    // NO REQUEST
                    // ======================================

                    if (
                        !data.request
                    ) {

                        setRequest(null);

                        setApplication(null);

                        setSetup(null);

                        setStatus(
                            "pending_review"
                        );

                        setError(
                            "No monetization application was found for your account."
                        );

                        return;

                    }


                    // ======================================
                    // REAL DATABASE REQUEST
                    // ======================================

                    const monetizationRequest =
                        data.request;


                    setRequest(
                        monetizationRequest
                    );


                    // ======================================
                    // APPLICATION DATA
                    // ======================================

                    const applicationData =
                        parseJsonData(
                            monetizationRequest.application_data
                        );


                    // ======================================
                    // PAYOUT DATA
                    // ======================================

                    const payoutData =
                        parseJsonData(
                            monetizationRequest.payout_details
                        );


                    // ======================================
                    // SET DATA
                    // ======================================

                    setApplication(
                        applicationData
                    );


                    setSetup(
                        payoutData
                    );


                    // ======================================
                    // DATABASE STATUS
                    // ======================================

                    setStatus(
                        normalizeStatus(
                            monetizationRequest.status
                        )
                    );

                } catch (loadError) {

                    if (
                        cancelled
                    ) {
                        return;
                    }


                    console.error(
                        "LOAD MONETIZATION STATUS ERROR:",
                        loadError
                    );


                    setError(
                        loadError?.message ||
                        "Unable to load your monetization status."
                    );

                } finally {

                    if (
                        !cancelled
                    ) {

                        setLoading(
                            false
                        );

                    }

                }

            };


        loadStatus();


        return () => {

            cancelled =
                true;

        };

    }, []);


    // ==================================================
    // CONFIG
    // ==================================================

    const statusConfig =
        STATUS_CONFIG[status] ||
        STATUS_CONFIG.pending_review;


    // ==================================================
    // DERIVED DATA
    // ==================================================

    const creatorType =
        application?.creatorType
            ? String(
                application.creatorType
            )
                .replace(
                    /_/g,
                    " "
                )
                .replace(
                    /\b\w/g,
                    (letter) =>
                        letter.toUpperCase()
                )
            : "Creator";


    const accountHolderName =
        setup?.accountHolderName ||
        "Not provided";


    const payoutMethod =
        formatPayoutMethod(
            setup?.payoutMethod
        );


    const payoutValue =
        setup?.payoutMethod ===
        "bank_transfer"

            ? maskAccountNumber(
                setup?.accountNumber
            )

            : maskPhone(
                setup?.phoneNumber
            );


    // ==================================================
    // DATABASE DATES
    //
    // IMPORTANT:
    // monetization_requests does NOT have updated_at.
    // ==================================================

    const applicationDate =
        request?.submitted_at ||
        request?.created_at;


    const reviewedDate =
        request?.reviewed_at ||
        request?.submitted_at ||
        request?.created_at;


    // ==================================================
    // BACK
    // ==================================================

    const handleBack = () => {

        navigate(
            "/monetization"
        );

    };


    // ==================================================
    // APPLICATION
    // ==================================================

    const handleViewApplication = () => {

        navigate(
            "/monetization/application"
        );

    };


    // ==================================================
    // SETUP
    // ==================================================

    const handleUpdateApplication = () => {

        navigate(
            "/monetization/setup"
        );

    };


    // ==================================================
    // APPROVED
    // ==================================================

    const handleContinueToMonetization =
        () => {

            navigate(
                "/monetization"
            );

        };


    // ==================================================
    // LOADING
    // ==================================================

    if (loading) {

        return (

            <div className="monetization-status-page">

                <div className="status-bg-grid" />

                <div className="status-bg-orb status-bg-orb-one" />

                <div className="status-bg-orb status-bg-orb-two" />

                <main className="status-main">

                    <div className="status-loading">

                        <div className="status-loading-spinner" />

                        <h2>
                            Loading application status
                        </h2>

                        <p>
                            Checking your Cave Tunes
                            monetization application...
                        </p>

                    </div>

                </main>

            </div>

        );

    }


    // ==================================================
    // ERROR
    // ==================================================

    if (error) {

        return (

            <div className="monetization-status-page">

                <div className="status-bg-grid" />

                <div className="status-bg-orb status-bg-orb-one" />

                <div className="status-bg-orb status-bg-orb-two" />

                <main className="status-main">

                    <div className="status-error-state">

                        <div className="status-error-icon">
                            !
                        </div>

                        <h2>
                            Something went wrong
                        </h2>

                        <p>
                            {error}
                        </p>

                        <button
                            type="button"
                            onClick={
                                handleBack
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

        <div className="monetization-status-page">

            {/* ==========================================
                BACKGROUND
            ========================================== */}

            <div className="status-bg-grid" />

            <div className="status-bg-orb status-bg-orb-one" />

            <div className="status-bg-orb status-bg-orb-two" />


            {/* ==========================================
                HEADER
            ========================================== */}

            <header className="status-header">

                <button
                    type="button"
                    className="status-back-button"
                    onClick={handleBack}
                >

                    <span>
                        ←
                    </span>

                    Back to Monetization

                </button>


                <div className="status-brand">

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

            <main className="status-main">


                {/* ======================================
                    STATUS HERO
                ====================================== */}

                <section
                    className={`status-hero ${statusConfig.badgeClass}`}
                >

                    <div className="status-hero-icon">
                        {statusConfig.icon}
                    </div>

                    <span className="status-eyebrow">
                        {statusConfig.eyebrow}
                    </span>

                    <h1>

                        {statusConfig.title}

                        <span>
                            {" "}
                            {statusConfig.highlight}
                        </span>

                    </h1>

                    <p>
                        {statusConfig.description}
                    </p>

                    <div
                        className={`status-badge ${statusConfig.badgeClass}`}
                    >

                        <span>
                            {statusConfig.icon}
                        </span>

                        {statusConfig.badge}

                    </div>

                </section>


                {/* ======================================
                    APPLICATION IDENTITY
                ====================================== */}

                <section className="status-application-card">

                    <div className="status-application-avatar">

                        {application?.creatorType
                            ? String(
                                application.creatorType
                            )
                                .charAt(0)
                                .toUpperCase()
                            : "C"}

                    </div>


                    <div className="status-application-info">

                        <span>
                            MONETIZATION APPLICATION
                        </span>

                        <strong>
                            {creatorType}
                        </strong>

                        <small>
                            Your application and payout
                            information are securely
                            associated with your creator
                            account.
                        </small>

                    </div>


                    <div className="status-application-state">

                        <span
                            className={`status-state-dot ${statusConfig.badgeClass}`}
                        />

                        {statusConfig.badge}

                    </div>

                </section>


                {/* ======================================
                    PROGRESS
                ====================================== */}

                <section className="status-card">

                    <div className="status-card-heading">

                        <div className="status-heading-number">
                            01
                        </div>

                        <div>

                            <span className="status-section-label">
                                APPLICATION PROGRESS
                            </span>

                            <h2>
                                Your monetization journey
                            </h2>

                            <p>
                                Track the current stage of
                                your Cave Tunes application.
                            </p>

                        </div>

                    </div>


                    <div className="status-timeline">

                        <div className="status-timeline-item completed">

                            <div className="status-timeline-marker">
                                ✓
                            </div>

                            <div className="status-timeline-content">

                                <strong>
                                    Eligibility completed
                                </strong>

                                <span>
                                    Creator requirements
                                    submitted successfully.
                                </span>

                            </div>

                        </div>


                        <div className="status-timeline-line" />


                        <div
                            className={`status-timeline-item ${
                                status !== "rejected"
                                    ? "completed"
                                    : ""
                            }`}
                        >

                            <div className="status-timeline-marker">

                                {status ===
                                "rejected"
                                    ? "!"
                                    : "✓"}

                            </div>

                            <div className="status-timeline-content">

                                <strong>
                                    Payout setup completed
                                </strong>

                                <span>
                                    Your selected payout
                                    information has been
                                    provided.
                                </span>

                            </div>

                        </div>


                        <div className="status-timeline-line" />


                        <div
                            className={`status-timeline-item ${
                                status ===
                                    "pending_review" ||
                                status === "approved"
                                    ? "current"
                                    : status ===
                                      "rejected"
                                    ? "rejected"
                                    : "current"
                            }`}
                        >

                            <div className="status-timeline-marker">

                                {status ===
                                "approved"
                                    ? "✓"
                                    : status ===
                                      "rejected"
                                    ? "!"
                                    : "03"}

                            </div>

                            <div className="status-timeline-content">

                                <strong>
                                    Application review
                                </strong>

                                <span>

                                    {status ===
                                    "pending_review"
                                        ? "Our team is currently reviewing your application."
                                        : status ===
                                          "approved"
                                        ? "Your application has been approved."
                                        : status ===
                                          "rejected"
                                        ? "Your application was not approved."
                                        : "Additional information is required."}

                                </span>

                            </div>

                        </div>

                    </div>

                </section>


                {/* ======================================
                    APPLICATION DETAILS
                ====================================== */}

                <section className="status-card">

                    <div className="status-card-heading">

                        <div className="status-heading-number">
                            02
                        </div>

                        <div>

                            <span className="status-section-label">
                                APPLICATION DETAILS
                            </span>

                            <h2>
                                Your submitted information
                            </h2>

                            <p>
                                A summary of the information
                                associated with your application.
                            </p>

                        </div>

                    </div>


                    <div className="status-details-grid">

                        <div className="status-detail">

                            <span>
                                Creator type
                            </span>

                            <strong>
                                {creatorType}
                            </strong>

                        </div>


                        <div className="status-detail">

                            <span>
                                Account holder
                            </span>

                            <strong>
                                {accountHolderName}
                            </strong>

                        </div>


                        <div className="status-detail">

                            <span>
                                Payout method
                            </span>

                            <strong>
                                {payoutMethod}
                            </strong>

                        </div>


                        <div className="status-detail">

                            <span>
                                Payout account
                            </span>

                            <strong>
                                {payoutValue}
                            </strong>

                        </div>


                        <div className="status-detail">

                            <span>
                                Application submitted
                            </span>

                            <strong>
                                {formatDate(
                                    applicationDate
                                )}
                            </strong>

                        </div>


                        <div className="status-detail">

                            <span>
                                Last updated
                            </span>

                            <strong>
                                {formatDateTime(
                                    reviewedDate
                                )}
                            </strong>

                        </div>

                    </div>

                </section>


                {/* ======================================
                    PENDING MESSAGE
                ====================================== */}

                {status ===
                    "pending_review" && (

                    <section className="status-message-card pending">

                        <div className="status-message-icon">
                            ◷
                        </div>

                        <div>

                            <strong>
                                What happens next?
                            </strong>

                            <p>
                                Our monetization team will
                                review your application and
                                verify the submitted
                                information. You don't need
                                to submit another application
                                while your current application
                                is under review.
                            </p>

                        </div>

                    </section>

                )}


                {/* ======================================
                    APPROVED MESSAGE
                ====================================== */}

                {status === "approved" && (

                    <section className="status-message-card approved">

                        <div className="status-message-icon">
                            ✓
                        </div>

                        <div>

                            <strong>
                                Your monetization access is
                                ready
                            </strong>

                            <p>
                                Your application has been
                                approved. You can now access
                                your eligible monetization
                                features and begin tracking
                                your earnings.
                            </p>

                        </div>

                    </section>

                )}


                {/* ======================================
                    ACTION REQUIRED
                ====================================== */}

                {status ===
                    "action_required" && (

                    <section className="status-message-card action">

                        <div className="status-message-icon">
                            !
                        </div>

                        <div>

                            <strong>
                                Action is required
                            </strong>

                            <p>
                                Please update the requested
                                information and resubmit your
                                application for review.
                            </p>

                        </div>

                    </section>

                )}


                {/* ======================================
                    REJECTED MESSAGE
                ====================================== */}

                {status === "rejected" && (

                    <section className="status-message-card rejected">

                        <div className="status-message-icon">
                            !
                        </div>

                        <div>

                            <strong>
                                Review decision
                            </strong>

                            <p>
                                Your application was not
                                approved. You may review your
                                application information and
                                follow any instructions provided
                                by the Cave Tunes team.
                            </p>

                        </div>

                    </section>

                )}


                {/* ======================================
                    ACTIONS
                ====================================== */}

                <div className="status-actions">

                    {status ===
                        "action_required" && (

                        <button
                            type="button"
                            className="status-primary-button"
                            onClick={
                                handleUpdateApplication
                            }
                        >

                            <span>
                                Update Application
                            </span>

                            <span>
                                →
                            </span>

                        </button>

                    )}


                    {status === "approved" && (

                        <button
                            type="button"
                            className="status-primary-button"
                            onClick={
                                handleContinueToMonetization
                            }
                        >

                            <span>
                                Continue to Monetization
                            </span>

                            <span>
                                →
                            </span>

                        </button>

                    )}


                    {(status ===
                        "pending_review" ||
                        status === "rejected") && (

                        <button
                            type="button"
                            className="status-secondary-button"
                            onClick={
                                handleViewApplication
                            }
                        >
                            View Application
                        </button>

                    )}


                    <button
                        type="button"
                        className="status-secondary-button"
                        onClick={handleBack}
                    >
                        Back to Monetization
                    </button>

                </div>


                {/* ======================================
                    FOOTER
                ====================================== */}

                <div className="status-footer-message">

                    <div className="status-footer-lock">
                        🔒
                    </div>

                    <div>

                        <strong>
                            Your information is protected
                        </strong>

                        <p>
                            Cave Tunes uses your submitted
                            information only for monetization
                            eligibility, application review,
                            and payment processing.
                        </p>

                    </div>

                </div>

            </main>

        </div>

    );

}