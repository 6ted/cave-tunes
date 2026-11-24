// ======================================================
// CAVE TUNES
// MONETIZATION SETUP
// src/pages/MonetizationSetup.jsx
// ======================================================

import {
    useEffect,
    useState,
} from "react";

import {
    useNavigate,
} from "react-router-dom";

import "./MonetizationSetup.css";

// ======================================================
// CONSTANTS
// ======================================================

const APPLICATION_STORAGE_KEY =
    "caveTunesMonetizationApplication";

const SETUP_STORAGE_KEY =
    "caveTunesMonetizationSetup";

// ======================================================
// PAYOUT METHODS
// ======================================================

const PAYOUT_METHODS = [
    {
        id: "airtel_money",
        name: "Airtel Money",
        shortName: "Airtel",
        icon: "📱",
        description:
            "Receive your Cave Tunes earnings directly through Airtel Money.",
    },
    {
        id: "tnm_mpamba",
        name: "TNM Mpamba",
        shortName: "Mpamba",
        icon: "📱",
        description:
            "Receive your Cave Tunes earnings directly through TNM Mpamba.",
    },
    {
        id: "bank_transfer",
        name: "Bank Transfer",
        shortName: "Bank",
        icon: "🏦",
        description:
            "Receive your Cave Tunes earnings directly into your bank account.",
    },
];

// ======================================================
// INITIAL FORM
// ======================================================

const INITIAL_FORM = {
    payoutMethod: "",

    accountHolderName: "",

    phoneNumber: "",
    confirmPhoneNumber: "",

    bankName: "",
    accountNumber: "",
    confirmAccountNumber: "",
    accountType: "",
    branchName: "",
    bankCode: "",
};

// ======================================================
// VALIDATE PHONE
// ======================================================

function isValidMalawiPhone(phone) {
    const normalized = phone
        .replace(/\s+/g, "")
        .replace(/^\+265/, "")
        .replace(/^265/, "");

    return /^0?(88|99|98|89|21)\d{7}$/.test(
        normalized
    );
}

// ======================================================
// VALIDATE BANK ACCOUNT
// ======================================================

function isValidBankAccount(accountNumber) {
    const normalized = accountNumber
        .replace(/\s+/g, "");

    return /^\d{6,30}$/.test(normalized);
}

// ======================================================
// MAIN COMPONENT
// ======================================================

