// ============================================================
// CAVE TUNES
// PAYCHANGU PAYMENT SERVICE
//
// Supports:
// 1. Premium subscriptions
// 2. Creator verification payments
//
// All payments must be verified directly with PayChangu.
// ============================================================

const PAYCHANGU_API_URL = "https://api.paychangu.com";


// ============================================================
// ENVIRONMENT HELPERS
// ============================================================

function getSecretKey() {
    const secretKey = process.env.PAYCHANGU_SECRET_KEY;

    if (!secretKey) {
        throw new Error("PAYCHANGU_SECRET_KEY is not configured.");
    }

    return secretKey;
}


function getCallbackUrl() {
    const url = process.env.PAYCHANGU_CALLBACK_URL;

    if (!url) {
        throw new Error("PAYCHANGU_CALLBACK_URL is not configured.");
    }

    return url;
}


function getReturnUrl() {
    const url = process.env.PAYCHANGU_RETURN_URL;

    if (!url) {
        throw new Error("PAYCHANGU_RETURN_URL is not configured.");
    }

    return url;
}


function getVerificationCallbackUrl() {
    const url = process.env.PAYCHANGU_VERIFICATION_CALLBACK_URL;

    if (!url) {
        throw new Error(
            "PAYCHANGU_VERIFICATION_CALLBACK_URL is not configured."
        );
    }

    return url;
}


function getVerificationReturnUrl() {
    const url = process.env.PAYCHANGU_VERIFICATION_RETURN_URL;

    if (!url) {
        throw new Error(
            "PAYCHANGU_VERIFICATION_RETURN_URL is not configured."
        );
    }

    return url;
}


// ============================================================
// TRANSACTION REFERENCES
// ============================================================

function generateTransactionReference(paymentId) {
    if (!paymentId) {
        throw new Error("Payment ID is required.");
    }

    return `CT-PREMIUM-${paymentId}-${Date.now()}`;
}


function generateVerificationTransactionReference(userId) {
    if (!userId) {
        throw new Error("User ID is required.");
    }

    const uniquePart =
        require("crypto").randomBytes(6).toString("hex");

    return `CT-VERIFY-${userId}-${Date.now()}-${uniquePart}`;
}


// ============================================================
// INTERNAL PAYCHANGU CHECKOUT REQUEST
// ============================================================

async function requestCheckout(payload) {

    const response = await fetch(
        `${PAYCHANGU_API_URL}/payment`,
        {
            method: "POST",

            headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
                Authorization: `Bearer ${getSecretKey()}`,
            },

            body: JSON.stringify(payload),
        }
    );

    let data;

    try {
        data = await response.json();
    } catch {
        throw new Error(
            `PayChangu returned an invalid response. HTTP ${response.status}.`
        );
    }

    if (!response.ok) {
        console.error("PayChangu checkout failed:", {
            httpStatus: response.status,
            providerMessage: data?.message,
        });

        throw new Error(
            data?.message ||
            `PayChangu checkout failed. HTTP ${response.status}.`
        );
    }

    if (
        data?.status !== "success" ||
        typeof data?.data?.checkout_url !== "string" ||
        !data.data.checkout_url
    ) {
        throw new Error(
            "PayChangu did not return a valid checkout URL."
        );
    }

    return {
        checkoutUrl: data.data.checkout_url,
        status: data.status,
        message: data.message,
    };
}


// ============================================================
// PREMIUM CHECKOUT
// ============================================================

async function createCheckout({
    payment,
    subscription,
    plan,
    user,
}) {

    if (!payment?.id || !subscription?.id || !plan?.id) {
        throw new Error("Valid Premium payment records are required.");
    }

    if (
        Number(payment.subscription_id) !== Number(subscription.id) ||
        Number(payment.plan_id) !== Number(plan.id) ||
        Number(subscription.plan_id) !== Number(plan.id)
    ) {
        throw new Error(
            "Payment, subscription, and plan do not match."
        );
    }

    if (
        payment.status !== "pending" ||
        subscription.status !== "pending"
    ) {
        throw new Error(
            "Only pending Premium payments can start checkout."
        );
    }

    const amount = Number(payment.amount_mwk);
    const planAmount = Number(plan.price_mwk);

    if (
        !Number.isSafeInteger(amount) ||
        amount <= 0 ||
        amount !== planAmount
    ) {
        throw new Error(
            "Payment amount does not match the Premium plan price."
        );
    }

    if (String(payment.currency).toUpperCase() !== "MWK") {
        throw new Error("Premium payments must use MWK.");
    }

    const email = String(user?.email || "").trim();

    if (!email) {
        throw new Error("Customer email is required.");
    }

    const username = String(
        user?.username || "Cave Tunes User"
    ).trim();

    const nameParts = username.split(/\s+/).filter(Boolean);

    const txRef = generateTransactionReference(payment.id);

    const checkout = await requestCheckout({

        amount: String(amount),

        currency: "MWK",

        email,

        first_name: nameParts[0] || "Cave",

        last_name: nameParts.slice(1).join(" ") || "Tunes",

        tx_ref: txRef,

        callback_url: getCallbackUrl(),

        return_url: getReturnUrl(),

        customization: {
            title: "Cave Tunes Premium",
            description: `${plan.name} Premium subscription`,
        },

        meta: {
            source: "cave-tunes",
            payment_id: String(payment.id),
            subscription_id: String(subscription.id),
            plan_id: String(plan.id),
            plan_slug: plan.slug,
        },

    });

    return {
        txRef,
        ...checkout,
    };
}


