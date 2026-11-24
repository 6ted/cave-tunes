import { API_BASE_URL as SHARED_API_BASE_URL } from "../services/api";
// ======================================================
// CAVE TUNES
// ADMIN REQUESTS
// src/pages/AdminRequests.jsx
// ======================================================

import {
    useCallback,
    useEffect,
    useState,
} from "react";

import {
    ShieldCheck,
    BarChart3,
    Download,
    RefreshCw,
    ArrowLeft,
    Eye,
    EyeOff,
    CheckCircle2,
    XCircle,
    Clock3,
    User,
    Wallet,
    FileText,
    Smartphone,
    Building2,
} from "lucide-react";

import {
    useNavigate,
} from "react-router-dom";

import Tabs from "../components/Tabs";

import {
    getVerificationRequests,
    updateVerificationRequest,
    getMonetizationRequests,
    updateMonetizationRequest,
    getWithdrawRequests,
    updateWithdrawRequest,
} from "../services/api";

import "../styles/AdminRequests.css";


// ======================================================
// API
// ======================================================

const API_BASE_URL = SHARED_API_BASE_URL;


// ======================================================
// MEDIA URL
// ======================================================

function getMediaUrl(url) {

    if (!url) {
        return "";
    }

    const value =
        String(url).trim();

    if (
        value.startsWith("http://") ||
        value.startsWith("https://") ||
        value.startsWith("blob:") ||
        value.startsWith("data:")
    ) {
        return value;
    }

    if (value.startsWith("/")) {
        return `${API_BASE_URL}${value}`;
    }

    return `${API_BASE_URL}/${value}`;
}


// ======================================================
// SAFE JSON PARSER
// ======================================================

function parseJsonData(value) {

    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {
        return {};
    }

    if (
        typeof value === "object" &&
        !Array.isArray(value)
    ) {
        return value;
    }

    if (typeof value === "string") {

        try {

            const parsed =
                JSON.parse(value);

            if (
                parsed &&
                typeof parsed === "object" &&
                !Array.isArray(parsed)
            ) {
                return parsed;
            }

        } catch {
            return {};
        }
    }

    return {};
}


// ======================================================
// PICK VALUE
// ======================================================
//
// Supports both:
// creatorType
// creator_type
//
// Also supports multiple possible aliases.
// ======================================================

function pickValue(
    object,
    keys,
    fallback = undefined
) {

    if (
        !object ||
        typeof object !== "object"
    ) {
        return fallback;
    }

    for (const key of keys) {

        const value =
            object[key];

        if (
            value !== undefined &&
            value !== null &&
            value !== ""
        ) {
            return value;
        }
    }

    return fallback;
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

    if (typeof value === "boolean") {
        return value
            ? "Yes"
            : "No";
    }

    return String(value)
        .replace(/_/g, " ")
        .replace(
            /\b\w/g,
            letter =>
                letter.toUpperCase()
        );
}


// ======================================================
// BOOLEAN
// ======================================================

function formatBoolean(value) {

    return value
        ? "Confirmed"
        : "Not confirmed";
}


// ======================================================
// PAYOUT METHOD
// ======================================================

function formatPayoutMethod(method) {

    switch (method) {

        case "airtel_money":
            return "Airtel Money";

        case "tnm_mpamba":
            return "TNM Mpamba";

        case "bank_transfer":
            return "Bank Transfer";

        default:
            return formatValue(method);

    }
}

// ======================================================
// WITHDRAWAL PAYOUT DETAILS
// ======================================================
//
// Priority:
// 1. withdrawal_requests.payout_details
//    - historical snapshot captured at withdrawal time
//
// 2. wallet_payout_methods fields returned by admin API
//    - fallback/current payout method information
//
// This means old withdrawal requests and new withdrawal
// requests can both be displayed correctly.
// ======================================================

function normalizeWithdrawalRequest(request) {

    const safeRequest = request || {};

    // ==================================================
    // HISTORICAL PAYOUT SNAPSHOT
    // ==================================================

    const payoutSnapshot =
        parseJsonData(
            safeRequest.payout_details
        );


    // ==================================================
    // BACKEND PAYOUT METHOD FIELDS
    // ==================================================

    const currentPayout = {

        payoutMethod:
            safeRequest.payout_method_type,

        accountHolderName:
            safeRequest.payout_account_holder_name,

        phoneNumber:
            safeRequest.payout_phone_number,

        bankName:
            safeRequest.payout_bank_name,

        accountNumber:
            safeRequest.payout_account_number,

        accountType:
            safeRequest.payout_account_type,

        branchName:
            safeRequest.payout_branch_name,

        bankCode:
            safeRequest.payout_bank_code,

    };


    // ==================================================
    // RETURN NORMALIZED REQUEST
    // ==================================================

    return {

        ...safeRequest,

        payout: {

            // ------------------------------------------------
            // PAYOUT METHOD
            // ------------------------------------------------

            payoutMethod:
                pickValue(
                    payoutSnapshot,
                    [
                        "payoutMethod",
                        "payout_method",
                        "method",
                        "methodType",
                        "method_type",
                    ],
                    currentPayout.payoutMethod
                ),


            // ------------------------------------------------
            // ACCOUNT HOLDER
            // ------------------------------------------------

            accountHolderName:
                pickValue(
                    payoutSnapshot,
                    [
                        "accountHolderName",
                        "account_holder_name",
                        "accountName",
                        "account_name",
                    ],
                    currentPayout.accountHolderName
                ),


            // ------------------------------------------------
            // PHONE
            // ------------------------------------------------

            phoneNumber:
                pickValue(
                    payoutSnapshot,
                    [
                        "phoneNumber",
                        "phone_number",
                        "phone",
                    ],
                    currentPayout.phoneNumber
                ),


            // ------------------------------------------------
            // BANK NAME
            // ------------------------------------------------

            bankName:
                pickValue(
                    payoutSnapshot,
                    [
                        "bankName",
                        "bank_name",
                    ],
                    currentPayout.bankName
                ),


            // ------------------------------------------------
            // ACCOUNT NUMBER
            // ------------------------------------------------

            accountNumber:
                pickValue(
                    payoutSnapshot,
                    [
                        "accountNumber",
                        "account_number",
                    ],
                    currentPayout.accountNumber
                ),


            // ------------------------------------------------
            // ACCOUNT TYPE
            // ------------------------------------------------

            accountType:
                pickValue(
                    payoutSnapshot,
                    [
                        "accountType",
                        "account_type",
                    ],
                    currentPayout.accountType
                ),


            // ------------------------------------------------
            // BRANCH
            // ------------------------------------------------

            branchName:
                pickValue(
                    payoutSnapshot,
                    [
                        "branchName",
                        "branch_name",
                        "branch",
                    ],
                    currentPayout.branchName
                ),


            // ------------------------------------------------
            // BANK / BRANCH CODE
            // ------------------------------------------------

            bankCode:
                pickValue(
                    payoutSnapshot,
                    [
                        "bankCode",
                        "bank_code",
                        "branchCode",
                        "branch_code",
                    ],
                    currentPayout.bankCode
                ),

        },

    };
}
// ======================================================
// DATE
// ======================================================