export default function MonetizationSetup() {
    const navigate = useNavigate();

    // ==================================================
    // STATE
    // ==================================================

    const [formData, setFormData] =
        useState(INITIAL_FORM);

    const [application, setApplication] =
        useState(null);

    const [error, setError] =
        useState("");

    const [loading, setLoading] =
        useState(true);

    const [saving, setSaving] =
        useState(false);

    // ==================================================
    // LOAD APPLICATION
    // ==================================================

    useEffect(() => {
        (async () => {
            try {
                const storedApplication =
                    sessionStorage.getItem(
                        APPLICATION_STORAGE_KEY
                    );

                if (!storedApplication) {
                    setError(
                        "Your monetization application could not be found. Please start the application again."
                    );

                    setLoading(false);

                    return;
                }

                const parsedApplication =
                    JSON.parse(storedApplication);

                setApplication(
                    parsedApplication
                );

                // ------------------------------------------
                // Restore existing setup if available
                // ------------------------------------------

                const storedSetup =
                    sessionStorage.getItem(
                        SETUP_STORAGE_KEY
                    );

                if (storedSetup) {
                    try {
                        const parsedSetup =
                            JSON.parse(storedSetup);

                        setFormData({
                            ...INITIAL_FORM,
                            ...parsedSetup,
                        });
                    } catch {
                        setFormData(
                            INITIAL_FORM
                        );
                    }
                }
            } catch (storageError) {
                console.error(
                    "Unable to load monetization setup:",
                    storageError
                );

                setError(
                    "Unable to load your monetization setup."
                );
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    // ==================================================
    // CHANGE HANDLER
    // ==================================================

    const handleChange = (event) => {
        const {
            name,
            value,
        } = event.target;

        setFormData((previous) => ({
            ...previous,
            [name]: value,
        }));

        if (error) {
            setError("");
        }
    };

    // ==================================================
    // PAYOUT METHOD
    // ==================================================

    const handlePayoutMethodChange = (
        method
    ) => {
        setFormData((previous) => ({
            ...previous,

            payoutMethod: method,

            // Clear mobile fields when bank selected
            ...(method === "bank_transfer"
                ? {
                      phoneNumber: "",
                      confirmPhoneNumber: "",
                  }
                : {}),

            // Clear bank fields when mobile selected
            ...(method !== "bank_transfer"
                ? {
                      bankName: "",
                      accountNumber: "",
                      confirmAccountNumber: "",
                      accountType: "",
                      branchName: "",
                      bankCode: "",
                  }
                : {}),
        }));

        setError("");
    };

    // ==================================================
    // VALIDATION
    // ==================================================

    const validateForm = () => {
        if (!formData.payoutMethod) {
            return "Please select your preferred payout method.";
        }

        if (
            !formData.accountHolderName.trim()
        ) {
            return "Please enter the account holder name.";
        }

        if (
            formData.accountHolderName.trim()
                .length < 2
        ) {
            return "Please enter a valid account holder name.";
        }

        // ==============================================
        // MOBILE MONEY
        // ==============================================

        if (
            formData.payoutMethod ===
                "airtel_money" ||
            formData.payoutMethod ===
                "tnm_mpamba"
        ) {
            if (!formData.phoneNumber.trim()) {
                return "Please enter your mobile money phone number.";
            }

            if (
                !isValidMalawiPhone(
                    formData.phoneNumber
                )
            ) {
                return "Please enter a valid Malawi mobile phone number.";
            }

            if (
                !formData.confirmPhoneNumber.trim()
            ) {
                return "Please confirm your mobile money phone number.";
            }

            if (
                formData.phoneNumber.replace(
                    /\s+/g,
                    ""
                ) !==
                formData.confirmPhoneNumber.replace(
                    /\s+/g,
                    ""
                )
            ) {
                return "The mobile phone numbers do not match.";
            }
        }

        // ==============================================
        // BANK
        // ==============================================

        if (
            formData.payoutMethod ===
            "bank_transfer"
        ) {
            if (!formData.bankName.trim()) {
                return "Please enter your bank name.";
            }

            if (!formData.accountNumber.trim()) {
                return "Please enter your bank account number.";
            }

            if (
                !isValidBankAccount(
                    formData.accountNumber
                )
            ) {
                return "Please enter a valid bank account number.";
            }

            if (
                !formData.confirmAccountNumber.trim()
            ) {
                return "Please confirm your bank account number.";
            }

            if (
                formData.accountNumber.replace(
                    /\s+/g,
                    ""
                ) !==
                formData.confirmAccountNumber.replace(
                    /\s+/g,
                    ""
                )
            ) {
                return "The bank account numbers do not match.";
            }

            if (!formData.accountType) {
                return "Please select your bank account type.";
            }

            if (!formData.branchName.trim()) {
                return "Please enter your bank branch name.";
            }
        }

        return "";
    };

    // ==================================================
    // CONTINUE
    // ==================================================

    const handleContinue = async (
        event
    ) => {
        event.preventDefault();

        setError("");

        const validationError =
            validateForm();

        if (validationError) {
            setError(
                validationError
            );

            return;
        }

        setSaving(true);

        try {
            // ------------------------------------------
            // Build clean payout object
            // ------------------------------------------

            const payoutDetails = {
                payoutMethod:
                    formData.payoutMethod,

                accountHolderName:
                    formData.accountHolderName.trim(),
            };

            if (
                formData.payoutMethod ===
                    "airtel_money" ||
                formData.payoutMethod ===
                    "tnm_mpamba"
            ) {
                payoutDetails.phoneNumber =
                    formData.phoneNumber
                        .replace(/\s+/g, "")
                        .trim();
            }

            if (
                formData.payoutMethod ===
                "bank_transfer"
            ) {
                payoutDetails.bankName =
                    formData.bankName.trim();

                payoutDetails.accountNumber =
                    formData.accountNumber
                        .replace(/\s+/g, "")
                        .trim();

                payoutDetails.accountType =
                    formData.accountType;

                payoutDetails.branchName =
                    formData.branchName.trim();

                payoutDetails.bankCode =
                    formData.bankCode.trim();
            }

            // ------------------------------------------
            // Save setup for Step 03
            // ------------------------------------------

            sessionStorage.setItem(
                SETUP_STORAGE_KEY,
                JSON.stringify(
                    payoutDetails
                )
            );

            // ------------------------------------------
            // Navigate to review
            // ------------------------------------------

            navigate(
                "/monetization/review"
            );
        } catch (saveError) {
            console.error(
                "Unable to save monetization setup:",
                saveError
            );

            setError(
                "Unable to save your payout information. Please try again."
            );
        } finally {
            setSaving(false);
        }
    };

    // ==================================================
    // BACK
    // ==================================================

    const handleBack = () => {
        navigate(
            "/monetization/application"
        );
    };

    // ==================================================
    // LOADING
    // ==================================================

    if (loading) {
        return (
            <div className="monetization-setup-page">
                <div className="setup-bg-orb setup-bg-orb-one" />
                <div className="setup-bg-orb setup-bg-orb-two" />

                <main className="setup-main">
                    <div className="setup-loading">
                        <div className="setup-loading-spinner" />

                        <h2>
                            Loading payout setup
                        </h2>

                        <p>
                            Preparing your monetization
                            account...
                        </p>
                    </div>
                </main>
            </div>
        );
    }

    // ==================================================
    // APPLICATION MISSING
    // ==================================================

    if (!application) {
        return (
            <div className="monetization-setup-page">
                <div className="setup-bg-orb setup-bg-orb-one" />
                <div className="setup-bg-orb setup-bg-orb-two" />

                <main className="setup-main">
                    <div className="setup-error-state">
                        <div className="setup-error-icon">
                            !
                        </div>

                        <h2>
                            Application not found
                        </h2>

                        <p>
                            {error ||
                                "Your monetization application could not be loaded."}
                        </p>

                        <button
                            type="button"
                            onClick={() =>
                                navigate(
                                    "/monetization"
                                )
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
    // SELECTED METHOD
    // ==================================================

    const isMobileMoney =
        formData.payoutMethod ===
            "airtel_money" ||
        formData.payoutMethod ===
            "tnm_mpamba";

    const isBank =
        formData.payoutMethod ===
        "bank_transfer";

    // ==================================================
    // RENDER
    // ==================================================

    return (
        <div className="monetization-setup-page">

            {/* ==========================================
                BACKGROUND
            ========================================== */}

            <div className="setup-bg-grid" />

            <div className="setup-bg-orb setup-bg-orb-one" />

            <div className="setup-bg-orb setup-bg-orb-two" />

            {/* ==========================================
                HEADER
            ========================================== */}

            <header className="setup-header">

                <button
                    type="button"
                    className="setup-back-button"
                    onClick={handleBack}
                >
                    <span>←</span>

                    Back to Application
                </button>

                <div className="setup-brand">
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

            <main className="setup-main">

                {/* ======================================
                    PROGRESS
                ====================================== */}

                <div className="setup-progress">

                    <div className="setup-progress-step completed">
                        <span>✓</span>

                        <div>
                            <strong>
                                Eligibility
                            </strong>

                            <small>
                                Creator requirements
                            </small>
                        </div>
                    </div>

                    <div className="setup-progress-line active" />

                    <div className="setup-progress-step active">
                        <span>02</span>

                        <div>
                            <strong>
                                Setup
                            </strong>

                            <small>
                                Payout information
                            </small>
                        </div>
                    </div>

                    <div className="setup-progress-line" />

                    <div className="setup-progress-step">
                        <span>03</span>

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

                <section className="setup-title">

                    <span className="setup-eyebrow">
                        STEP 02 OF 03
                    </span>

                    <h1>
                        Set up your
                        <span>
                            {" "}payout account.
                        </span>
                    </h1>

                    <p>
                        Choose how you want to receive
                        your Cave Tunes earnings and
                        provide the required payout
                        information.
                    </p>

                </section>

                {/* ======================================
                    APPLICATION SUMMARY
                ====================================== */}

                <section className="setup-account-summary">

                    <div className="setup-summary-avatar">
                        {application.creatorType
                            ? application.creatorType
                                  .charAt(0)
                                  .toUpperCase()
                            : "C"}
                    </div>

                    <div className="setup-summary-info">

                        <span>
                            MONETIZATION APPLICATION
                        </span>

                        <strong>
                            {application.creatorType
                                ? application.creatorType
                                      .replace(
                                          /_/g,
                                          " "
                                      )
                                      .replace(
                                          /\b\w/g,
                                          (letter) =>
                                              letter.toUpperCase()
                                      )
                                : "Creator"}
                        </strong>

                        <small>
                            Your payout details will
                            be associated with this
                            application.
                        </small>

                    </div>

                    <div className="setup-summary-status">
                        <span>✓</span>
                        Application ready
                    </div>

                </section>

                {/* ======================================
                    PAYOUT FORM
                ====================================== */}

                <form
                    className="setup-form"
                    onSubmit={
                        handleContinue
                    }
                >

                    {/* ==================================
                        PAYOUT METHOD
                    ================================== */}

                    <section className="setup-card">

                        <div className="setup-card-heading">

                            <div className="setup-heading-number">
                                01
                            </div>

                            <div>
                                <span className="setup-section-label">
                                    PAYOUT METHOD
                                </span>

                                <h2>
                                    How do you want to
                                    get paid?
                                </h2>

                                <p>
                                    Select one payout
                                    method for your
                                    Cave Tunes earnings.
                                </p>
                            </div>

                        </div>

                        <div className="payout-method-grid">

                            {PAYOUT_METHODS.map(
                                (method) => {
                                    const selected =
                                        formData.payoutMethod ===
                                        method.id;

                                    return (
                                        <button
                                            key={
                                                method.id
                                            }
                                            type="button"
                                            className={`payout-method ${
                                                selected
                                                    ? "selected"
                                                    : ""
                                            }`}
                                            onClick={() =>
                                                handlePayoutMethodChange(
                                                    method.id
                                                )
                                            }
                                        >

                                            <div className="payout-method-top">

                                                <div className="payout-method-icon">
                                                    {
                                                        method.icon
                                                    }
                                                </div>

                                                <span
                                                    className={`payout-method-radio ${
                                                        selected
                                                            ? "checked"
                                                            : ""
                                                    }`}
                                                >
                                                    {selected &&
                                                        "✓"}
                                                </span>

                                            </div>

                                            <strong>
                                                {
                                                    method.name
                                                }
                                            </strong>

                                            <small>
                                                {
                                                    method.description
                                                }
                                            </small>

                                        </button>
                                    );
                                }
                            )}

                        </div>

                    </section>

                    {/* ==================================
                        ACCOUNT DETAILS
                    ================================== */}

                    <section
                        className={`setup-card payout-details-card ${
                            !formData.payoutMethod
                                ? "disabled-section"
                                : ""
                        }`}
                    >

                        <div className="setup-card-heading">

                            <div className="setup-heading-number">
                                02
                            </div>

                            <div>
                                <span className="setup-section-label">
                                    PAYOUT ACCOUNT
                                </span>

                                <h2>
                                    Account details
                                </h2>

                                <p>
                                    Enter the details
                                    exactly as registered
                                    with your payout
                                    provider.
                                </p>
                            </div>

                        </div>

                        {/* =================================
                            HOLDER NAME
                        ================================= */}

                        <div className="setup-fields">

                            <div className="setup-field full-width">

                                <label htmlFor="accountHolderName">
                                    Account holder name
                                    <span>*</span>
                                </label>

                                <input
                                    id="accountHolderName"
                                    name="accountHolderName"
                                    type="text"
                                    value={
                                        formData.accountHolderName
                                    }
                                    onChange={
                                        handleChange
                                    }
                                    placeholder="Enter the full account holder name"
                                    autoComplete="name"
                                    disabled={
                                        !formData.payoutMethod
                                    }
                                />

                                <small>
                                    This should match
                                    the name registered
                                    with your payout
                                    provider.
                                </small>

                            </div>

                        </div>

                        {/* =================================
                            MOBILE MONEY
                        ================================= */}

                        {isMobileMoney && (
                            <div className="setup-provider-section">

                                <div className="provider-heading">

                                    <div className="provider-icon">
                                        📱
                                    </div>

                                    <div>
                                        <strong>
                                            {formData.payoutMethod ===
                                            "airtel_money"
                                                ? "Airtel Money account"
                                                : "TNM Mpamba account"}
                                        </strong>

                                        <span>
                                            Enter your mobile
                                            money number.
                                        </span>
                                    </div>

                                </div>

                                <div className="setup-fields">

                                    <div className="setup-field">

                                        <label htmlFor="phoneNumber">
                                            Mobile phone number
                                            <span>*</span>
                                        </label>

                                        <input
                                            id="phoneNumber"
                                            name="phoneNumber"
                                            type="tel"
                                            value={
                                                formData.phoneNumber
                                            }
                                            onChange={
                                                handleChange
                                            }
                                            placeholder="e.g. 0999 123 456"
                                            autoComplete="tel"
                                        />

                                    </div>

                                    <div className="setup-field">

                                        <label htmlFor="confirmPhoneNumber">
                                            Confirm phone number
                                            <span>*</span>
                                        </label>

                                        <input
                                            id="confirmPhoneNumber"
                                            name="confirmPhoneNumber"
                                            type="tel"
                                            value={
                                                formData.confirmPhoneNumber
                                            }
                                            onChange={
                                                handleChange
                                            }
                                            placeholder="Re-enter your phone number"
                                            autoComplete="tel"
                                        />

                                    </div>

                                </div>

                            </div>
                        )}

                        {/* =================================
                            BANK
                        ================================= */}

                        {isBank && (
                            <div className="setup-provider-section">

                                <div className="provider-heading">

                                    <div className="provider-icon">
                                        🏦
                                    </div>

                                    <div>
                                        <strong>
                                            Bank account
                                        </strong>

                                        <span>
                                            Enter your bank
                                            account information.
                                        </span>
                                    </div>

                                </div>

                                <div className="setup-fields">

                                    <div className="setup-field">

                                        <label htmlFor="bankName">
                                            Bank name
                                            <span>*</span>
                                        </label>

                                        <input
                                            id="bankName"
                                            name="bankName"
                                            type="text"
                                            value={
                                                formData.bankName
                                            }
                                            onChange={
                                                handleChange
                                            }
                                            placeholder="Enter your bank name"
                                            autoComplete="organization"
                                        />

                                    </div>

                                    <div className="setup-field">

                                        <label htmlFor="accountType">
                                            Account type
                                            <span>*</span>
                                        </label>

                                        <select
                                            id="accountType"
                                            name="accountType"
                                            value={
                                                formData.accountType
                                            }
                                            onChange={
                                                handleChange
                                            }
                                        >

                                            <option value="">
                                                Select account type
                                            </option>

                                            <option value="savings">
                                                Savings
                                            </option>

                                            <option value="current">
                                                Current
                                            </option>

                                            <option value="business">
                                                Business
                                            </option>

                                        </select>

                                    </div>

                                    <div className="setup-field">

                                        <label htmlFor="accountNumber">
                                            Account number
                                            <span>*</span>
                                        </label>

                                        <input
                                            id="accountNumber"
                                            name="accountNumber"
                                            type="text"
                                            inputMode="numeric"
                                            value={
                                                formData.accountNumber
                                            }
                                            onChange={
                                                handleChange
                                            }
                                            placeholder="Enter your account number"
                                            autoComplete="off"
                                        />

                                    </div>

                                    <div className="setup-field">

                                        <label htmlFor="confirmAccountNumber">
                                            Confirm account number
                                            <span>*</span>
                                        </label>

                                        <input
                                            id="confirmAccountNumber"
                                            name="confirmAccountNumber"
                                            type="text"
                                            inputMode="numeric"
                                            value={
                                                formData.confirmAccountNumber
                                            }
                                            onChange={
                                                handleChange
                                            }
                                            placeholder="Re-enter your account number"
                                            autoComplete="off"
                                        />

                                    </div>

                                    <div className="setup-field">

                                        <label htmlFor="branchName">
                                            Branch name
                                            <span>*</span>
                                        </label>

                                        <input
                                            id="branchName"
                                            name="branchName"
                                            type="text"
                                            value={
                                                formData.branchName
                                            }
                                            onChange={
                                                handleChange
                                            }
                                            placeholder="Enter your branch name"
                                        />

                                    </div>

                                    <div className="setup-field">

                                        <label htmlFor="bankCode">
                                            Bank / branch code
                                            <span className="optional">
                                                Optional
                                            </span>
                                        </label>

                                        <input
                                            id="bankCode"
                                            name="bankCode"
                                            type="text"
                                            value={
                                                formData.bankCode
                                            }
                                            onChange={
                                                handleChange
                                            }
                                            placeholder="Enter code if required"
                                        />

                                    </div>

                                </div>

                            </div>
                        )}

                        {/* =================================
                            NO METHOD
                        ================================= */}

                        {!formData.payoutMethod && (
                            <div className="setup-method-required">

                                <div>
                                    <span>↑</span>
                                </div>

                                <p>
                                    Select a payout method
                                    above to enter your
                                    account information.
                                </p>

                            </div>
                        )}

                    </section>

                    {/* ======================================
                        SECURITY
                    ====================================== */}

                    <div className="setup-security-note">

                        <div className="setup-security-icon">
                            🔒
                        </div>

                        <div>
                            <strong>
                                Your payout information is
                                protected
                            </strong>

                            <p>
                                Your payout details are
                                securely associated with
                                your Cave Tunes creator
                                account and will only be
                                used to process eligible
                                monetization payments.
                            </p>
                        </div>

                    </div>

                    {/* ======================================
                        ERROR
                    ====================================== */}

                    {error && (
                        <div className="setup-error">

                            <span>!</span>

                            <p>
                                {error}
                            </p>

                        </div>
                    )}

                    {/* ======================================
                        ACTIONS
                    ====================================== */}

                    <div className="setup-actions">

                        <button
                            type="button"
                            className="setup-cancel"
                            onClick={
                                handleBack
                            }
                            disabled={saving}
                        >
                            Back
                        </button>

                        <button
                            type="submit"
                            className="setup-continue"
                            disabled={
                                saving ||
                                !formData.payoutMethod
                            }
                        >

                            {saving ? (
                                <>
                                    <span className="setup-button-spinner" />

                                    Saving...
                                </>
                            ) : (
                                <>
                                    <span>
                                        Continue to Review
                                    </span>

                                    <span>
                                        →
                                    </span>
                                </>
                            )}

                        </button>

                    </div>

                    {/* ======================================
                        STEP MESSAGE
                    ====================================== */}

                    <div className="setup-footer-message">

                        <span>02</span>

                        <p>
                            Your payout method can be
                            reviewed before the final
                            monetization request is
                            submitted.
                        </p>

                    </div>

                </form>

            </main>

        </div>
    );
}