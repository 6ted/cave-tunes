
// ======================================================
// CAVE TUNES EMAIL OTP SERVICE
// services/authOtpService.js
// ======================================================

const crypto = require("crypto");
const db = require("../config/database");

const {
    sendNotificationEmail
} = require("./emailService");

// Use a dedicated OTP secret.
// Do not reuse JWT_SECRET.
const OTP_SECRET = process.env.OTP_SECRET;

const OTP_EXPIRY_MINUTES = 5;
const OTP_MAX_ATTEMPTS = 5;
const OTP_RESEND_COOLDOWN_SECONDS = 60;
const OTP_MAX_RESENDS = 5;

const ALLOWED_PURPOSES = [
    "registration",
    "login",
    "google_login"
];

// ------------------------------------------------------
// HASH HELPERS
// ------------------------------------------------------

function hashChallenge(token) {
    return crypto
        .createHash("sha256")
        .update(token)
        .digest("hex");
}

function hashCode(code) {
    if (!OTP_SECRET || OTP_SECRET.length < 32) {
        throw new Error(
            "A dedicated OTP_SECRET of at least 32 characters must be configured."
        );
    }

    return crypto
        .createHmac("sha256", OTP_SECRET)
        .update(code)
        .digest("hex");
}

function generateCode() {
    return crypto
        .randomInt(0, 1000000)
        .toString()
        .padStart(6, "0");
}

function safeCompare(a, b) {
    const first = Buffer.from(a, "hex");
    const second = Buffer.from(b, "hex");

    return (
        first.length === second.length &&
        first.length === 32 &&
        crypto.timingSafeEqual(first, second)
    );
}

function isValidChallengeToken(token) {
    return (
        typeof token === "string" &&
        /^[a-f0-9]{64}$/i.test(token)
    );
}

// ------------------------------------------------------
// SEND OTP EMAIL
// ------------------------------------------------------

async function sendCodeEmail(email, code, purpose) {
    let purposeText;

    if (purpose === "registration") {
        purposeText = "complete your Cave Tunes registration";
    } else {
        purposeText = "sign in to your Cave Tunes account";
    }

    await sendNotificationEmail({
        to: email,
        title: "Your Cave Tunes verification code",
        message:
            `Your verification code is ${code}. ` +
            `Use this code to ${purposeText}. ` +
            `It expires in ${OTP_EXPIRY_MINUTES} minutes. ` +
            `If you did not request this code, you can ignore this email.`
    });
}

// ------------------------------------------------------
// CREATE OTP CHALLENGE
// ------------------------------------------------------

async function createOtpChallenge(user, purpose) {
    if (
        !user ||
        !user.id ||
        !user.email
    ) {
        throw new Error(
            "A valid user is required to create an OTP challenge."
        );
    }

    if (!ALLOWED_PURPOSES.includes(purpose)) {
        throw new Error("Invalid OTP purpose.");
    }

    const challengeToken =
        crypto.randomBytes(32).toString("hex");

    const code = generateCode();

    const challengeHash =
        hashChallenge(challengeToken);

    const codeHash =
        hashCode(code);

    // Invalidate previous unused challenges
    // for this user and verification purpose.
    await db.query(
        `
        UPDATE auth_email_otps
        SET used_at = NOW()
        WHERE user_id = $1
          AND purpose = $2
          AND used_at IS NULL
        `,
        [user.id, purpose]
    );

    await db.query(
        `
        INSERT INTO auth_email_otps
        (
            user_id,
            challenge_hash,
            code_hash,
            purpose,
            expires_at,
            last_sent_at
        )
        VALUES
        (
            $1,
            $2,
            $3,
            $4,
            NOW() + ($5 * INTERVAL '1 minute'),
            NOW()
        )
        `,
        [
            user.id,
            challengeHash,
            codeHash,
            purpose,
            OTP_EXPIRY_MINUTES
        ]
    );

    try {
        await sendCodeEmail(
            user.email,
            code,
            purpose
        );
    } catch (error) {
        // Prevent use of a challenge whose email
        // could not be delivered.
        await db.query(
            `
            UPDATE auth_email_otps
            SET used_at = NOW()
            WHERE challenge_hash = $1
              AND used_at IS NULL
            `,
            [challengeHash]
        );

        throw error;
    }

    return {
        challengeToken,
        email: user.email
    };
}

// ------------------------------------------------------
// VERIFY OTP
// ------------------------------------------------------