// ============================================================
// CREATOR VERIFICATION CHECKOUT
// ============================================================

async function createVerificationCheckout({
    payment,
    user,
    txRef,
}) {

    if (!payment?.id) {
        throw new Error(
            "A valid creator verification payment is required."
        );
    }

    if (!user?.id || !user?.email) {
        throw new Error(
            "Valid customer information is required."
        );
    }

    if (
        Number(payment.user_id) !== Number(user.id)
    ) {
        throw new Error(
            "Payment does not belong to this user."
        );
    }

    if (
        Number(payment.amount_mwk) !== 50 ||
        payment.currency !== "MWK"
    ) {
        throw new Error(
            "Creator verification fee must be MWK 50."
        );
    }

    if (payment.status !== "pending") {
        throw new Error(
            "Only pending verification payments can start checkout."
        );
    }

    if (!txRef) {
        throw new Error(
            "Creator verification transaction reference is required."
        );
    }

    const username = String(
        user.username || "Cave Tunes User"
    ).trim();

    const nameParts = username.split(/\s+/).filter(Boolean);

    const checkout = await requestCheckout({

        amount: "50",

        currency: "MWK",

        email: user.email,

        first_name: nameParts[0] || "Cave",

        last_name: nameParts.slice(1).join(" ") || "Tunes",

        tx_ref: txRef,

        callback_url: getVerificationCallbackUrl(),

        return_url: getVerificationReturnUrl(),

        customization: {
            title: "Cave Tunes Creator Verification",
            description: "Creator verification application fee",
        },

        meta: {
            source: "cave-tunes",
            payment_type: "creator_verification",
            payment_id: String(payment.id),
            user_id: String(user.id),
        },

    });

    return {
        txRef,
        ...checkout,
    };
}


// ============================================================
// VERIFY TRANSACTION DIRECTLY WITH PAYCHANGU
// ============================================================

async function verifyTransaction(txRef) {

    if (
        typeof txRef !== "string" ||
        !txRef.trim()
    ) {
        throw new Error(
            "PayChangu transaction reference is required."
        );
    }

    const response = await fetch(
        `${PAYCHANGU_API_URL}/verify-payment/${encodeURIComponent(txRef)}`,
        {
            method: "GET",

            headers: {
                Accept: "application/json",
                Authorization: `Bearer ${getSecretKey()}`,
            },
        }
    );

    let data;

    try {
        data = await response.json();
    } catch {
        throw new Error(
            `PayChangu verification returned an invalid response. HTTP ${response.status}.`
        );
    }

    if (!response.ok) {
        console.error("PayChangu verification failed:", {
            httpStatus: response.status,
            providerMessage: data?.message,
        });

        throw new Error(
            data?.message ||
            `PayChangu verification failed. HTTP ${response.status}.`
        );
    }

    return data;
}


// ============================================================
// VALIDATE VERIFIED PAYMENT
// ============================================================

function validateVerifiedPayment({
    verification,
    expectedTxRef,
    expectedAmount,
    expectedCurrency = "MWK",
}) {

    const transaction = verification?.data;

    if (!transaction || typeof transaction !== "object") {
        return {
            valid: false,
            reason: "PayChangu verification data is missing.",
        };
    }

    const actualTxRef = transaction.tx_ref;

    const actualStatus = String(
        transaction.status || ""
    ).trim().toLowerCase();

    const actualCurrency = String(
        transaction.currency || ""
    ).trim().toUpperCase();

    const actualAmount = Number(transaction.amount);
    const expected = Number(expectedAmount);

    const normalizedCurrency = String(
        expectedCurrency
    ).trim().toUpperCase();

    if (!expectedTxRef) {
        return {
            valid: false,
            reason: "Expected transaction reference is missing.",
        };
    }

    if (
        !Number.isSafeInteger(expected) ||
        expected <= 0
    ) {
        return {
            valid: false,
            reason: "Expected payment amount is invalid.",
        };
    }

    if (actualTxRef !== expectedTxRef) {
        return {
            valid: false,
            reason: "Transaction reference does not match.",
        };
    }

    if (actualStatus !== "success") {
        return {
            valid: false,
            reason: "Payment has not been confirmed as successful.",
        };
    }

    if (actualCurrency !== normalizedCurrency) {
        return {
            valid: false,
            reason: "Payment currency does not match.",
        };
    }

    if (
        !Number.isSafeInteger(actualAmount) ||
        actualAmount !== expected
    ) {
        return {
            valid: false,
            reason: "Payment amount does not exactly match.",
        };
    }

    return {
        valid: true,
        transaction,
    };
}


// ============================================================
// EXPORTS
// ============================================================

module.exports = {

    createCheckout,

    createVerificationCheckout,

    verifyTransaction,

    validateVerifiedPayment,

    generateTransactionReference,

    generateVerificationTransactionReference,

    getVerificationReturnUrl,

};