function formatDateTime(value) {

    if (!value) {
        return "Not available";
    }

    const date =
        new Date(value);

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


// ======================================================
// NUMBER
// ======================================================

function formatNumber(value) {

    const number =
        Number(value || 0);

    return number.toLocaleString(
        "en-MW"
    );
}


// ======================================================
// MASK ACCOUNT
// ======================================================

function maskAccountNumber(value) {

    if (!value) {
        return "Not provided";
    }

    const normalized =
        String(value)
            .replace(/\s+/g, "");

    if (
        normalized.length <= 4
    ) {
        return normalized;
    }

    return `•••• ${normalized.slice(-4)}`;
}


// ======================================================
// STATUS ICON
// ======================================================

function StatusIcon({
    status,
}) {

    if (
        status === "approved" ||
        status === "paid"
    ) {
        return (
            <CheckCircle2
                size={17}
            />
        );
    }

    if (
        status === "rejected" ||
        status === "declined"
    ) {
        return (
            <XCircle
                size={17}
            />
        );
    }

    return (
        <Clock3
            size={17}
        />
    );
}


// ======================================================
// NORMALIZE MONETIZATION REQUEST
// ======================================================
//
// The backend may return:
//
// application_data
// payout_details
// eligibility_snapshot
// review_data
//
// OR:
//
// data.application
// data.payout
// data.eligibility
// data.review
//
// This function creates one consistent structure.
// ======================================================

// ======================================================
// NORMALIZE MONETIZATION REQUEST
// ======================================================

function normalizeMonetizationRequest(request) {

    const safeRequest = request || {};

    // ==================================================
    // APPLICATION DATA
    // ==================================================

    const application =
        parseJsonData(
            safeRequest.application_data
        );


    // ==================================================
    // PAYOUT DETAILS
    // ==================================================

    const payout =
        parseJsonData(
            safeRequest.payout_details
        );


    // ==================================================
    // ELIGIBILITY SNAPSHOT
    // ==================================================

    const eligibility =
        parseJsonData(
            safeRequest.eligibility_snapshot
        );


    // ==================================================
    // REVIEW DATA
    // ==================================================

    const review =
        parseJsonData(
            safeRequest.review_data
        );


    // ==================================================
    // RETURN NORMALIZED REQUEST
    // ==================================================

    return {

        ...safeRequest,


        // ------------------------------------------------
        // APPLICATION
        // ------------------------------------------------

        application: {

            creatorType:
                pickValue(
                    application,
                    [
                        "creatorType",
                        "creator_type",
                    ]
                ),

            primaryContent:
                pickValue(
                    application,
                    [
                        "primaryContent",
                        "primary_content",
                        "contentType",
                        "content_type",
                    ]
                ),

            audienceSize:
                pickValue(
                    application,
                    [
                        "audienceSize",
                        "audience_size",
                    ]
                ),

            uploadFrequency:
                pickValue(
                    application,
                    [
                        "uploadFrequency",
                        "upload_frequency",
                    ]
                ),

            monetizationGoal:
                pickValue(
                    application,
                    [
                        "monetizationGoal",
                        "monetization_goal",
                        "goal",
                    ]
                ),

            ownsContent:
                pickValue(
                    application,
                    [
                        "ownsContent",
                        "owns_content",
                    ],
                    false
                ),

            followsPolicies:
                pickValue(
                    application,
                    [
                        "followsPolicies",
                        "follows_policies",
                    ],
                    false
                ),

            accurateInformation:
                pickValue(
                    application,
                    [
                        "accurateInformation",
                        "accurate_information",
                    ],
                    false
                ),

        },


        // ------------------------------------------------
        // PAYOUT
        // ------------------------------------------------

        payout: {

            payoutMethod:
                pickValue(
                    payout,
                    [
                        "payoutMethod",
                        "payout_method",
                        "method",
                    ]
                ),

            accountHolderName:
                pickValue(
                    payout,
                    [
                        "accountHolderName",
                        "account_holder_name",
                        "accountName",
                        "account_name",
                    ]
                ),

            phoneNumber:
                pickValue(
                    payout,
                    [
                        "phoneNumber",
                        "phone_number",
                        "phone",
                    ]
                ),

            bankName:
                pickValue(
                    payout,
                    [
                        "bankName",
                        "bank_name",
                    ]
                ),

            accountNumber:
                pickValue(
                    payout,
                    [
                        "accountNumber",
                        "account_number",
                    ]
                ),

            accountType:
                pickValue(
                    payout,
                    [
                        "accountType",
                        "account_type",
                    ]
                ),

            branchName:
                pickValue(
                    payout,
                    [
                        "branchName",
                        "branch_name",
                        "branch",
                    ]
                ),

            bankCode:
                pickValue(
                    payout,
                    [
                        "bankCode",
                        "bank_code",
                        "branchCode",
                        "branch_code",
                    ]
                ),

        },


        // ------------------------------------------------
        // ELIGIBILITY
        // ------------------------------------------------

        eligibility: {

            verified:
                Boolean(
                    pickValue(
                        eligibility,
                        [
                            "verified",
                            "isVerified",
                            "is_verified",
                        ],
                        false
                    )
                ),

            followers:
                Number(
                    pickValue(
                        eligibility,
                        [
                            "followers_count",
                            "followersCount",
                            "followers",
                        ],
                        0
                    )
                ),

            highestSongPlays:
                Number(
                    pickValue(
                        eligibility,
                        [
                            "highest_song_plays",
                            "highestSongPlays",
                            "highest_plays",
                        ],
                        0
                    )
                ),

            isAdmin:
                Boolean(
                    pickValue(
                        eligibility,
                        [
                            "is_admin",
                            "isAdmin",
                            "admin_bypass",
                            "adminBypass",
                        ],
                        false
                    )
                ),

            requirementsComplete:
                Boolean(
                    pickValue(
                        eligibility,
                        [
                            "requirements_complete",
                            "requirementsComplete",
                        ],
                        false
                    )
                ),

            eligibleToSubmit:
                Boolean(
                    pickValue(
                        eligibility,
                        [
                            "eligible_to_submit",
                            "eligibleToSubmit",
                        ],
                        false
                    )
                ),

            requirements:
                eligibility.requirements || {},

            capturedAt:
                eligibility.captured_at || null,

        },


        // ------------------------------------------------
        // REVIEW
        // ------------------------------------------------

        review,

    };
}

// ======================================================
// DETAIL ITEM
// ======================================================

function DetailItem({
    label,
    value,
    full = false,
    className = "",
}) {

    return (

        <div
            className={`monetization-detail-item ${
                full
                    ? "full"
                    : ""
            } ${className}`}
        >

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
// MONETIZATION DETAILS
// ======================================================

function MonetizationDetails({
    request,
}) {

    const [
        showSensitive,
        setShowSensitive,
    ] = useState(false);


    const normalized =
        normalizeMonetizationRequest(
            request
        );


    const {
        application,
        payout,
        eligibility,
        review,
    } = normalized;


    const payoutMethod =
        payout.payoutMethod;


    const isMobileMoney =
        payoutMethod === "airtel_money" ||
        payoutMethod === "tnm_mpamba";


    const isBank =
        payoutMethod === "bank_transfer";


    const submittedAt =
        request.submitted_at ||
        request.created_at;


    // ==================================================
    // RENDER
    // ==================================================

    return (

        <div className="monetization-details">


            {/* ==================================================
                REQUEST INFORMATION
            ================================================== */}

            <div className="monetization-detail-section">

                <div className="monetization-detail-heading">

                    <FileText size={18} />

                    <div>

                        <strong>
                            Monetization Request
                        </strong>

                        <span>
                            Complete request information
                        </span>

                    </div>

                </div>


                <div className="monetization-detail-grid">

                    <DetailItem
                        label="Request ID"
                        value={
                            `#${request.id || "N/A"}`
                        }
                    />


                    <DetailItem
                        label="Creator"
                        value={
                            request.username ||
                            request.user?.username ||
                            "Unknown Creator"
                        }
                    />


                    <DetailItem
                        label="Email"
                        value={
                            request.email ||
                            request.user?.email ||
                            "Not provided"
                        }
                    />


                    <DetailItem
                        label="Status"
                        value={
                            formatValue(
                                request.status
                            )
                        }
                        className={
                            `request-status ${request.status}`
                        }
                    />


                    <DetailItem
                        label="Submitted"
                        value={
                            formatDateTime(
                                submittedAt
                            )
                        }
                        full
                    />

                </div>

            </div>


            {/* ==================================================
                APPLICATION INFORMATION
            ================================================== */}

            <div className="monetization-detail-section">

                <div className="monetization-detail-heading">

                    <FileText size={18} />

                    <div>

                        <strong>
                            Application Information
                        </strong>

                        <span>
                            Information submitted by the creator
                        </span>

                    </div>

                </div>


                <div className="monetization-detail-grid">

                    <DetailItem
                        label="Creator Type"
                        value={
                            formatValue(
                                application.creatorType
                            )
                        }
                    />


                    <DetailItem
                        label="Primary Content"
                        value={
                            formatValue(
                                application.primaryContent
                            )
                        }
                    />


                    <DetailItem
                        label="Audience Size"
                        value={
                            formatValue(
                                application.audienceSize
                            )
                        }
                    />


                    <DetailItem
                        label="Upload Frequency"
                        value={
                            formatValue(
                                application.uploadFrequency
                            )
                        }
                    />


                    <DetailItem
                        label="Monetization Goal"
                        value={
                            formatValue(
                                application.monetizationGoal
                            )
                        }
                        full
                    />

                </div>

            </div>


            {/* ==================================================
                DECLARATIONS
            ================================================== */}

            <div className="monetization-detail-section">

                <div className="monetization-detail-heading">

                    <ShieldCheck size={18} />

                    <div>

                        <strong>
                            Creator Declarations
                        </strong>

                        <span>
                            Confirmations submitted with the application
                        </span>

                    </div>

                </div>


                <div className="monetization-declarations">


                    <div className="declaration-item">

                        <span>
                            Content ownership
                        </span>

                        <strong
                            className={
                                application.ownsContent
                                    ? "confirmed"
                                    : "not-confirmed"
                            }
                        >
                            {formatBoolean(
                                application.ownsContent
                            )}
                        </strong>

                    </div>


                    <div className="declaration-item">

                        <span>
                            Cave Tunes policies
                        </span>

                        <strong
                            className={
                                application.followsPolicies
                                    ? "confirmed"
                                    : "not-confirmed"
                            }
                        >
                            {formatBoolean(
                                application.followsPolicies
                            )}
                        </strong>

                    </div>


                    <div className="declaration-item">

                        <span>
                            Information accuracy
                        </span>

                        <strong
                            className={
                                application.accurateInformation
                                    ? "confirmed"
                                    : "not-confirmed"
                            }
                        >
                            {formatBoolean(
                                application.accurateInformation
                            )}
                        </strong>

                    </div>

                </div>

            </div>


            {/* ==================================================
                PAYOUT INFORMATION
            ================================================== */}

            <div className="monetization-detail-section payout-section">

                <div className="monetization-detail-heading">

                    <Wallet size={18} />

                    <div>

                        <strong>
                            Payout Information
                        </strong>

                        <span>
                            Payment details submitted by the creator
                        </span>

                    </div>


                    <button
                        type="button"
                        className="sensitive-toggle"
                        onClick={() =>
                            setShowSensitive(
                                current =>
                                    !current
                            )
                        }
                    >

                        {showSensitive ? (
                            <>
                                <EyeOff size={16} />
                                Hide
                            </>
                        ) : (
                            <>
                                <Eye size={16} />
                                Show
                            </>
                        )}

                    </button>

                </div>


                <div className="monetization-detail-grid">


                    <DetailItem
                        label="Payout Method"
                        value={
                            formatPayoutMethod(
                                payoutMethod
                            )
                        }
                    />


                    <DetailItem
                        label="Account Holder"
                        value={
                            formatValue(
                                payout.accountHolderName
                            )
                        }
                    />


                    {isMobileMoney && (

                        <DetailItem
                            label={
                                <span className="detail-label-icon">
                                    <Smartphone
                                        size={14}
                                    />
                                    Mobile Money Number
                                </span>
                            }
                            value={
                                showSensitive
                                    ? formatValue(
                                        payout.phoneNumber
                                    )
                                    : maskAccountNumber(
                                        payout.phoneNumber
                                    )
                            }
                            className="sensitive-value"
                        />

                    )}


                    {isBank && (
                        <>


                            <DetailItem
                                label={
                                    <span className="detail-label-icon">
                                        <Building2
                                            size={14}
                                        />
                                        Bank Name
                                    </span>
                                }
                                value={
                                    formatValue(
                                        payout.bankName
                                    )
                                }
                            />


                            <DetailItem
                                label="Account Number"
                                value={
                                    showSensitive
                                        ? formatValue(
                                            payout.accountNumber
                                        )
                                        : maskAccountNumber(
                                            payout.accountNumber
                                        )
                                }
                                className="sensitive-value"
                            />


                            <DetailItem
                                label="Account Type"
                                value={
                                    formatValue(
                                        payout.accountType
                                    )
                                }
                            />


                            <DetailItem
                                label="Branch"
                                value={
                                    formatValue(
                                        payout.branchName
                                    )
                                }
                            />


                            {payout.bankCode && (

                                <DetailItem
                                    label="Bank / Branch Code"
                                    value={
                                        formatValue(
                                            payout.bankCode
                                        )
                                    }
                                />

                            )}

                        </>
                    )}

                </div>

            </div>


            {/* ==================================================
                ELIGIBILITY SNAPSHOT
            ================================================== */}

            <div className="monetization-detail-section">

                <div className="monetization-detail-heading">

                    <BarChart3 size={18} />

                    <div>

                        <strong>
                            Eligibility Snapshot
                        </strong>

                        <span>
                            Database values captured when submitted
                        </span>

                    </div>

                </div>


                <div className="monetization-detail-grid">


                    <DetailItem
                        label="Creator Verified"
                        value={
                            eligibility.verified
                                ? "Yes"
                                : "No"
                        }
                    />


                    <DetailItem
                        label="Followers"
                        value={
                            formatNumber(
                                eligibility.followers
                            )
                        }
                    />


                    <DetailItem
                        label="Highest Song Plays"
                        value={
                            formatNumber(
                                eligibility.highestSongPlays
                            )
                        }
                    />


                    <DetailItem
                        label="Admin Bypass"
                        value={
                            eligibility.isAdmin
                                ? "Yes"
                                : "No"
                        }
                    />


                    <DetailItem
                        label="Requirements Complete"
                        value={
                            eligibility.requirementsComplete
                                ? "Yes"
                                : "No"
                        }
                        className={
                            eligibility.requirementsComplete
                                ? "confirmed"
                                : "not-confirmed"
                        }
                    />


                    <DetailItem
                        label="Eligible to Submit"
                        value={
                            eligibility.eligibleToSubmit
                                ? "Yes"
                                : "No"
                        }
                        className={
                            eligibility.eligibleToSubmit
                                ? "confirmed"
                                : "not-confirmed"
                        }
                    />

                </div>

            </div>


            {/* ==================================================
                REVIEW INFORMATION
            ================================================== */}

            {Object.keys(
                review
            ).length > 0 && (

                <div className="monetization-detail-section">

                    <div className="monetization-detail-heading">

                        <ShieldCheck size={18} />

                        <div>

                            <strong>
                                Review Information
                            </strong>

                            <span>
                                Administrative review information
                            </span>

                        </div>

                    </div>


                    <div className="monetization-detail-grid">

                        {Object.entries(
                            review
                        ).map(
                            ([key, value]) => (

                                <DetailItem
                                    key={key}
                                    label={
                                        formatValue(
                                            key
                                        )
                                    }
                                    value={
                                        typeof value ===
                                        "object"
                                            ? JSON.stringify(
                                                value
                                            )
                                            : formatValue(
                                                value
                                            )
                                    }
                                />

                            )
                        )}

                    </div>

                </div>

            )}


            {/* ==================================================
                SUBMISSION FOOTER
            ================================================== */}

            <div className="monetization-submission-info">

                <div>

                    <Clock3 size={16} />

                    <span>
                        Submitted
                    </span>

                    <strong>
                        {formatDateTime(
                            submittedAt
                        )}
                    </strong>

                </div>


                <div>

                    <span>
                        Request ID
                    </span>

                    <strong>
                        #{request.id}
                    </strong>

                </div>

            </div>

        </div>

    );
}

// ======================================================
// WITHDRAWAL DETAILS
// ======================================================

function WithdrawalDetails({
    request,
}) {

    const [
        showSensitive,
        setShowSensitive,
    ] = useState(false);

    const normalized =
        normalizeWithdrawalRequest(
            request
        );

    const payout =
        normalized.payout || {};

    const payoutMethod =
        payout.payoutMethod;

    const isMobileMoney =
        payoutMethod === "airtel_money" ||
        payoutMethod === "tnm_mpamba";

    const isBank =
        payoutMethod === "bank_transfer";

    const currency =
        request.currency ||
        request.wallet_currency ||
        "USD";

    const amount =
        Number(
            request.amount || 0
        );

    const requestedAt =
        request.requested_at ||
        request.created_at;

    return (

        <div className="monetization-details withdrawal-details">

            {/* ==================================================
                WITHDRAWAL INFORMATION
            ================================================== */}

            <div className="monetization-detail-section">

                <div className="monetization-detail-heading">

                    <Wallet size={18} />

                    <div>

                        <strong>
                            Withdrawal Information
                        </strong>

                        <span>
                            Payment request submitted by the creator
                        </span>

                    </div>

                </div>


                <div className="monetization-detail-grid">

                    <DetailItem
                        label="Request ID"
                        value={
                            `#${request.id || "N/A"}`
                        }
                    />


                    <DetailItem
                        label="Status"
                        value={
                            formatValue(
                                request.status
                            )
                        }
                        className={
                            `request-status ${request.status}`
                        }
                    />


                    <DetailItem
                        label="Username"
                        value={
                            request.username ||
                            request.user?.username ||
                            "Unknown User"
                        }
                    />


                    <DetailItem
                        label="Email"
                        value={
                            request.email ||
                            request.user?.email ||
                            "Not provided"
                        }
                    />


                    <DetailItem
                        label="Withdrawal Amount"
                        value={
                            `${currency} ${amount.toLocaleString(
                                "en-MW",
                                {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                }
                            )}`
                        }
                        className="withdrawal-amount"
                    />


                    <DetailItem
                        label="Payout Method"
                        value={
                            formatPayoutMethod(
                                payoutMethod
                            )
                        }
                    />


                    <DetailItem
                        label="Transaction Reference"
                        value={
                            request.transaction_reference ||
                            request.reference ||
                            "Not provided"
                        }
                        full
                    />


                    <DetailItem
                        label="Requested"
                        value={
                            formatDateTime(
                                requestedAt
                            )
                        }
                        full
                    />

                </div>

            </div>


            {/* ==================================================
                PAYOUT INFORMATION
            ================================================== */}

            <div className="monetization-detail-section payout-section">

                <div className="monetization-detail-heading">

                    <Wallet size={18} />

                    <div>

                        <strong>
                            Payment Destination
                        </strong>

                        <span>
                            Payout details attached to this withdrawal
                        </span>

                    </div>


                    <button
                        type="button"
                        className="sensitive-toggle"
                        onClick={() =>
                            setShowSensitive(
                                current =>
                                    !current
                            )
                        }
                    >

                        {showSensitive ? (
                            <>
                                <EyeOff size={16} />
                                Hide
                            </>
                        ) : (
                            <>
                                <Eye size={16} />
                                Show
                            </>
                        )}

                    </button>

                </div>


                <div className="monetization-detail-grid">

                    <DetailItem
                        label="Payment Method"
                        value={
                            formatPayoutMethod(
                                payoutMethod
                            )
                        }
                    />


                    <DetailItem
                        label="Account Holder"
                        value={
                            formatValue(
                                payout.accountHolderName
                            )
                        }
                    />


                    {isMobileMoney && (

                        <DetailItem
                            label={
                                <span className="detail-label-icon">

                                    <Smartphone
                                        size={14}
                                    />

                                    Mobile Money Number

                                </span>
                            }
                            value={
                                showSensitive
                                    ? formatValue(
                                        payout.phoneNumber
                                    )
                                    : maskAccountNumber(
                                        payout.phoneNumber
                                    )
                            }
                            className="sensitive-value"
                        />

                    )}


                    {isBank && (
                        <>

                            <DetailItem
                                label={
                                    <span className="detail-label-icon">

                                        <Building2
                                            size={14}
                                        />

                                        Bank Name

                                    </span>
                                }
                                value={
                                    formatValue(
                                        payout.bankName
                                    )
                                }
                            />


                            <DetailItem
                                label="Account Number"
                                value={
                                    showSensitive
                                        ? formatValue(
                                            payout.accountNumber
                                        )
                                        : maskAccountNumber(
                                            payout.accountNumber
                                        )
                                }
                                className="sensitive-value"
                            />


                            <DetailItem
                                label="Account Type"
                                value={
                                    formatValue(
                                        payout.accountType
                                    )
                                }
                            />


                            <DetailItem
                                label="Branch"
                                value={
                                    formatValue(
                                        payout.branchName
                                    )
                                }
                            />


                            {payout.bankCode && (

                                <DetailItem
                                    label="Bank / Branch Code"
                                    value={
                                        formatValue(
                                            payout.bankCode
                                        )
                                    }
                                />

                            )}

                        </>
                    )}

                </div>

            </div>


            {/* ==================================================
                ADMIN PROCESSING INFORMATION
            ================================================== */}

            {(request.approved_at ||
                request.approved_by ||
                request.rejected_at ||
                request.rejected_by ||
                request.rejection_reason) && (

                <div className="monetization-detail-section">

                    <div className="monetization-detail-heading">

                        <ShieldCheck size={18} />

                        <div>

                            <strong>
                                Processing Information
                            </strong>

                            <span>
                                Administrative processing history
                            </span>

                        </div>

                    </div>


                    <div className="monetization-detail-grid">

                        {request.approved_at && (

                            <DetailItem
                                label="Approved / Paid"
                                value={
                                    formatDateTime(
                                        request.approved_at
                                    )
                                }
                            />

                        )}


                        {request.rejected_at && (

                            <DetailItem
                                label="Rejected"
                                value={
                                    formatDateTime(
                                        request.rejected_at
                                    )
                                }
                            />

                        )}


                        {request.approved_by && (

                            <DetailItem
                                label="Approved By"
                                value={
                                    `Admin #${request.approved_by}`
                                }
                            />

                        )}


                        {request.rejected_by && (

                            <DetailItem
                                label="Rejected By"
                                value={
                                    `Admin #${request.rejected_by}`
                                }
                            />

                        )}


                        {request.rejection_reason && (

                            <DetailItem
                                label="Rejection Reason"
                                value={
                                    request.rejection_reason
                                }
                                full
                            />

                        )}

                    </div>

                </div>

            )}


            {/* ==================================================
                FOOTER
            ================================================== */}

            <div className="monetization-submission-info">

                <div>

                    <Clock3 size={16} />

                    <span>
                        Requested
                    </span>

                    <strong>
                        {formatDateTime(
                            requestedAt
                        )}
                    </strong>

                </div>


                <div>

                    <span>
                        Request ID
                    </span>

                    <strong>
                        #{request.id}
                    </strong>

                </div>

            </div>

        </div>

    );
}
// ======================================================
// MAIN COMPONENT
// ======================================================

function AdminRequests() {

    const navigate =
        useNavigate();


    // ==================================================
    // STATE
    // ==================================================

    const [
        verificationRequests,
        setVerificationRequests,
    ] = useState([]);


    const [
        monetizationRequests,
        setMonetizationRequests,
    ] = useState([]);


    const [
        withdrawRequests,
        setWithdrawRequests,
    ] = useState([]);


    const [
        previewImage,
        setPreviewImage,
    ] = useState("");


    const [
        loading,
        setLoading,
    ] = useState(true);


    const [
        actionLoading,
        setActionLoading,
    ] = useState(false);


    const [
        error,
        setError,
    ] = useState("");


    const [
        successMessage,
        setSuccessMessage,
    ] = useState("");


    const [
        verificationTab,
        setVerificationTab,
    ] = useState("pending");


    const [
        monetizationTab,
        setMonetizationTab,
    ] = useState("pending");


    const [
        withdrawTab,
        setWithdrawTab,
    ] = useState("pending");


    const [
        expandedMonetization,
        setExpandedMonetization,
    ] = useState(null);

const [
    expandedWithdrawal,
    setExpandedWithdrawal,
] = useState(null);

    // ==================================================
    // LOAD VERIFICATION
    // ==================================================

    const loadVerificationRequests =
        useCallback(
            async () => {

                const response =
                    await getVerificationRequests();

                setVerificationRequests(
                    response?.requests || []
                );

            },
            []
        );


    // ==================================================
    // LOAD MONETIZATION
    // ==================================================

    const loadMonetizationRequests =
        useCallback(
            async () => {

                const response =
                    await getMonetizationRequests();


                console.log(
                    "CAVE TUNES MONETIZATION REQUESTS:",
                    response
                );


                const requests =
                    response?.requests ||
                    response?.data?.requests ||
                    response?.data ||
                    [];


                const safeRequests =
                    Array.isArray(
                        requests
                    )
                        ? requests
                        : [];


                setMonetizationRequests(
                    safeRequests.map(
                        normalizeMonetizationRequest
                    )
                );

            },
            []
        );


    // ==================================================
    // LOAD WITHDRAWALS
    // ==================================================

    const loadWithdrawRequests =
        useCallback(
            async () => {

                const response =
                    await getWithdrawRequests();

                setWithdrawRequests(
                    response?.requests || []
                );

            },
            []
        );


    // ==================================================
    // LOAD EVERYTHING
    // ==================================================

    const loadAll =
        useCallback(
            async () => {

                try {

                    setLoading(true);
                    setError("");

                    await Promise.all([
                        loadVerificationRequests(),
                        loadMonetizationRequests(),
                        loadWithdrawRequests(),
                    ]);

                } catch (err) {

                    console.error(
                        "ADMIN REQUESTS LOAD ERROR:",
                        err
                    );

                    setError(
                        err?.message ||
                        "Unable to load requests."
                    );

                } finally {

                    setLoading(false);

                }

            },
            [
                loadVerificationRequests,
                loadMonetizationRequests,
                loadWithdrawRequests,
            ]
        );


    // ==================================================
    // INITIAL LOAD
    // ==================================================
    //
    // A zero-delay timer prevents the new React Hooks
    // ESLint rule from treating the data-loading call
    // as a synchronous setState inside the effect.
    // ==================================================

   useEffect(() => {

    let cancelled = false;

    async function initializeRequests() {

        try {

            setLoading(true);
            setError("");

            const [
                verificationResponse,
                monetizationResponse,
                withdrawResponse,
            ] = await Promise.all([
                getVerificationRequests(),
                getMonetizationRequests(),
                getWithdrawRequests(),
            ]);

            if (cancelled) {
                return;
            }

            setVerificationRequests(
                verificationResponse?.requests || []
            );

            const monetization =
    monetizationResponse?.requests ||
    monetizationResponse?.data?.requests ||
    monetizationResponse?.data ||
    [];

            setMonetizationRequests(
                monetization.map(
                    normalizeMonetizationRequest
                )
            );

            setWithdrawRequests(
                withdrawResponse?.requests || []
            );

        } catch (err) {

            if (cancelled) {
                return;
            }

            console.error(
                "ADMIN REQUESTS INITIAL LOAD ERROR:",
                err
            );

            setError(
                err?.message ||
                "Unable to load requests."
            );

        } finally {

            if (!cancelled) {
                setLoading(false);
            }

        }

    }

    initializeRequests();

    return () => {
        cancelled = true;
    };

}, []);


    // ==================================================
    // ACTION
    // ==================================================

    const handleApproval =
    async (
        type,
        id,
        status,
        reason = null
    ) => {

            try {

                setActionLoading(true);
                setError("");


                if (
                    type ===
                    "verification"
                ) {

                    await updateVerificationRequest(
                        id,
                        status
                    );

                    await loadVerificationRequests();

                    setSuccessMessage(
                        `Verification ${status}`
                    );

                }


                if (
                    type ===
                    "monetization"
                ) {

                    await updateMonetizationRequest(
                        id,
                        status
                    );

                    await loadMonetizationRequests();

                    setSuccessMessage(
                        `Monetization ${status}`
                    );

                }


                if (
                    type ===
                    "withdraw"
                ) {

                  await updateWithdrawRequest(
                    id,
                    status,
                    reason
                );
                    await loadWithdrawRequests();

                    setSuccessMessage(
                        `Withdrawal ${status}`
                    );

                }

            } catch (err) {

                console.error(
                    "ADMIN REQUEST ACTION ERROR:",
                    err
                );

                setError(
                    err?.message ||
                    "Unable to update request."
                );

            } finally {

                setActionLoading(false);

                window.setTimeout(
                    () => {
                        setSuccessMessage("");
                    },
                    3000
                );

            }

        };


    // ==================================================
    // FILTERS
    // ==================================================

    const filteredVerification =
        verificationRequests.filter(
            item =>
                item.status ===
                verificationTab
        );


    const filteredMonetization =
        monetizationRequests.filter(
            item =>
                item.status ===
                monetizationTab
        );


   const filteredWithdraw =
    withdrawRequests.filter(item => {

        const status =
            String(item.status || "").toLowerCase();

        const tab =
            String(withdrawTab || "").toLowerCase();

        if (tab === "approved") {
            return status === "approved" ||
                   status === "completed";
        }

        return status === tab;
    });


    // ==================================================
    // TOGGLE MONETIZATION
    // ==================================================

    const toggleMonetization =
        id => {

            setExpandedMonetization(
                current =>
                    current === id
                        ? null
                        : id
            );

        };

 // ==================================================
// TOGGLE WITHDRAWAL
// ==================================================

const toggleWithdrawal =
    id => {

        setExpandedWithdrawal(
            current =>
                current === id
                    ? null
                    : id
        );

    };

    // ==================================================
    // RENDER
    // ==================================================

    return (

        <main className="admin-requests-page">


            {/* ==================================================
                HEADER
            ================================================== */}

            <header className="admin-header">

                <button
                    type="button"
                    onClick={() =>
                        navigate(
                            "/admin-dashboard"
                        )
                    }
                >

                    <ArrowLeft size={18} />

                    Dashboard

                </button>


                <h1>
                    Admin Requests
                </h1>


                <button
                    type="button"
                    onClick={loadAll}
                    disabled={loading}
                >

                    <RefreshCw size={18} />

                    Refresh

                </button>

            </header>


            {/* ==================================================
                SUCCESS
            ================================================== */}

            {successMessage && (

                <div className="admin-success">

                    <ShieldCheck size={18} />

                    {successMessage}

                </div>

            )}


            {/* ==================================================
                ERROR
            ================================================== */}

            {error && (

                <div className="admin-error">

                    {error}

                </div>

            )}


            {/* ==================================================
                VERIFICATION REQUESTS
            ================================================== */}

            <section className="admin-panel">

                <div className="admin-panel-header">

                    <h2>
                        Verification Requests
                    </h2>

                    <ShieldCheck />

                </div>


                <Tabs
                    current={
                        verificationTab
                    }
                    setCurrent={
                        setVerificationTab
                    }
                />


                {filteredVerification.length === 0 ? (

                    <div className="admin-empty-card">
                        No requests.
                    </div>

                ) : (

                    filteredVerification.map(
                        request => (

                            <div
                                className="admin-request-card"
                                key={request.id}
                            >

                                <div>

                                    <strong>
                                        {request.username}
                                    </strong>

                                    <p>
                                        {request.role}
                                    </p>


                                    {request.payment_proof_url && (

                                        <img
                                            src={getMediaUrl(
                                                request.payment_proof_url
                                            )}
                                            className="payment-proof-image"
                                            alt="Payment proof"
                                            onClick={() =>
                                                setPreviewImage(
                                                    getMediaUrl(
                                                        request.payment_proof_url
                                                    )
                                                )
                                            }
                                        />

                                    )}

                                </div>


                                <div className="admin-request-actions">

                                    <button
                                        type="button"
                                        disabled={
                                            actionLoading
                                        }
                                        onClick={() =>
                                            handleApproval(
                                                "verification",
                                                request.id,
                                                "approved"
                                            )
                                        }
                                    >
                                        Approve
                                    </button>


                                    <button
                                        type="button"
                                        disabled={
                                            actionLoading
                                        }
                                        onClick={() =>
                                            handleApproval(
                                                "verification",
                                                request.id,
                                                "rejected"
                                            )
                                        }
                                    >
                                        Reject
                                    </button>


                                    <button
                                        type="button"
                                        onClick={() =>
                                            navigate(
                                                `/creator/${request.role}/${request.user_id}`
                                            )
                                        }
                                    >
                                        View User
                                    </button>


                                    <button
                                        type="button"
                                        disabled={
                                            actionLoading
                                        }
                                        onClick={() =>
                                            handleApproval(
                                                "verification",
                                                request.id,
                                                "pending"
                                            )
                                        }
                                    >
                                        Disapprove
                                    </button>

                                </div>

                            </div>

                        )
                    )

                )}

            </section>


            {/* ==================================================
                MONETIZATION REQUESTS
            ================================================== */}

            <section className="admin-panel">

                <div className="admin-panel-header">

                    <h2>
                        Monetization Requests
                    </h2>

                    <BarChart3 />

                </div>


                <Tabs
                    current={
                        monetizationTab
                    }
                    setCurrent={tab => {

                        setMonetizationTab(
                            tab
                        );

                        setExpandedMonetization(
                            null
                        );

                    }}
                />


                {filteredMonetization.length === 0 ? (

                    <div className="admin-empty-card">
                        No requests.
                    </div>

                ) : (

                    filteredMonetization.map(
                        request => {

                            const application =
                                request.application ||
                                {};

                            const payout =
                                request.payout ||
                                {};

                            const isExpanded =
                                expandedMonetization ===
                                request.id;


                            return (

                                <div
                                    className={`admin-request-card monetization-request-card ${
                                        isExpanded
                                            ? "expanded"
                                            : ""
                                    }`}
                                    key={request.id}
                                >


                                    {/* ==================================================
                                        SUMMARY
                                    ================================================== */}

                                    <div className="monetization-request-summary">


                                        {/* USER */}

                                        <div className="monetization-request-user">

                                            <div className="request-user-icon">

                                                <User
                                                    size={20}
                                                />

                                            </div>


                                            <div>

                                                <strong>
                                                    {
                                                        request.username ||
                                                        request.user?.username ||
                                                        "Unknown Creator"
                                                    }
                                                </strong>

                                                <p>
                                                    {
                                                        request.email ||
                                                        request.user?.email ||
                                                        "No email"
                                                    }
                                                </p>

                                            </div>

                                        </div>


                                        {/* SUMMARY INFORMATION */}

                                        <div className="monetization-summary-info">


                                            <div>

                                                <span>
                                                    Creator Type
                                                </span>

                                                <strong>
                                                    {formatValue(
                                                        application.creatorType
                                                    )}
                                                </strong>

                                            </div>


                                            <div>

                                                <span>
                                                    Payout
                                                </span>

                                                <strong>
                                                    {formatPayoutMethod(
                                                        payout.payoutMethod
                                                    )}
                                                </strong>

                                            </div>


                                            <div>

                                                <span>
                                                    Account Holder
                                                </span>

                                                <strong>
                                                    {formatValue(
                                                        payout.accountHolderName
                                                    )}
                                                </strong>

                                            </div>


                                            {/* STATUS */}

                                            <div>

                                                <span>
                                                    Status
                                                </span>

                                                <strong
                                                    className={`request-status ${request.status}`}
                                                >

                                                    <StatusIcon
                                                        status={
                                                            request.status
                                                        }
                                                    />

                                                    {formatValue(
                                                        request.status
                                                    )}

                                                </strong>

                                            </div>

                                        </div>


                                        {/* ACTIONS */}

                                        <div className="admin-request-actions">


                                            <button
                                                type="button"
                                                onClick={() =>
                                                    toggleMonetization(
                                                        request.id
                                                    )
                                                }
                                            >

                                                {isExpanded ? (
                                                    <>
                                                        <EyeOff
                                                            size={16}
                                                        />

                                                        Hide Details
                                                    </>
                                                ) : (
                                                    <>
                                                        <Eye
                                                            size={16}
                                                        />

                                                        View Details
                                                    </>
                                                )}

                                            </button>


                                            <button
                                                type="button"
                                                disabled={
                                                    actionLoading
                                                }
                                                onClick={() =>
                                                    handleApproval(
                                                        "monetization",
                                                        request.id,
                                                        "approved"
                                                    )
                                                }
                                            >
                                                Approve
                                            </button>


                                            <button
                                                type="button"
                                                disabled={
                                                    actionLoading
                                                }
                                                onClick={() =>
                                                    handleApproval(
                                                        "monetization",
                                                        request.id,
                                                        "rejected"
                                                    )
                                                }
                                            >
                                                Reject
                                            </button>

                                        </div>

                                    </div>


                                    {/* ==================================================
                                        FULL DETAILS
                                    ================================================== */}

                                    {isExpanded && (

                                        <MonetizationDetails
                                            request={
                                                request
                                            }
                                        />

                                    )}

                                </div>

                            );

                        }
                    )

                )}

            </section>


         {/* ==================================================
    WITHDRAW REQUESTS
================================================== */}

<section className="admin-panel">

    <div className="admin-panel-header">

        <h2>
            Withdraw Requests
        </h2>

        <Download />

    </div>


    <Tabs
        current={
            withdrawTab
        }
        setCurrent={
            tab => {

                setWithdrawTab(
                    tab
                );

                setExpandedWithdrawal(
                    null
                );

            }
        }
        withdraw
    />


    {filteredWithdraw.length === 0 ? (

        <div className="admin-empty-card">

            No requests.

        </div>

    ) : (

        filteredWithdraw.map(
            request => {

                const normalized =
                    normalizeWithdrawalRequest(
                        request
                    );

                const payout =
                    normalized.payout || {};

                const isExpanded =
                    expandedWithdrawal ===
                    request.id;

                const currency =
                    request.currency ||
                    request.wallet_currency ||
                    "USD";

                const amount =
                    Number(
                        request.amount || 0
                    );

                const status =
                    String(
                        request.status || "pending"
                    ).toLowerCase();

                const canProcess =
                    status === "pending";


                return (

                    <div
                        className={`admin-request-card withdrawal-request-card ${
                            isExpanded
                                ? "expanded"
                                : ""
                        }`}
                        key={request.id}
                    >

                        {/* ==================================================
                            SUMMARY
                        ================================================== */}

                        <div className="withdrawal-request-summary">


                            {/* USER */}

                            <div className="monetization-request-user">

                                <div className="request-user-icon">

                                    <User
                                        size={20}
                                    />

                                </div>


                                <div>

                                    <strong>
                                        {
                                            request.username ||
                                            request.user?.username ||
                                            "Unknown User"
                                        }
                                    </strong>

                                    <p>
                                        {
                                            request.email ||
                                            request.user?.email ||
                                            "No email"
                                        }
                                    </p>

                                </div>

                            </div>


                            {/* WITHDRAWAL SUMMARY */}

                            <div className="monetization-summary-info">


                                <div>

                                    <span>
                                        Amount
                                    </span>

                                    <strong>
                                        {currency}{" "}
                                        {amount.toLocaleString(
                                            "en-MW",
                                            {
                                                minimumFractionDigits: 2,
                                                maximumFractionDigits: 2,
                                            }
                                        )}
                                    </strong>

                                </div>


                                <div>

                                    <span>
                                        Payment Method
                                    </span>

                                    <strong>
                                        {
                                            formatPayoutMethod(
                                                payout.payoutMethod
                                            )
                                        }
                                    </strong>

                                </div>


                                <div>

                                    <span>
                                        Account Holder
                                    </span>

                                    <strong>
                                        {
                                            formatValue(
                                                payout.accountHolderName
                                            )
                                        }
                                    </strong>

                                </div>


                                <div>

                                    <span>
                                        Status
                                    </span>

                                    <strong
                                        className={`request-status ${status}`}
                                    >

                                        <StatusIcon
                                            status={
                                                status
                                            }
                                        />

                                        {formatValue(
                                            status
                                        )}

                                    </strong>

                                </div>

                            </div>


                            {/* ACTIONS */}

                            <div className="admin-request-actions">


                                <button
                                    type="button"
                                    onClick={() =>
                                        toggleWithdrawal(
                                            request.id
                                        )
                                    }
                                >

                                    {isExpanded ? (
                                        <>
                                            <EyeOff
                                                size={16}
                                            />

                                            Hide Details
                                        </>
                                    ) : (
                                        <>
                                            <Eye
                                                size={16}
                                            />

                                            View Details
                                        </>
                                    )}

                                </button>


                                {canProcess && (

                                    <>

                                        <button
                                            type="button"
                                            disabled={
                                                actionLoading
                                            }
                                            onClick={() =>
                                              handleApproval(
                                        "withdraw",
                                        request.id,
                                        "approved"
                                    )
                                            }
                                        >
                                            Pay
                                        </button>


                                        <button
                                            type="button"
                                            disabled={
                                                actionLoading
                                            }
                                            onClick={() => {

                                                const reason =
                                                    window.prompt(
                                                        "Reason for rejecting this withdrawal:"
                                                    );

                                                if (
                                                    reason ===
                                                    null
                                                ) {
                                                    return;
                                                }

                                                handleApproval(
                                                    "withdraw",
                                                    request.id,
                                                    "rejected",
                                                    reason.trim() ||
                                                    null
                                                );

                                            }}
                                        >
                                            Reject
                                        </button>

                                    </>

                                )}

                            </div>

                        </div>


                        {/* ==================================================
                            FULL DETAILS
                        ================================================== */}

                        {isExpanded && (

                            <WithdrawalDetails
                                request={
                                    request
                                }
                            />

                        )}

                    </div>

                );

            }
        )

    )}

</section>


            {/* ==================================================
                IMAGE PREVIEW
            ================================================== */}

            {previewImage && (

                <div
                    className="image-preview-overlay"
                    onClick={() =>
                        setPreviewImage("")
                    }
                >

                    <img
                        src={previewImage}
                        alt="Payment proof preview"
                        className="image-preview"
                        onClick={event =>
                            event.stopPropagation()
                        }
                    />

                </div>

            )}

        </main>

    );
}


export default AdminRequests;