async function verifyOtpChallenge(
    challengeToken,
    submittedCode
) {
    if (
        !isValidChallengeToken(challengeToken) ||
        typeof submittedCode !== "string" ||
        !/^\d{6}$/.test(submittedCode)
    ) {
        return {
            success: false,
            message: "Invalid or expired verification code."
        };
    }

    const challengeHash =
        hashChallenge(challengeToken);

    // Atomically consume one attempt.
    const result = await db.query(
        `
        UPDATE auth_email_otps
        SET attempts = attempts + 1
        WHERE challenge_hash = $1
          AND used_at IS NULL
          AND expires_at > NOW()
          AND attempts < $2
        RETURNING
            id,
            user_id,
            code_hash,
            purpose
        `,
        [
            challengeHash,
            OTP_MAX_ATTEMPTS
        ]
    );

    if (result.rows.length === 0) {
        return {
            success: false,
            message: "Invalid or expired verification code."
        };
    }

    const record = result.rows[0];

    const submittedHash =
        hashCode(submittedCode);

    if (
        !safeCompare(
            record.code_hash.trim(),
            submittedHash
        )
    ) {
        return {
            success: false,
            message: "Incorrect verification code."
        };
    }

    // Only one simultaneous request can successfully
    // mark this challenge as used.
    const usedResult = await db.query(
        `
        UPDATE auth_email_otps
        SET used_at = NOW()
        WHERE id = $1
          AND used_at IS NULL
          AND expires_at > NOW()
        RETURNING user_id
        `,
        [record.id]
    );

    if (usedResult.rows.length === 0) {
        return {
            success: false,
            message: "This verification code has already been used or has expired."
        };
    }

    return {
        success: true,
        userId: usedResult.rows[0].user_id,
        purpose: record.purpose
    };
}

// ------------------------------------------------------
// RESEND OTP
// ------------------------------------------------------

async function resendOtpChallenge(challengeToken) {
    if (!isValidChallengeToken(challengeToken)) {
        return {
            success: false,
            message: "Invalid verification request."
        };
    }

    const challengeHash =
        hashChallenge(challengeToken);

    const code = generateCode();

    const codeHash = hashCode(code);

    // Important:
    // The cooldown, expiry, resend limit and update
    // are checked together in one atomic SQL operation.
    //
    // This prevents simultaneous requests from bypassing
    // the resend cooldown.
    const update = await db.query(
        `
        UPDATE auth_email_otps AS o
        SET
            code_hash = $1,
            expires_at = NOW() + ($2 * INTERVAL '1 minute'),
            last_sent_at = NOW(),
            resend_count = resend_count + 1,
            attempts = 0
        FROM users AS u
        WHERE o.challenge_hash = $3
          AND o.user_id = u.id
          AND o.used_at IS NULL
          AND o.expires_at > NOW()
          AND o.resend_count < $4
          AND o.last_sent_at <=
              NOW() - ($5 * INTERVAL '1 second')
        RETURNING
            o.id,
            o.purpose,
            u.email
        `,
        [
            codeHash,
            OTP_EXPIRY_MINUTES,
            challengeHash,
            OTP_MAX_RESENDS,
            OTP_RESEND_COOLDOWN_SECONDS
        ]
    );

    if (update.rows.length === 0) {
        // Find out why the atomic update was rejected.
        const check = await db.query(
            `
            SELECT
                resend_count,
                expires_at,
                last_sent_at,
                used_at
            FROM auth_email_otps
            WHERE challenge_hash = $1
            LIMIT 1
            `,
            [challengeHash]
        );

        if (
            check.rows.length === 0 ||
            check.rows[0].used_at ||
            new Date(check.rows[0].expires_at) <= new Date()
        ) {
            return {
                success: false,
                message: "This verification request has expired. Please sign in again."
            };
        }

        const record = check.rows[0];

        if (
            Number(record.resend_count) >= OTP_MAX_RESENDS
        ) {
            return {
                success: false,
                message: "You have reached the maximum number of resend requests."
            };
        }

        const secondsSince = Math.floor(
            (Date.now() - new Date(record.last_sent_at).getTime()) / 1000
        );

        const waitSeconds = Math.max(
            1,
            OTP_RESEND_COOLDOWN_SECONDS - secondsSince
        );

        return {
            success: false,
            message: `Please wait ${waitSeconds} seconds before requesting another code.`
        };
    }

    const record = update.rows[0];

    try {
        await sendCodeEmail(
            record.email,
            code,
            record.purpose
        );
    } catch (error) {
        console.error(
            "OTP RESEND EMAIL ERROR:",
            error.message
        );

        // Keep the challenge active.
        // The next resend can be attempted after
        // the cooldown. The undelivered code is not
        // exposed to the user.
        return {
            success: false,
            message: "Unable to send the verification email. Please try again after the resend cooldown."
        };
    }

    return {
        success: true,
        message: "A new verification code has been sent to your email."
    };
}

// ------------------------------------------------------
// EXPORTS
// ------------------------------------------------------

module.exports = {
    createOtpChallenge,
    verifyOtpChallenge,
    resendOtpChallenge
};
