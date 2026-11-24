// ======================================================
// CAVE TUNES
// MONETIZATION LANDING PAGE
// src/pages/Monetization.jsx
// ======================================================

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Monetization.css";

import { getMonetizationRequest } from "../services/api";

// ======================================================
// ICONS
// ======================================================

const Icon = ({ children, className = "" }) => (
    <span className={`monetization-icon ${className}`}>
        {children}
    </span>
);

// ======================================================
// MONETIZATION PAGE
// ======================================================

export default function Monetization() {

    const navigate = useNavigate();

    // ==================================================
    // MONETIZATION STATE
    // ==================================================

    const [isMonetized, setIsMonetized] = useState(false);
    const [checkingMonetization, setCheckingMonetization] =
        useState(true);

    // ==================================================
    // CHECK MONETIZATION STATUS
    //
    // Uses the SAME endpoint/logic as MonetizationStatus.jsx
    // ==================================================

 useEffect(() => {

    let mounted = true;

    const checkMonetizationStatus = async () => {

        try {

            const data =
                await getMonetizationRequest();

            if (!data?.success) {
                throw new Error(
                    data?.message ||
                    "Unable to get monetization status"
                );
            }

            const requestData =
                data?.request;

            if (!requestData) {

                if (mounted) {
                    setIsMonetized(false);
                }

                return;
            }

            // ==================================================
            // SAME STATUS NORMALIZATION AS MonetizationStatus.jsx
            // ==================================================

            const rawStatus =
                String(
                    requestData.status || ""
                )
                    .trim()
                    .toLowerCase();

            let normalizedStatus =
                "pending_review";

            if (
                [
                    "pending",
                    "pending_review",
                    "under_review",
                    "submitted"
                ].includes(rawStatus)
            ) {

                normalizedStatus =
                    "pending_review";

            } else if (
                [
                    "approved",
                    "approve"
                ].includes(rawStatus)
            ) {

                normalizedStatus =
                    "approved";

            } else if (
                [
                    "rejected",
                    "declined",
                    "denied"
                ].includes(rawStatus)
            ) {

                normalizedStatus =
                    "rejected";

            } else if (
                [
                    "action_required",
                    "needs_action",
                    "needs_information",
                    "more_information"
                ].includes(rawStatus)
            ) {

                normalizedStatus =
                    "action_required";
            }

            if (mounted) {

                setIsMonetized(
                    normalizedStatus === "approved"
                );

            }

        } catch (error) {

            console.error(
                "Unable to check monetization status:",
                error
            );

            if (mounted) {
                setIsMonetized(false);
            }

        } finally {

            if (mounted) {
                setCheckingMonetization(false);
            }

        }

    };

    checkMonetizationStatus();

    return () => {
        mounted = false;
    };

}, []);

    // ==================================================
    // START MONETIZATION
    // ==================================================

    const handleStartMonetization = () => {

        // --------------------------------------------------
        // APPROVED APPLICATIONS CANNOT START AGAIN
        // --------------------------------------------------

        if (isMonetized) {
            return;
        }

        navigate(
            "/monetization/application"
        );

    };

    // ==================================================
    // CHECK APPLICATION STATUS
    // ==================================================

    const handleCheckStatus = () => {

        navigate(
            "/monetization/status"
        );

    };

    // ==================================================
    // MONETIZATION BUTTON TEXT
    // ==================================================

    const monetizationButtonText =
        checkingMonetization
            ? "Checking..."
            : isMonetized
                ? "You Are Already Monetized"
                : "Start Monetization";

    // ==================================================
    // DISABLED BUTTON CLASS
    // ==================================================

    const monetizationButtonClass =
        isMonetized || checkingMonetization
            ? "monetization-button-disabled"
            : "";

    // ==================================================
    // RENDER
    // ==================================================

    return (

        <div className="monetization-page">

            {/* ==================================================
                BACKGROUND EFFECTS
            ================================================== */}

            <div
                className="monetization-bg-orb monetization-bg-orb-one"
            />

            <div
                className="monetization-bg-orb monetization-bg-orb-two"
            />


            {/* ==================================================
                HERO
            ================================================== */}

            <section className="monetization-hero">

                <div className="monetization-hero-content">

                    <div className="monetization-badge">

                        <span className="monetization-badge-dot" />

                        CAVE TUNES CREATOR MONETIZATION

                    </div>


                    <h1>

                        Turn Your Music

                        <span>
                            {" "}Into Earnings.
                        </span>

                    </h1>


                    <p className="monetization-hero-text">

                        Your music deserves more than just streams.
                        Learn how Cave Tunes monetization works,
                        prepare your creator account, and take the
                        first step toward earning from your music.

                    </p>


                    <div className="monetization-hero-actions">

                        <button
                            className={`monetization-primary-button ${monetizationButtonClass}`}
                            onClick={handleStartMonetization}
                            disabled={
                                checkingMonetization ||
                                isMonetized
                            }
                        >

                            <span>

                                {monetizationButtonText}

                            </span>

                            {!isMonetized &&
                                !checkingMonetization && (

                                    <span className="button-arrow">
                                        →
                                    </span>

                                )}

                        </button>


                        <button
                            className="monetization-secondary-button"
                            onClick={handleCheckStatus}
                        >

                            Check Application Status

                        </button>

                    </div>


                    <div className="monetization-trust">

                        <div className="trust-item">

                            <Icon>
                                ✓
                            </Icon>

                            Creator focused

                        </div>


                        <div className="trust-item">

                            <Icon>
                                ✓
                            </Icon>

                            Transparent process

                        </div>


                        <div className="trust-item">

                            <Icon>
                                ✓
                            </Icon>

                            Built for artists

                        </div>

                    </div>

                </div>


                {/* ==================================================
                    HERO CARD
                ================================================== */}

                <div className="monetization-hero-card">

                    <div className="hero-card-glow" />

                    <div className="hero-card-top">

                        <div>

                            <span className="hero-card-label">

                                CREATOR EARNINGS

                            </span>


                            <h3>

                                Build your music career.

                            </h3>

                        </div>


                        <div className="hero-card-icon">

                            $

                        </div>

                    </div>


                    <div className="earnings-visual">

                        <div className="earnings-line">

                            <span />
                            <span />
                            <span />
                            <span />
                            <span />
                            <span />
                            <span />
                            <span />

                        </div>

                    </div>


                    <div className="hero-card-stats">

                        <div>

                            <strong>
                                01
                            </strong>

                            <span>
                                Apply
                            </span>

                        </div>


                        <div>

                            <strong>
                                02
                            </strong>

                            <span>
                                Set up
                            </span>

                        </div>


                        <div>

                            <strong>
                                03
                            </strong>

                            <span>
                                Get reviewed
                            </span>

                        </div>

                    </div>

                </div>

            </section>


            {/* ==================================================
                WHY MONETIZE
            ================================================== */}

            <section className="monetization-section">

                <div className="section-heading">

                    <span className="section-eyebrow">

                        WHY MONETIZE?

                    </span>


                    <h2>

                        Make your music work for you.

                    </h2>


                    <p>

                        Monetization gives eligible Cave Tunes creators
                        the opportunity to turn their audience and music
                        activity into a sustainable creator business.

                    </p>

                </div>


                <div className="benefits-grid">

                    <article className="benefit-card">

                        <div className="benefit-icon">

                            <Icon>
                                ₿
                            </Icon>

                        </div>


                        <h3>

                            Earn from your music

                        </h3>


                        <p>

                            Eligible creators can participate in
                            Cave Tunes monetization opportunities
                            associated with their music activity.

                        </p>

                    </article>


                    <article className="benefit-card">

                        <div className="benefit-icon">

                            <Icon>
                                ◉
                            </Icon>

                        </div>


                        <h3>

                            Grow your audience

                        </h3>


                        <p>

                            Build a stronger creator profile,
                            release consistently, and turn listeners
                            into a long-term audience.

                        </p>

                    </article>

   <article className="benefit-card">

                        <div className="benefit-icon">

                            <Icon>
                               ✅
                            </Icon>

                        </div>


                        <h3>

                           Get the Master Verification Badge
                        </h3>


                        <p>

                           Light up your Verification Badge from White to Green to prove that 
                           your account is Monetized and you are able to collect Royalties.

                        </p>

                    </article>
                    <article className="benefit-card">

                        <div className="benefit-icon">

                            <Icon>
                                ↗
                            </Icon>

                        </div>


                        <h3>

                            Track your progress

                        </h3>


                        <p>

                            Keep your creator activity organized
                            and understand how your music is performing
                            across Cave Tunes.

                        </p>

                    </article>


                    <article className="benefit-card">

                        <div className="benefit-icon">

                            <Icon>
                                ★
                            </Icon>

                        </div>


                        <h3>

                            Build credibility

                        </h3>


                        <p>

                            A complete and professionally maintained
                            creator account helps establish trust with
                            your listeners and community.

                        </p>

                    </article>

                </div>

            </section>


            {/* ==================================================
                BEFORE YOU APPLY
            ================================================== */}

            <section className="monetization-section preparation-section">

                <div className="preparation-layout">

                    <div className="preparation-content">

                        <span className="section-eyebrow">

                            BEFORE YOU APPLY

                        </span>


                        <h2>

                            Prepare your account first.

                        </h2>


                        <p>

                            A strong application starts with a strong
                            creator profile. Before submitting your
                            monetization request, make sure your account
                            and music are ready.

                        </p>


                        <button
                            className={`text-action ${
                                monetizationButtonClass
                                    ? "text-action-disabled"
                                    : ""
                            }`}
                            onClick={handleStartMonetization}
                            disabled={
                                checkingMonetization ||
                                isMonetized
                            }
                        >

                            {checkingMonetization
                                ? "Checking..."
                                : isMonetized
                                    ? "You Are Already Monetized"
                                    : "Begin the preparation process"
                            }

                            {!isMonetized &&
                                !checkingMonetization && (

                                    <span>
                                        →
                                    </span>

                                )}

                        </button>

                    </div>


                    <div className="checklist-card">

                        <div className="checklist-header">

                            <div className="checklist-header-icon">

                                ✓

                            </div>


                            <div>

                                <h3>

                                    Creator readiness

                                </h3>


                                <span>

                                    Recommended before applying

                                </span>

                            </div>

                        </div>


                        <div className="checklist">

                            <div className="checklist-item">

                                <span className="check">
                                    ✓
                                </span>

                                <div>

                                    <strong>
                                        Complete your profile
                                    </strong>

                                    <p>
                                        Use accurate creator information
                                        and keep your profile up to date.
                                    </p>

                                </div>

                            </div>


                            <div className="checklist-item">

                                <span className="check">
                                    ✓
                                </span>

                                <div>

                                    <strong>
                                        Upload quality music
                                    </strong>

                                    <p>
                                        Make sure your releases contain
                                        accurate information and metadata.
                                    </p>

                                </div>

                            </div>


                            <div className="checklist-item">

                                <span className="check">
                                    ✓
                                </span>

                                <div>

                                    <strong>
                                        Own or control your content
                                    </strong>

                                    <p>
                                        Only submit content that you have
                                        the necessary rights to use.
                                    </p>

                                </div>

                            </div>


                            <div className="checklist-item">

                                <span className="check">
                                    ✓
                                </span>

                                <div>

                                    <strong>
                                        Follow Cave Tunes policies
                                    </strong>

                                    <p>
                                        Your account and content must
                                        comply with platform requirements.
                                    </p>

                                </div>

                            </div>


                            <div className="checklist-item">

                                <span className="check">
                                    ✓
                                </span>

                                <div>

                                    <strong>
                                        Prepare payout information
                                    </strong>

                                    <p>
                                        You will provide your payout
                                        information during the setup stage.
                                    </p>

                                </div>

                            </div>

                        </div>

                    </div>

                </div>

            </section>


            {/* ==================================================
                MONETIZATION TIPS
            ================================================== */}

            <section className="monetization-section tips-section">

                <div className="section-heading">

                    <span className="section-eyebrow">

                        CREATOR TIPS

                    </span>


                    <h2>

                        Monetization is more than pressing apply.

                    </h2>


                    <p>

                        The strongest creators treat their music like
                        a business. Use these habits to build a healthier
                        and more sustainable music career.

                    </p>

                </div>


                <div className="tips-grid">

                    <article className="tip-card">

                        <span className="tip-number">
                            01
                        </span>

                        <div className="tip-icon">
                            ♫
                        </div>

                        <h3>
                            Release consistently
                        </h3>

                        <p>
                            Keep giving your audience new reasons to
                            return. Consistency can be more valuable
                            than uploading everything at once.
                        </p>

                    </article>


                    <article className="tip-card">

                        <span className="tip-number">
                            02
                        </span>

                        <div className="tip-icon">
                            #
                        </div>

                        <h3>
                            Use accurate metadata
                        </h3>

                        <p>
                            Correct titles, artist names, genres and
                            release information make your catalog easier
                            to organize and discover.
                        </p>

                    </article>


                    <article className="tip-card">

                        <span className="tip-number">
                            03
                        </span>

                        <div className="tip-icon">
                            ↗
                        </div>

                        <h3>
                            Promote your releases
                        </h3>

                        <p>
                            Share your music with your existing audience
                            and create a consistent strategy for bringing
                            new listeners to your catalog.
                        </p>

                    </article>


                    <article className="tip-card">

                        <span className="tip-number">
                            04
                        </span>

                        <div className="tip-icon">
                            ♡
                        </div>

                        <h3>
                            Build real engagement
                        </h3>

                        <p>
                            Encourage listeners to follow, save and
                            return to your music instead of focusing
                            only on short-term numbers.
                        </p>

                    </article>

                </div>

            </section>


            {/* ==================================================
                HOW IT WORKS
            ================================================== */}

            <section className="monetization-section process-section">

                <div className="section-heading">

                    <span className="section-eyebrow">
                        THE PROCESS
                    </span>

                    <h2>
                        From creator to monetized.
                    </h2>

                    <p>
                        We keep the process simple and transparent.
                    </p>

                </div>


                <div className="process-container">

                    <div className="process-line" />


                    <div className="process-step">

                        <div className="process-number">
                            01
                        </div>

                        <h3>
                            Learn
                        </h3>

                        <p>
                            Understand the requirements and prepare
                            your Cave Tunes creator account.
                        </p>

                    </div>


                    <div className="process-step">

                        <div className="process-number">
                            02
                        </div>

                        <h3>
                            Apply
                        </h3>

                        <p>
                            Complete the monetization application with
                            accurate creator information.
                        </p>

                    </div>


                    <div className="process-step">

                        <div className="process-number">
                            03
                        </div>

                        <h3>
                            Set up
                        </h3>

                        <p>
                            Provide the required payout information
                            and confirm your monetization details.
                        </p>

                    </div>


                    <div className="process-step">

                        <div className="process-number">
                            04
                        </div>

                        <h3>
                            Review
                        </h3>

                        <p>
                            Cave Tunes reviews your application before
                            making a final monetization decision.
                        </p>

                    </div>


                    <div className="process-step">

                        <div className="process-number">
                            05
                        </div>

                        <h3>
                            Earn
                        </h3>

                        <p>
                            Once approved, eligible monetization
                            features become available to your account.
                        </p>

                    </div>

                </div>

            </section>


            {/* ==================================================
                FINAL CTA
            ================================================== */}

            <section className="monetization-final-cta">

                <div className="final-cta-content">

                    <span className="section-eyebrow">

                        READY WHEN YOU ARE

                    </span>


                    <h2>

                        Your music has value.

                        <span>
                            {" "}Let's build from it.
                        </span>

                    </h2>


                    <p>

                        Start your Cave Tunes monetization journey
                        and complete the application when you're ready.

                    </p>


                    <button
                        className={`monetization-primary-button final-button ${monetizationButtonClass}`}
                        onClick={handleStartMonetization}
                        disabled={
                            checkingMonetization ||
                            isMonetized
                        }
                    >

                        <span>

                            {monetizationButtonText}

                        </span>


                        {!isMonetized &&
                            !checkingMonetization && (

                                <span className="button-arrow">
                                    →
                                </span>

                            )}

                    </button>


                    <button
                        className="final-status-button"
                        onClick={handleCheckStatus}
                    >

                        Already applied? Check your status

                    </button>

                </div>

            </section>

        </div>

    );

}