
// ======================================================
// CAVE TUNES AUTH CONTROLLER
// controllers/authController.js
//
// Production-ready authentication, profiles, creators,
// followers and account management.
//
// Compatible with:
// - authRoutes.js
// - JWT authentication
// - Google OAuth / Passport
// - PostgreSQL
// - React Cave Tunes frontend
//
// IMPORTANT:
// - users.is_admin is NEVER controlled by normal users.
// - users.role may be changed only to approved creator roles.
// - Followers use users.id directly:
//      followers.artist_id
//      followers.follower_id
// ======================================================

const bcrypt = require("bcrypt");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const db = require("../config/database");
const {
    createNotification,
} = require("../services/notificationService");

const {
    createOtpChallenge,
    verifyOtpChallenge,
    resendOtpChallenge,
} = require("../services/authOtpService");
// ======================================================
// CONSTANTS
// ======================================================

const FRONTEND_URL =
    process.env.FRONTEND_URL ||
    "http://localhost:5173";

const JWT_EXPIRES_IN =
    process.env.JWT_EXPIRES_IN ||
    "7d";

// Roles users are allowed to have.
const ALLOWED_ROLES = [
    "listener",
    "artist",
    "producer",
    "dj",
    "record_label",
    "podcaster"
];

// Roles that can appear in the creator directory.
const CREATOR_ROLES = [
    "artist",
    "producer",
    "dj",
    "record_label",
    "podcaster"
];

// ======================================================
// HELPERS
// ======================================================

// ------------------------------------------------------
// Normalize text
// ------------------------------------------------------

function cleanText(value, fallback = "") {

    if (
        value === undefined ||
        value === null
    ) {
        return fallback;
    }

    return String(value).trim();
}

// ------------------------------------------------------
// Normalize email
// ------------------------------------------------------

function cleanEmail(value) {

    return cleanText(value)
        .toLowerCase();
}

// ------------------------------------------------------
// Convert database boolean safely
// ------------------------------------------------------

function booleanValue(value) {
    if (value === true || value === 1) {
        return true;
    }

    if (value === false || value === 0 || value === null || value === undefined) {
        return false;
    }

    return ["true", "t", "1"].includes(
        String(value).trim().toLowerCase()
    );
}

// ------------------------------------------------------
// Validate positive integer
// ------------------------------------------------------

function isValidId(value) {

    return (
        Number.isInteger(value) &&
        value > 0
    );
}

// ------------------------------------------------------
// Create JWT
// ------------------------------------------------------
function createToken(user, adminSessionId = null) {
    if (!process.env.JWT_SECRET) {
        throw new Error("JWT_SECRET is not configured.");
    }

    const isAdmin = booleanValue(user.is_admin);

    const payload = {
        id: user.id,
        username: user.username || null,
        email: user.email || null,
        role: user.role || "listener",
        isAdmin,
        otpVerified: true
    };

    // Only administrator tokens receive an admin session ID.
    if (isAdmin && adminSessionId) {
        payload.adminSessionId = adminSessionId;
    }

    return jwt.sign(
        payload,
        process.env.JWT_SECRET,
        {
            expiresIn: isAdmin ? "8h" : JWT_EXPIRES_IN
        }
    );
}

// ------------------------------------------------------
// VERIFICATION LEVEL
//
// Master = verified + monetized
// Verified = verified only
// None = not verified
// ------------------------------------------------------
function getVerificationLevel(user) {
    const verified = booleanValue(user?.verified);
    const monetized = booleanValue(user?.monetized);

    if (verified && monetized) {
        return "master";
    }

    if (verified) {
        return "verified";
    }

    return "none";
}
// ----------------sanitizer-----------------------------//

function sanitizeUser(user) {
    if (!user) return null;

    const safeUser = {
        id: user.id,
        username: user.username || null,
        email: user.email || null,
        role: user.role || "listener",

        is_admin: Boolean(user.is_admin),
        monetized: Boolean(user.monetized),
        verified: Boolean(user.verified),
profile_completed: booleanValue(user.profile_completed),
        // none | verified | master
        verification_level: getVerificationLevel(user),

        country: user.country || null,
        bio: user.bio || "",
        social_links: Array.isArray(user.social_links)
    ? user.social_links
    : [],
        phone: user.phone || null,
        profile_image_url: user.profile_image_url || null,
        created_at: user.created_at || null
    };

    if (user.songs !== undefined) {
        safeUser.songs = Number(user.songs) || 0;
    }

    if (user.playlists !== undefined) {
        safeUser.playlists = Number(user.playlists) || 0;
    }

    if (user.followers !== undefined) {
        safeUser.followers = Number(user.followers) || 0;
    }

    return safeUser;
}
// ------------------------------------------------------
// Optional JWT user
//
// Public creator pages can load without authentication.
// If a valid token exists, req.userId is populated.
// ------------------------------------------------------

function getOptionalUserId(req) {

    try {

        const authHeader =
            req.headers.authorization;

        if (
            !authHeader ||
            !authHeader.startsWith("Bearer ")
        ) {

            return null;
        }

        const token =
            authHeader
                .substring(7)
                .trim();

        if (!token) {
            return null;
        }

        if (!process.env.JWT_SECRET) {
            return null;
        }

        const decoded =
            jwt.verify(
                token,
                process.env.JWT_SECRET
            );

      // Only accept tokens issued after successful OTP verification.
if (decoded.otpVerified !== true) {
    return null;
}

const userId = Number(decoded.id);

if (!isValidId(userId)) {
    return null;
}

        return userId;

    }

    catch (error) {

        return null;
    }
}

// ------------------------------------------------------
// Safe creator role check
// ------------------------------------------------------

function isCreatorRole(role) {

    return CREATOR_ROLES.includes(
        String(role || "")
            .trim()
            .toLowerCase()
    );
}

// ======================================================
// REGISTER
// ======================================================

exports.register = async (req, res) => {

    try {

        const username =
            cleanText(req.body.username);

        const email =
            cleanEmail(req.body.email);

        const password =
            cleanText(req.body.password);

        const requestedRole =
            cleanText(
                req.body.role,
                "listener"
            ).toLowerCase();

        // ------------------------------------------------
        // Validation
        // ------------------------------------------------

        if (
            !username ||
            !email ||
            !password
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Username, email and password are required."

            });

        }

        if (username.length < 2) {

            return res.status(400).json({

                success: false,

                message:
                    "Username must contain at least 2 characters."

            });

        }

        if (username.length > 50) {

            return res.status(400).json({

                success: false,

                message:
                    "Username cannot exceed 50 characters."

            });

        }

        if (password.length < 6) {

            return res.status(400).json({

                success: false,

                message:
                    "Password must be at least 6 characters."

            });

        }

        // ------------------------------------------------
        // Safe role
        // ------------------------------------------------

        const safeRole =
            ALLOWED_ROLES.includes(
                requestedRole
            )
                ? requestedRole
                : "listener";

        // ------------------------------------------------
        // Check username
        // ------------------------------------------------

        const usernameResult =
            await db.query(

                `
                SELECT id
                FROM users
                WHERE LOWER(username) = LOWER($1)
                LIMIT 1
                `,

                [username]

            );

        if (
            usernameResult.rows.length > 0
        ) {

            return res.status(409).json({

                success: false,

                message:
                    "Username is already taken."

            });

        }

        // ------------------------------------------------
        // Check email
        // ------------------------------------------------

        const emailResult =
            await db.query(

                `
                SELECT id
                FROM users
                WHERE LOWER(email) = LOWER($1)
                LIMIT 1
                `,

                [email]

            );

        if (
            emailResult.rows.length > 0
        ) {

            return res.status(409).json({

                success: false,

                message:
                    "Email is already registered."

            });

        }

        // ------------------------------------------------
        // Hash password
        // ------------------------------------------------

        const passwordHash =
            await bcrypt.hash(
                password,
                12
            );

        // ------------------------------------------------
        // Create account
        //
        // is_admin is ALWAYS FALSE here.
        // ------------------------------------------------

        const result =
            await db.query(

                `
                INSERT INTO users
                (
                    username,
                    email,
                    password,
                    role,
                    is_admin
                )

                VALUES
                (
                    $1,
                    $2,
                    $3,
                    $4,
                    FALSE
                )

                RETURNING
                    id,
                    username,
                    email,
                    role,
                    is_admin,
                    country,
                    phone,
                    profile_image_url,
                    verified,
                     monetized,
                    created_at
                `,

                [
                    username,
                    email,
                    passwordHash,
                    safeRole
                ]

            );

        const user =
            result.rows[0];

        user.is_admin =
            booleanValue(
                user.is_admin
            );

     const challenge = await createOtpChallenge(
    user,
    "registration"
);

return res.status(201).json({
    success: true,
    requiresOtp: true,
    challengeToken: challenge.challengeToken,
    email: challenge.email,
    message: "Account created. Please verify your email using the OTP we sent."
});

    }

    catch (error) {

        console.error(
            "REGISTER ERROR:",
            error
        );

        // PostgreSQL unique violation
        if (error.code === "23505") {

            return res.status(409).json({

                success: false,

                message:
                    "Username or email is already registered."

            });

        }

        return res.status(500).json({

            success: false,

            message:
                "Registration failed."

        });


    }
};

// ======================================================
// LOGIN
// ======================================================

exports.login = async (req, res) => {

    try {

        const email =
            cleanEmail(
                req.body.email
            );

        const password =
            cleanText(
                req.body.password
            );

        if (
            !email ||
            !password
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Email and password are required."

            });

        }

        const result =
            await db.query(

                `
            SELECT
    id,
    username,
    email,
    password,
    role,
    is_admin,
    country,
    phone,
    profile_image_url,
    verified,
    monetized,
    profile_completed,
    created_at
FROM users
WHERE LOWER(email) = LOWER($1)
LIMIT 1
                `,

                [email]

            );

        if (
            result.rows.length === 0
        ) {

            return res.status(401).json({

                success: false,

                message:
                    "Invalid login details."

            });

        }

        const user =
            result.rows[0];

        // Google-only account
        if (!user.password) {

            return res.status(400).json({

                success: false,

                message:
                    "This account uses Google login. Please continue with Google."

            });

        }

        const passwordMatches =
            await bcrypt.compare(

                password,

                user.password

            );

        if (!passwordMatches) {

            return res.status(401).json({

                success: false,

                message:
                    "Invalid login details."

            });

        }

        // Never return password hash.
// Never return the password hash.
delete user.password;

user.is_admin = booleanValue(user.is_admin);

// Send OTP for every login, including administrators.
const challenge = await createOtpChallenge(
    user,
    "login"
);

return res.json({
    success: true,
    requiresOtp: true,
    challengeToken: challenge.challengeToken,
    email: challenge.email,
    message: "Please verify your email to complete login."
});

    }

    catch (error) {

        console.error(
            "LOGIN ERROR:",
            error
        );

        return res.status(500).json({

            success: false,

            message:
                "Login failed."

        });

    }
};

// ======================================================
// VERIFY EMAIL OTP
// POST /api/auth/verify-otp
// ======================================================

exports.verifyOtp = async (req, res) => {
    try {
        const challengeToken = cleanText(req.body.challengeToken);
        const code = cleanText(req.body.code);

        if (!challengeToken || !code) {
            return res.status(400).json({
                success: false,
                message: "Verification challenge and OTP code are required."
            });
        }

        const verification = await verifyOtpChallenge(
            challengeToken,
            code
        );

        if (!verification.success) {
            return res.status(400).json({
                success: false,
                message: verification.message || "Invalid or expired OTP."
            });
        }
// Accept only valid OTP challenges created for our
// three supported authentication purposes.
const allowedPurposes = [
    "registration",
    "login",
    "google_login"
];

if (
    !isValidId(Number(verification.userId)) ||
    !allowedPurposes.includes(verification.purpose)
) {
    return res.status(400).json({
        success: false,
        message: "Invalid verification challenge."
    });
}
        // Always reload the user from the database.
        // Never trust role or admin status from the browser.
        const result = await db.query(
            `
            SELECT
                id,
                username,
                email,
                role,
                is_admin,
                country,
                bio,
                phone,
                profile_image_url,
                verified,
                monetized,
                 profile_completed,
                created_at
            FROM users
            WHERE id = $1
            LIMIT 1
            `,
            [verification.userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Account could not be found."
            });
        }

        const user = result.rows[0];
        user.is_admin = booleanValue(user.is_admin);

        // This is the only authentication flow that issues the JWT.
       // ==================================================
// CREATE ADMIN SESSION WHEN USER IS AN ADMIN
// ==================================================

let adminSessionId = null;

if (booleanValue(user.is_admin)) {

    const sessionResult = await db.query(
        `
        INSERT INTO admin_sessions
        (
            user_id,
            expires_at,
            ip_address,
            user_agent
        )
        VALUES
        (
            $1,
            NOW() + INTERVAL '8 hours',
            $2,
            $3
        )
        RETURNING session_id
        `,
        [
            user.id,
            req.ip || null,
            req.get("user-agent") || null
        ]
    );

    adminSessionId =
        sessionResult.rows[0].session_id;
}

// ==================================================
// ISSUE JWT
// ==================================================

const token = createToken(
    user,
    adminSessionId
);

     return res.json({
    success: true,
    message: "Email verified. You are now logged in.",

    token,

    requiresProfileCompletion:
        !booleanValue(user.profile_completed),

    user: {
        ...sanitizeUser(user),
        profile_completed:
            booleanValue(user.profile_completed)
    }
}); 

    } catch (error) {
        console.error("OTP VERIFICATION ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to verify OTP."
        });
    }
};


// ======================================================
// RESEND EMAIL OTP
// POST /api/auth/resend-otp
// ======================================================

exports.resendOtp = async (req, res) => {
    try {
        const challengeToken = cleanText(req.body.challengeToken);

        if (!challengeToken) {
            return res.status(400).json({
                success: false,
                message: "Verification challenge is required."
            });
        }

        const result = await resendOtpChallenge(challengeToken);

        return res.json({
            success: true,
            message: result.message || "A new OTP has been sent."
        });

    } catch (error) {
        console.error("OTP RESEND ERROR:", error);

        return res.status(400).json({
            success: false,
            message: error.message || "Unable to resend OTP."
        });
    }
};

// ======================================================
// GET CURRENT USER
// GET /api/auth/me
// ======================================================

exports.me = async (req, res) => {

    try {

        const userId =
            Number(req.userId);

        if (!isValidId(userId)) {

            return res.status(401).json({

                success: false,

                message:
                    "Unauthorized."

            });

        }

        // ------------------------------------------------
        // USER
        // ------------------------------------------------

        const userResult =
            await db.query(

                `
                SELECT
                    id,
                    username,
                    email,
                    role,
                    is_admin,
                    country,
                      bio,
                    phone,
                    profile_image_url,
                    verified,
                     monetized,
                     profile_completed,
                    created_at
                FROM users
                WHERE id = $1
                LIMIT 1
                `,

                [userId]

            );

        if (
            userResult.rows.length === 0
        ) {

            return res.status(404).json({

                success: false,

                message:
                    "User not found."

            });

        }

        const user =
            userResult.rows[0];

        // ------------------------------------------------
        // SONG COUNT
        // ------------------------------------------------

        let songs = 0;

        try {

            const result =
                await db.query(

                    `
                    SELECT COUNT(*) AS total
                    FROM songs
                    WHERE user_id = $1
                    `,

                    [userId]

                );

            songs =
                Number(
                    result.rows[0]?.total
                ) || 0;

        }

        catch (error) {

            console.error(
                "ME SONG COUNT ERROR:",
                error.message
            );

        }

        // ------------------------------------------------
        // PLAYLIST COUNT
        // ------------------------------------------------

        let playlists = 0;

        try {

            const result =
                await db.query(

                    `
                    SELECT COUNT(*) AS total
                    FROM playlists
                    WHERE user_id = $1
                    `,

                    [userId]

                );

            playlists =
                Number(
                    result.rows[0]?.total
                ) || 0;

        }

        catch (error) {

            console.error(
                "ME PLAYLIST COUNT ERROR:",
                error.message
            );

        }

        // ------------------------------------------------
        // FOLLOWER COUNT
        //
        // followers.artist_id = users.id
        // ------------------------------------------------

        let followers = 0;

        try {

            const result =
                await db.query(

                    `
                    SELECT COUNT(*) AS total
                    FROM followers
                    WHERE artist_id = $1
                    `,

                    [userId]

                );

            followers =
                Number(
                    result.rows[0]?.total
                ) || 0;

        }

        catch (error) {

            console.error(
                "ME FOLLOWER COUNT ERROR:",
                error.message
            );

        }

// ------------------------------------------------
// SOCIAL MEDIA LINKS
// ------------------------------------------------

let socialLinks = [];

try {
    const socialResult = await db.query(
        `
        SELECT platform, url
        FROM user_social_links
        WHERE user_id = $1
        ORDER BY platform ASC
        `,
        [userId]
    );

    socialLinks = socialResult.rows;

} catch (error) {
    console.error(
        "ME SOCIAL LINKS ERROR:",
        error.message
    );
}

        user.songs =
            songs;

        user.playlists =
            playlists;

        user.followers =
            followers;

        user.is_admin =
            booleanValue(
                user.is_admin
            );

            user.social_links = socialLinks;

        return res.json({

            success: true,

            user:
                sanitizeUser(user)

        });

    }

    catch (error) {

        console.error(
            "ME ERROR:",
            error
        );

        return res.status(500).json({

            success: false,

            message:
                "Unable to load current user."

        });

    }
};

// ======================================================
// GOOGLE CALLBACK
// ======================================================

exports.googleCallback = async (req, res) => {

    try {

        if (!req.user) {

            return res.redirect(
                `${FRONTEND_URL}/signup?error=google_failed`
            );

        }

        const result =
            await db.query(

                `
                SELECT
                    id,
                    username,
                    email,
                    role,
                    is_admin,
                    country,
                    phone,
                    profile_image_url,
                    verified,
                    monetized,
                    profile_completed,
                    created_at
                FROM users
                WHERE id = $1
                LIMIT 1
                `,

                [req.user.id]

            );

        if (
            result.rows.length === 0
        ) {

            return res.redirect(
                `${FRONTEND_URL}/signup?error=user_not_found`
            );

        }

        const user =
            result.rows[0];

        user.is_admin =
            booleanValue(
                user.is_admin
            );

      const challenge = await createOtpChallenge(
    user,
    "google_login"
);

return res.redirect(
    `${FRONTEND_URL}/verify-otp?challenge=${encodeURIComponent(
        challenge.challengeToken
    )}&email=${encodeURIComponent(
        challenge.email
    )}&source=google`
);

    }

    catch (error) {

        console.error(
            "GOOGLE CALLBACK ERROR:",
            error
        );

        return res.redirect(
            `${FRONTEND_URL}/signup?error=server_error`
        );

    }
};

// ======================================================
// UPDATE PROFILE
// POST /api/auth/update-profile
// POST /api/auth/profile
//
// Users may update:
// - username
// - role
// - country
// - phone
// - profile image
//
// Users CANNOT update:
// - is_admin
// - verified
// - email
// ======================================================

exports.updateProfile = async (req, res) => {

    try {

        const userId =
            Number(req.userId);

        if (!isValidId(userId)) {

            return res.status(401).json({

                success: false,

                message:
                    "Unauthorized."

            });

        }

        // ------------------------------------------------
        // Get current user
        // ------------------------------------------------

        const currentResult =
            await db.query(

                `
                SELECT
                    id,
                    username,
                    email,
                    role,
                    is_admin,
                    country,
                     bio,
                    phone,
                    profile_image_url,
                    monetized,
                    verified
                FROM users
                WHERE id = $1
                LIMIT 1
                `,

                [userId]

            );

        if (
            currentResult.rows.length === 0
        ) {

            return res.status(404).json({

                success: false,

                message:
                    "User not found."

            });

        }

        const currentUser =
            currentResult.rows[0];

        // ------------------------------------------------
        // Username
        // ------------------------------------------------

        const username =
            req.body.username !== undefined
                ? cleanText(
                    req.body.username
                )
                : currentUser.username;

        if (
            !username ||
            username.length < 2
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Username must contain at least 2 characters."

            });

        }

        if (username.length > 50) {

            return res.status(400).json({

                success: false,

                message:
                    "Username cannot exceed 50 characters."

            });

        }

        // ------------------------------------------------
        // Check username collision
        // ------------------------------------------------

        const usernameCheck =
            await db.query(

                `
                SELECT id
                FROM users
                WHERE
                    LOWER(username) = LOWER($1)
                    AND id <> $2
                LIMIT 1
                `,

                [
                    username,
                    userId
                ]

            );

        if (
            usernameCheck.rows.length > 0
        ) {

            return res.status(409).json({

                success: false,

                message:
                    "Username is already taken."

            });

        }

        // ------------------------------------------------
        // Country
        // ------------------------------------------------

        const country =
            req.body.country !== undefined
                ? cleanText(
                    req.body.country
                )
                : currentUser.country;

                // ------------------------------------------------
// Bio
// ------------------------------------------------

const bio =
    req.body.bio !== undefined
        ? cleanText(req.body.bio)
        : currentUser.bio || "";

if (bio.length > 1000) {
    return res.status(400).json({
        success: false,
        message: "Bio cannot exceed 1000 characters."
    });
}

        // ------------------------------------------------
        // Phone
        // ------------------------------------------------

        const phone =
            req.body.phone !== undefined
                ? cleanText(
                    req.body.phone
                )
                : currentUser.phone;

        // ------------------------------------------------
        // Role
        //
        // is_admin is NEVER accepted from frontend.
        // ------------------------------------------------

        let role =
            currentUser.role ||
            "listener";

        if (
            req.body.role !== undefined
        ) {

            const requestedRole =
                cleanText(
                    req.body.role
                ).toLowerCase();

            if (
                ALLOWED_ROLES.includes(
                    requestedRole
                )
            ) {

                role =
                    requestedRole;

            }

        }

        // ------------------------------------------------
        // Profile image
        // ------------------------------------------------

        let profileImage =
            currentUser.profile_image_url;

        if (req.file) {

            profileImage =
                `/uploads/artist_images/${req.file.filename}`;

        }

        // ------------------------------------------------
        // Update
        // ------------------------------------------------

       const result = await db.query(
    `
    UPDATE users
    SET
        username = $1,
        role = $2,
        country = $3,
        bio = $4,
        phone = $5,
        profile_image_url = $6,
        profile_completed = TRUE
    WHERE id = $7
    RETURNING
        id,
        username,
        email,
        role,
        is_admin,
        country,
        bio,
        phone,
        profile_image_url,
        verified,
        monetized,
        profile_completed,
        created_at
    `,
    [
        username,
        role,
        country,
        bio,
        phone,
        profileImage,
        userId
    ]
);

        if (
            result.rows.length === 0
        ) {

            return res.status(404).json({

                success: false,

                message:
                    "User not found."

            });

        }

        const user =
            result.rows[0];

        user.is_admin =
            booleanValue(
                user.is_admin
            );

        return res.json({

            success: true,

            message:
                "Profile updated successfully.",

            user:
                sanitizeUser(user)

        });

    }

    catch (error) {

        console.error(
            "PROFILE UPDATE ERROR:",
            error
        );

        if (error.code === "23505") {

            return res.status(409).json({

                success: false,

                message:
                    "Username is already taken."

            });

        }

        return res.status(500).json({

            success: false,

            message:
                "Failed to update profile."

        });

    }
};

// ======================================================
// GET ALL ARTISTS
// GET /api/auth/artists
// ======================================================

exports.artists = async (req, res) => {

    try {

        const result =
            await db.query(

                `
                SELECT
                    id,
                    username,
                    country,
                    profile_image_url,
                    verified,
                    monetized,
                    created_at
                FROM users
                WHERE LOWER(role) = 'artist'
                ORDER BY LOWER(username) ASC
                `

            );

        return res.json({

            success: true,

            count:
                result.rows.length,

            artists:
                result.rows

        });

    }

    catch (error) {

        console.error(
            "ARTISTS LOAD ERROR:",
            error
        );

        return res.status(500).json({

            success: false,

            message:
                "Unable to load artists."

        });

    }
};


// ======================================================
// GET CREATORS BY ROLE
// GET /api/auth/creators?role=artist
//
// Returns:
// - Creator information
// - Verified status
// - Monetized status
// - Verification level (none | verified | master)
// ======================================================

exports.getCreatorsByRole = async (req, res) => {

    try {

        const requestedRole =
            cleanText(req.query.role).toLowerCase();

        if (!requestedRole) {

            return res.status(400).json({
                success: false,
                message: "Creator role is required."
            });

        }

        if (!CREATOR_ROLES.includes(requestedRole)) {

            return res.status(400).json({
                success: false,
                message: "Invalid creator role."
            });

        }

        const result = await db.query(

            `
            SELECT
                id,
                username,
                role,
                country,
                profile_image_url,
                verified,
                monetized,
                created_at
            FROM users
            WHERE LOWER(role) = $1
            ORDER BY LOWER(username) ASC
            `,

            [requestedRole]

        );

        const creators = result.rows.map((creator) => {

            const verified =
                Boolean(creator.verified);

            const monetized =
                Boolean(creator.monetized);

            return {

                ...creator,

                verified,

                monetized,

                verification_level:
                    getVerificationLevel({
                        verified,
                        monetized
                    })

            };

        });

        return res.json({

            success: true,

            role: requestedRole,

            count: creators.length,

            creators

        });

    }

    catch (error) {

        console.error(
            "GET CREATORS ERROR:",
            error
        );

        return res.status(500).json({

            success: false,

            message: "Unable to load creators."

        });

    }

};



// ======================================================
// GET POPULAR CREATORS
// GET /api/auth/creators/popular
//
// Country-aware creator discovery.
//
// Ranking considers:
// - Local unique listeners (last 30 days)
// - Local listening variety
// - Local song likes
// - Local followers
// - Creator country match
// - Global followers and plays
// - Recently joined creators
//
// Authentication is OPTIONAL.
// Logged-in listeners receive country-based results.
// Visitors receive globally ranked results.
// ======================================================

exports.getPopularCreators = async (req, res) => {

    try {

        // ------------------------------------------------
        // OPTIONAL LISTENER AUTHENTICATION
        // ------------------------------------------------

        const listenerId =
            req.userId
                ? Number(req.userId)
                : getOptionalUserId(req);

        // ------------------------------------------------
        // COUNTRY-AWARE CREATOR QUERY
        // ------------------------------------------------

        const result = await db.query(

            `
            WITH listener_context AS (

                SELECT
                    country

                FROM users

                WHERE id = $2

                LIMIT 1

            ),

            -- ==========================================
            -- TOTAL CREATOR FOLLOWERS
            -- ==========================================

            total_followers AS (

                SELECT
                    artist_id,
                    COUNT(*)::int AS followers_count

                FROM followers

                GROUP BY artist_id

            ),

            -- ==========================================
            -- LOCAL FOLLOWERS
            -- ==========================================

            local_followers AS (

                SELECT
                    f.artist_id,
                    COUNT(*)::int AS local_followers

                FROM followers f

                JOIN users follower
                    ON follower.id = f.follower_id

                CROSS JOIN listener_context lc

                WHERE
                    lc.country IS NOT NULL

                    AND NULLIF(
                        LOWER(TRIM(follower.country)),
                        ''
                    ) IS NOT NULL

                    AND LOWER(TRIM(follower.country)) =
                        LOWER(TRIM(lc.country))

                GROUP BY f.artist_id

            ),

  
-- ==========================================
-- LOCAL LISTENING ACTIVITY
-- ==========================================

local_listening AS (

    SELECT
        s.user_id AS creator_id,

        COUNT(
            DISTINCT lh.user_id
        )::int AS local_unique_listeners,

        COUNT(
            DISTINCT s.id
        )::int AS local_songs_listened

    FROM listening_history lh

    JOIN users listener
        ON listener.id = lh.user_id

    JOIN songs s
        ON s.id = lh.song_id

    CROSS JOIN listener_context lc

    WHERE

        lh.last_played_at >=
            NOW() - INTERVAL '30 days'

        AND lc.country IS NOT NULL

        AND NULLIF(
            LOWER(TRIM(listener.country)),
            ''
        ) IS NOT NULL

        AND LOWER(TRIM(listener.country)) =
            LOWER(TRIM(lc.country))

    GROUP BY s.user_id

),


            -- ==========================================
            -- LOCAL SONG LIKES
            -- ==========================================

            local_likes AS (

                SELECT
                    s.user_id AS creator_id,

                    COUNT(sl.id)::int AS local_likes

                FROM song_likes sl

                JOIN songs s
                    ON s.id = sl.song_id

                JOIN users listener
                    ON listener.id = sl.user_id

                CROSS JOIN listener_context lc

                WHERE

                    lc.country IS NOT NULL

                    AND NULLIF(
                        LOWER(TRIM(listener.country)),
                        ''
                    ) IS NOT NULL

                    AND LOWER(TRIM(listener.country)) =
                        LOWER(TRIM(lc.country))

                GROUP BY s.user_id

            ),

            -- ==========================================
            -- GLOBAL SONG STATISTICS
            -- ==========================================

            creator_song_stats AS (

                SELECT
                    user_id AS creator_id,

                    COUNT(*)::int AS total_songs,

                    COALESCE(
                        SUM(COALESCE(plays, 0)),
                        0
                    )::bigint AS total_plays

                FROM songs

                GROUP BY user_id

            ),

            -- ==========================================
            -- CREATOR STATISTICS
            -- ==========================================

            creator_stats AS (

                SELECT

                    u.id,
                    u.username,
                    u.role,
                    u.country,
                    u.profile_image_url,
                    u.monetized,
                    u.verified,
                    u.created_at,

                    COALESCE(
                        tf.followers_count,
                        0
                    ) AS followers_count,

                    COALESCE(
                        ll.local_unique_listeners,
                        0
                    ) AS local_unique_listeners,

                    COALESCE(
                        ll.local_songs_listened,
                        0
                    ) AS local_songs_listened,

                    COALESCE(
                        lf.local_followers,
                        0
                    ) AS local_followers,

                    COALESCE(
                        lk.local_likes,
                        0
                    ) AS local_likes,

                    COALESCE(
                        css.total_songs,
                        0
                    ) AS total_songs,

                    COALESCE(
                        css.total_plays,
                        0
                    ) AS total_plays,

                    CASE

                        WHEN
                            lc.country IS NOT NULL

                            AND NULLIF(
                                LOWER(TRIM(u.country)),
                                ''
                            ) IS NOT NULL

                            AND LOWER(TRIM(u.country)) =
                                LOWER(TRIM(lc.country))

                        THEN TRUE

                        ELSE FALSE

                    END AS country_match,

                    CASE

                        WHEN
                            u.created_at >=
                                NOW() - INTERVAL '30 days'

                        THEN 15

                        ELSE 0

                    END AS emerging_creator_bonus

                FROM users u

                CROSS JOIN listener_context lc

                LEFT JOIN total_followers tf
                    ON tf.artist_id = u.id

                LEFT JOIN local_followers lf
                    ON lf.artist_id = u.id

                LEFT JOIN local_listening ll
                    ON ll.creator_id = u.id

                LEFT JOIN local_likes lk
                    ON lk.creator_id = u.id

                LEFT JOIN creator_song_stats css
                    ON css.creator_id = u.id

                WHERE LOWER(u.role) = ANY($1::text[])

            ),


            -- ==========================================
            -- FINAL CREATOR RANKING
            -- ==========================================

            scored_creators AS (

                SELECT *,

                    ROUND((
                        local_unique_listeners * 100
                        + local_songs_listened * 3
                        + local_likes * 10
                        + local_followers * 8
                        + CASE
                            WHEN country_match THEN 5
                            ELSE 0
                          END
                        + followers_count * 2
                        + total_plays * 0.1
                        + emerging_creator_bonus
                    )::numeric, 2) AS discovery_score

                FROM creator_stats

            ),

            -- ==========================================
            -- RANK EACH CREATOR ROLE INDEPENDENTLY
            -- ==========================================

            ranked_creators AS (

                SELECT *,

                    ROW_NUMBER() OVER (

                        PARTITION BY LOWER(role)

                        ORDER BY
                            country_match DESC,
                            discovery_score DESC,
                            followers_count DESC,
                            username ASC

                    ) AS role_rank

                FROM scored_creators

            )

            -- ==========================================
            -- RETURN TOP 20 PER CREATOR ROLE
            -- ==========================================

            SELECT *

            FROM ranked_creators

            WHERE role_rank <= 20

            ORDER BY
                country_match DESC,
                discovery_score DESC,
                followers_count DESC,
                username ASC

            `,

            [
                CREATOR_ROLES,
                Number.isInteger(listenerId) && listenerId > 0
                    ? listenerId
                    : null
            ]

        );

        // ------------------------------------------------
        // RESPONSE
        // ------------------------------------------------

        return res.json({

            success: true,

            count: result.rows.length,

creators: result.rows.map((creator) => {

   const verified = booleanValue(creator.verified);
const monetized = booleanValue(creator.monetized);

    return {
        ...creator,

        verified,
        monetized,

        verification_level: getVerificationLevel({
            verified,
            monetized
        }),

        country_match:
            Boolean(creator.country_match),

        followers_count:
            Number(creator.followers_count) || 0,

        local_unique_listeners:
            Number(creator.local_unique_listeners) || 0,

        local_songs_listened:
            Number(creator.local_songs_listened) || 0,

        local_followers:
            Number(creator.local_followers) || 0,

        local_likes:
            Number(creator.local_likes) || 0,

        total_songs:
            Number(creator.total_songs) || 0,

        total_plays:
            Number(creator.total_plays) || 0,

        discovery_score:
            Number(creator.discovery_score) || 0
    };
})

        });

    }

    catch (error) {

        console.error(
            "GET POPULAR CREATORS ERROR:",
            error
        );

        return res.status(500).json({

            success: false,

            message:
                "Unable to load popular creators."

        });

    }

};


// ======================================================
// GET TRENDING IN LISTENER'S COUNTRY
// GET /api/auth/trending-in-country
//
// Returns:
// - Trending artists
// - Trending albums
// - Trending EPs
// - Trending singles
//
// Ranking uses engagement from listeners in the
// logged-in user's country over the last 30 days.
//
// Artists and releases can originate from ANY country.
// ======================================================

exports.getTrendingInCountry = async (req, res) => {

    try {

        // ------------------------------------------------
        // GET CURRENT LISTENER
        // ------------------------------------------------

        const listenerId =
            req.userId
                ? Number(req.userId)
                : getOptionalUserId(req);

        if (!isValidId(listenerId)) {

            return res.json({
                success: true,
                country: null,
                message: "Log in to see trending music in your country.",
                artists: [],
                albums: [],
                eps: [],
                singles: []
            });

        }

        // ------------------------------------------------
        // GET LISTENER'S COUNTRY
        // ------------------------------------------------

        const listenerResult =
            await db.query(

                `
                SELECT
                    id,
                    country
                FROM users
                WHERE id = $1
                LIMIT 1
                `,

                [listenerId]

            );

        if (
            listenerResult.rows.length === 0 ||
            !listenerResult.rows[0].country ||
            !listenerResult.rows[0].country.trim()
        ) {

            return res.json({
                success: true,
                country: null,
                message: "Please add your country to your profile to see local trends.",
                artists: [],
                albums: [],
                eps: [],
                singles: []
            });

        }

        const country =
            listenerResult.rows[0].country.trim();

        // ------------------------------------------------
        // TRENDING ARTISTS
        // ------------------------------------------------

        const artistsResult =
            await db.query(

                `
                WITH local_listening AS (

                    SELECT
                        s.user_id AS artist_id,

                        COUNT(
                            DISTINCT lh.user_id
                        )::int AS local_unique_listeners,

                        COUNT(
                            DISTINCT s.id
                        )::int AS local_songs_listened

                    FROM listening_history lh

                    JOIN users listener
                        ON listener.id = lh.user_id

                    JOIN songs s
                        ON s.id = lh.song_id

                    WHERE
                        lh.last_played_at >=
                            NOW() - INTERVAL '30 days'

                        AND LOWER(TRIM(listener.country)) =
                            LOWER(TRIM($1))

                    GROUP BY s.user_id

                ),

                local_likes AS (

                    SELECT
                        s.user_id AS artist_id,

                        COUNT(
                            DISTINCT sl.id
                        )::int AS local_likes

                    FROM song_likes sl

                    JOIN songs s
                        ON s.id = sl.song_id

                    JOIN users listener
                        ON listener.id = sl.user_id

                    WHERE
                        sl.created_at >=
                            NOW() - INTERVAL '30 days'

                        AND LOWER(TRIM(listener.country)) =
                            LOWER(TRIM($1))

                    GROUP BY s.user_id

                ),

                local_followers AS (

                    SELECT
                        f.artist_id,

                        COUNT(
                            DISTINCT f.follower_id
                        )::int AS local_followers

                    FROM followers f

                    JOIN users listener
                        ON listener.id = f.follower_id

                    WHERE
                        LOWER(TRIM(listener.country)) =
                            LOWER(TRIM($1))

                    GROUP BY f.artist_id

                ),

                total_followers AS (

                    SELECT
                        artist_id,
                        COUNT(*)::int AS followers_count

                    FROM followers

                    GROUP BY artist_id

                )

                SELECT

                    u.id,
                    u.username,
                    u.role,
                    u.country,
                    u.profile_image_url,
                    u.verified,
                    u.monetized,

                    COALESCE(
                        tf.followers_count,
                        0
                    ) AS followers_count,

                    COALESCE(
                        ll.local_unique_listeners,
                        0
                    ) AS local_unique_listeners,

                    COALESCE(
                        ll.local_songs_listened,
                        0
                    ) AS local_songs_listened,

                    COALESCE(
                        lk.local_likes,
                        0
                    ) AS local_likes,

                    COALESCE(
                        lf.local_followers,
                        0
                    ) AS local_followers,

                    ROUND(

                        (
                            COALESCE(ll.local_unique_listeners, 0) * 100

                            + COALESCE(ll.local_songs_listened, 0) * 3

                            + COALESCE(lk.local_likes, 0) * 10

                            + COALESCE(lf.local_followers, 0) * 8

                        )::numeric,

                        2

                    ) AS trending_score

                FROM users u

                LEFT JOIN local_listening ll
                    ON ll.artist_id = u.id

                LEFT JOIN local_likes lk
                    ON lk.artist_id = u.id

                LEFT JOIN local_followers lf
                    ON lf.artist_id = u.id

                LEFT JOIN total_followers tf
                    ON tf.artist_id = u.id

                WHERE
                    LOWER(TRIM(u.role)) = 'artist'

                    AND (
                        COALESCE(ll.local_unique_listeners, 0)
                        + COALESCE(lk.local_likes, 0)
                        + COALESCE(lf.local_followers, 0)
                    ) > 0

                ORDER BY
                    trending_score DESC,
                    followers_count DESC,
                    LOWER(u.username) ASC

                LIMIT 20
                `,

                [country]

            );

        // ------------------------------------------------
        // HELPER: LOAD TRENDING ALBUMS OR EPS
        //
        // Tracks belonging to the same creator and
        // album name are grouped into one release.
        // ------------------------------------------------

        const loadGroupedReleases = async (releaseTypes) => {

            return db.query(

                `
                WITH local_listening AS (

                    SELECT

                        s.user_id AS creator_id,

                        LOWER(TRIM(s.album_name)) AS release_key,

                        COUNT(
                            DISTINCT lh.user_id
                        )::int AS local_unique_listeners,

                        COUNT(
                            DISTINCT s.id
                        )::int AS local_songs_listened

                    FROM listening_history lh

                    JOIN users listener
                        ON listener.id = lh.user_id

                    JOIN songs s
                        ON s.id = lh.song_id

                    WHERE
                        lh.last_played_at >=
                            NOW() - INTERVAL '30 days'

                        AND LOWER(TRIM(listener.country)) =
                            LOWER(TRIM($1))

                        AND NULLIF(
                            TRIM(s.album_name),
                            ''
                        ) IS NOT NULL

                        AND LOWER(TRIM(COALESCE(s.release_type, ''))) =
                            ANY($2::text[])

                    GROUP BY
                        s.user_id,
                        LOWER(TRIM(s.album_name))

                ),

                local_likes AS (

                    SELECT

                        s.user_id AS creator_id,

                        LOWER(TRIM(s.album_name)) AS release_key,

                        COUNT(
                            DISTINCT sl.id
                        )::int AS local_likes

                    FROM song_likes sl

                    JOIN users listener
                        ON listener.id = sl.user_id

                    JOIN songs s
                        ON s.id = sl.song_id

                    WHERE
                        sl.created_at >=
                            NOW() - INTERVAL '30 days'

                        AND LOWER(TRIM(listener.country)) =
                            LOWER(TRIM($1))

                        AND NULLIF(
                            TRIM(s.album_name),
                            ''
                        ) IS NOT NULL

                        AND LOWER(TRIM(COALESCE(s.release_type, ''))) =
                            ANY($2::text[])

                    GROUP BY
                        s.user_id,
                        LOWER(TRIM(s.album_name))

                ),

                release_details AS (

                    SELECT

                        s.user_id AS creator_id,

                        LOWER(TRIM(s.album_name)) AS release_key,

                        MIN(s.id) AS id,

                        MAX(s.album_name) AS album_name,

                        MAX(s.artist_name) AS artist_name,

                        MAX(s.cover_url) AS cover_url,

                        MAX(s.country) AS release_country,

                        COUNT(
                            DISTINCT s.id
                        )::int AS track_count

                    FROM songs s

                    WHERE
                        NULLIF(
                            TRIM(s.album_name),
                            ''
                        ) IS NOT NULL

                        AND LOWER(TRIM(COALESCE(s.release_type, ''))) =
                            ANY($2::text[])

                    GROUP BY
                        s.user_id,
                        LOWER(TRIM(s.album_name))

                )

                SELECT

                    rd.id,
                    rd.creator_id,
                    u.username,
                    u.role AS artist_role,

                    COALESCE(
                        NULLIF(rd.artist_name, ''),
                        u.username
                    ) AS artist_name,

                    rd.album_name AS release_title,
                    rd.cover_url,
                    rd.release_country AS country,

                    $3::text AS release_type,

                    rd.track_count,

                    COALESCE(
                        ll.local_unique_listeners,
                        0
                    ) AS local_unique_listeners,

                    COALESCE(
                        ll.local_songs_listened,
                        0
                    ) AS local_songs_listened,

                    COALESCE(
                        lk.local_likes,
                        0
                    ) AS local_likes,

                    ROUND(

                        (
                            COALESCE(ll.local_unique_listeners, 0) * 100

                            + COALESCE(ll.local_songs_listened, 0) * 3

                            + COALESCE(lk.local_likes, 0) * 10

                        )::numeric,

                        2

                    ) AS trending_score

                FROM release_details rd

                JOIN users u
                    ON u.id = rd.creator_id

                LEFT JOIN local_listening ll
                    ON
                        ll.creator_id = rd.creator_id
                        AND ll.release_key = rd.release_key

                LEFT JOIN local_likes lk
                    ON
                        lk.creator_id = rd.creator_id
                        AND lk.release_key = rd.release_key

                WHERE
                    (
                        COALESCE(ll.local_unique_listeners, 0)
                        + COALESCE(lk.local_likes, 0)
                    ) > 0

                ORDER BY
                    trending_score DESC,
                    rd.track_count DESC,
                    LOWER(rd.album_name) ASC

                LIMIT 20
                `,

                [
                    country,
                    releaseTypes,
                    releaseTypes[0] === "album"
                        ? "album"
                        : "ep"
                ]

            );

        };

        // ------------------------------------------------
        // TRENDING ALBUMS
        // ------------------------------------------------

        const albumsResult =
            await loadGroupedReleases([
                "album"
            ]);

        // ------------------------------------------------
        // TRENDING EPS
        // ------------------------------------------------

        const epsResult =
            await loadGroupedReleases([
                "ep",
                "extended play"
            ]);

        // ------------------------------------------------
        // TRENDING SINGLES
        // ------------------------------------------------

       
        // ------------------------------------------------
        // TRENDING SINGLES
        // ------------------------------------------------

        const singlesResult =
            await db.query(

                `
                WITH local_listening AS (

                    SELECT
                        lh.song_id,

                        COUNT(
                            DISTINCT lh.user_id
                        )::int AS local_unique_listeners

                    FROM listening_history lh

                    JOIN users listener
                        ON listener.id = lh.user_id

                    WHERE
                        lh.last_played_at >=
                            NOW() - INTERVAL '30 days'

                        AND LOWER(TRIM(listener.country)) =
                            LOWER(TRIM($1))

                    GROUP BY lh.song_id

                ),

                local_likes AS (

                    SELECT
                        sl.song_id,

                        COUNT(
                            DISTINCT sl.id
                        )::int AS local_likes

                    FROM song_likes sl

                    JOIN users listener
                        ON listener.id = sl.user_id

                    WHERE
                        sl.created_at >=
                            NOW() - INTERVAL '30 days'

                        AND LOWER(TRIM(listener.country)) =
                            LOWER(TRIM($1))

                    GROUP BY sl.song_id

                )

                SELECT
                    s.id,
                    s.user_id,
                    s.user_id AS creator_id,

                    s.title,
                    s.song_title,
                    s.artist_name,
                    s.album_name,
                    s.release_type,

                    s.genre,
                    s.subgenre,
                    s.country,
                    s.language,

                    s.audio_url,
                    s.cover_url,
                    s.duration,

                    s.plays,
                    s.downloads,
                    s.likes,

                    s.release_date,
                    s.created_at,

                    u.username,
                    u.role AS artist_role,

                    COALESCE(
                        NULLIF(s.artist_name, ''),
                        u.username
                    ) AS artist_display_name,

                    COALESCE(
                        NULLIF(s.title, ''),
                        s.song_title
                    ) AS release_title,

                    COALESCE(
                        ll.local_unique_listeners,
                        0
                    ) AS local_unique_listeners,

                    COALESCE(
                        lk.local_likes,
                        0
                    ) AS local_likes,

                    ROUND(
                        (
                            COALESCE(ll.local_unique_listeners, 0) * 100
                            + COALESCE(lk.local_likes, 0) * 10
                        )::numeric,
                        2
                    ) AS trending_score

                FROM songs s

                JOIN users u
                    ON u.id = s.user_id

                LEFT JOIN local_listening ll
                    ON ll.song_id = s.id

                LEFT JOIN local_likes lk
                    ON lk.song_id = s.id

                WHERE
                    LOWER(TRIM(COALESCE(s.release_type, ''))) = 'single'

                    AND (
                        COALESCE(ll.local_unique_listeners, 0)
                        + COALESCE(lk.local_likes, 0)
                    ) > 0

                ORDER BY
                    trending_score DESC,
                    LOWER(COALESCE(s.title, s.song_title)) ASC

                LIMIT 20
                `,

                [country]

            );


        // ------------------------------------------------
        // RESPONSE
        // ------------------------------------------------

        const toNumber = (value) =>
            Number(value) || 0;

        return res.json({

            success: true,

            country,

          artists: artistsResult.rows.map(artist => {

   const verified = booleanValue(artist.verified);
const monetized = booleanValue(artist.monetized);
    return {
        ...artist,

        verified,
        monetized,

        verification_level: getVerificationLevel({
            verified,
            monetized
        }),

        followers_count:
            toNumber(artist.followers_count),

        local_unique_listeners:
            toNumber(artist.local_unique_listeners),

        local_songs_listened:
            toNumber(artist.local_songs_listened),

        local_likes:
            toNumber(artist.local_likes),

        local_followers:
            toNumber(artist.local_followers),

        trending_score:
            toNumber(artist.trending_score)
    };
}),

            albums:
                albumsResult.rows.map(release => ({

                    ...release,

                    track_count:
                        toNumber(release.track_count),

                    local_unique_listeners:
                        toNumber(release.local_unique_listeners),

                    local_songs_listened:
                        toNumber(release.local_songs_listened),

                    local_likes:
                        toNumber(release.local_likes),

                    trending_score:
                        toNumber(release.trending_score)

                })),

            eps:
                epsResult.rows.map(release => ({

                    ...release,

                    track_count:
                        toNumber(release.track_count),

                    local_unique_listeners:
                        toNumber(release.local_unique_listeners),

                    local_songs_listened:
                        toNumber(release.local_songs_listened),

                    local_likes:
                        toNumber(release.local_likes),

                    trending_score:
                        toNumber(release.trending_score)

                })),

            singles:
                singlesResult.rows.map(release => ({

                    ...release,

                    local_unique_listeners:
                        toNumber(release.local_unique_listeners),

                    local_likes:
                        toNumber(release.local_likes),

                    trending_score:
                        toNumber(release.trending_score)

                }))

        });

    }

    catch (error) {

        console.error(
            "GET TRENDING IN COUNTRY ERROR:",
            error
        );

        return res.status(500).json({

            success: false,

            message:
                "Unable to load trending music in your country."

        });

    }

};


// ======================================================
// GET SINGLE CREATOR PROFILE
//
// GET /api/auth/creators/:id
//
// Public endpoint.
// Authentication is optional.
//
// Returns:
// - creator
// - songs
// - singles
// - albums
// - eps
// - followers
// - following
// ======================================================

exports.getCreatorProfile = async (req, res) => {

    try {

        const creatorId =
            Number(req.params.id);

        if (!isValidId(creatorId)) {

            return res.status(400).json({

                success: false,

                message:
                    "Invalid creator ID."

            });

        }

        // ------------------------------------------------
        // Optional authentication
        // ------------------------------------------------

        const optionalUserId =
            req.userId
                ? Number(req.userId)
                : getOptionalUserId(req);

        // ------------------------------------------------
        // Creator
        // ------------------------------------------------

     // ------------------------------------------------
// Creator
// ------------------------------------------------

const creatorResult =
    await db.query(
        `
        SELECT
            id,
            username,
            email,
            role,
            country,
            bio,
            phone,
            profile_image_url,
            verified,
            monetized,
            created_at
        FROM users
        WHERE id = $1
        LIMIT 1
        `,
        [creatorId]
    );
     

        if (
            creatorResult.rows.length === 0
        ) {

            return res.status(404).json({

                success: false,

                message:
                    "Creator not found."

            });

        }

        const creator =
            creatorResult.rows[0];

            // ------------------------------------------------
// SOCIAL MEDIA LINKS
// ------------------------------------------------

let socialLinks = [];

try {
    const socialResult = await db.query(
        `
        SELECT platform, url
        FROM user_social_links
        WHERE user_id = $1
        ORDER BY platform ASC
        `,
        [creatorId]
    );

    socialLinks = socialResult.rows;

} catch (error) {
    console.error(
        "CREATOR SOCIAL LINKS ERROR:",
        error.message
    );
}
        // ------------------------------------------------
        // Songs
        // ------------------------------------------------

        let songs = [];

        try {

            const songsResult =
                await db.query(

                    `
                  
SELECT
    id,
    user_id,
    title,
    song_title,
    artist_name,
    featured_artists,
    album_name,
    release_type,
    genre,
    subgenre,
    country,
    language,
    audio_url,
    cover_url,
    cover_url AS cover_file_url,
    duration,
    plays,
    downloads,
    likes,
    release_date,
    created_at
FROM songs
WHERE user_id = $1
ORDER BY created_at DESC

                    `,

                    [creatorId]

                );

            songs =
                songsResult.rows;

        }

        catch (error) {

            console.error(
                "CREATOR SONGS ERROR:",
                error.message
            );

        }

        // ------------------------------------------------
        // Release collections
        // ------------------------------------------------

        const singles =
            songs.filter(
                song =>
                    String(
                        song.release_type || ""
                    )
                    .trim()
                    .toLowerCase() === "single"
            );

        const albums =
            songs.filter(
                song =>
                    String(
                        song.release_type || ""
                    )
                    .trim()
                    .toLowerCase() === "album"
            );

        const eps =
            songs.filter(
                song => {

                    const type =
                        String(
                            song.release_type || ""
                        )
                        .trim()
                        .toLowerCase();

                    return (
                        type === "ep" ||
                        type === "extended play"
                    );

                }
            );

        // ------------------------------------------------
        // Follower count
        // ------------------------------------------------

        let followers = 0;

        try {

            const followerResult =
                await db.query(

                    `
                    SELECT COUNT(*) AS total
                    FROM followers
                    WHERE artist_id = $1
                    `,

                    [creatorId]

                );

            followers =
                Number(
                    followerResult.rows[0]?.total
                ) || 0;

        }

        catch (error) {

            console.error(
                "CREATOR FOLLOWER COUNT ERROR:",
                error.message
            );

        }

        // ------------------------------------------------
        // Following state
        // ------------------------------------------------

        let following = false;

        if (
            isValidId(
                Number(optionalUserId)
            )
        ) {

            try {

                const followingResult =
                    await db.query(

                        `
                        SELECT id
                        FROM followers
                        WHERE
                            artist_id = $1
                            AND follower_id = $2
                        LIMIT 1
                        `,

                        [
                            creatorId,
                            Number(optionalUserId)
                        ]

                    );

                following =
                    followingResult.rows.length > 0;

            }

            catch (error) {

                console.error(
                    "CREATOR FOLLOW STATUS ERROR:",
                    error.message
                );

            }

        }

        return res.json({

            success: true,

           creator: {

    ...creator,

social_links: socialLinks,

    verified:
        Boolean(creator.verified),

    monetized:
        Boolean(creator.monetized),

    verification_level:
        getVerificationLevel(creator),

    followers,

    followers_count:
        followers,

    following,

    totalSongs:
        songs.length,

    singles,

    albums,

    eps,

    songs

}

        });

    }

    catch (error) {

        console.error(
            "GET CREATOR PROFILE ERROR:",
            error
        );

        return res.status(500).json({

            success: false,

            message:
                "Unable to load creator profile."

        });

    }
};

// ======================================================
// TOGGLE CREATOR FOLLOW
//
// POST /api/auth/creators/:id/follow
//
// Requires authentication.
//
// followers.artist_id   = creator users.id
// followers.follower_id = current users.id
//
// NOTIFICATION:
//
// When someone follows a creator:
//
// The creator receives:
//
// "New follower"
// "Username started following you."
//
// actor_user_id = person who followed
// user_id        = creator receiving notification
// ======================================================

exports.toggleCreatorFollow = async (req, res) => {

    try {

        const creatorId =
            Number(req.params.id);

        const followerId =
            Number(req.userId);


        // ==================================================
        // VALIDATE CREATOR ID
        // ==================================================

        if (!isValidId(creatorId)) {

            return res.status(400).json({

                success: false,

                message:
                    "Invalid creator ID."

            });

        }


        // ==================================================
        // VALIDATE FOLLOWER ID
        // ==================================================

        if (!isValidId(followerId)) {

            return res.status(401).json({

                success: false,

                message:
                    "Unauthorized."

            });

        }


        // ==================================================
        // PREVENT SELF FOLLOW
        // ==================================================

        if (creatorId === followerId) {

            return res.status(400).json({

                success: false,

                message:
                    "You cannot follow yourself."

            });

        }


        // ==================================================
        // GET CREATOR
        // ==================================================

        const creatorResult =
            await db.query(

                `
                SELECT
                    id,
                    username,
                    role,
                    profile_image_url,
                    monetized,
                    verified
                FROM users
                WHERE id = $1
                LIMIT 1
                `,

                [
                    creatorId
                ]

            );


        if (
            creatorResult.rows.length === 0
        ) {

            return res.status(404).json({

                success: false,

                message:
                    "Creator not found."

            });

        }


        const creator =
            creatorResult.rows[0];


        // ==================================================
        // VERIFY CREATOR ROLE
        // ==================================================

        if (
            !isCreatorRole(
                creator.role
            )
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "This account is not a creator."

            });

        }


        // ==================================================
        // GET FOLLOWER
        //
        // We need the username for the notification.
        // ==================================================

        const followerResult =
            await db.query(

                `
                SELECT
                    id,
                    username,
                    profile_image_url
                FROM users
                WHERE id = $1
                LIMIT 1
                `,

                [
                    followerId
                ]

            );


        if (
            followerResult.rows.length === 0
        ) {

            return res.status(404).json({

                success: false,

                message:
                    "Follower account not found."

            });

        }


        const follower =
            followerResult.rows[0];


        // ==================================================
        // CHECK EXISTING FOLLOW
        // ==================================================

        const existingFollow =
            await db.query(

                `
                SELECT
                    id
                FROM followers
                WHERE
                    artist_id = $1
                    AND follower_id = $2
                LIMIT 1
                `,

                [
                    creatorId,
                    followerId
                ]

            );


        let following = false;


        // ==================================================
        // UNFOLLOW
        // ==================================================

        if (
            existingFollow.rows.length > 0
        ) {

            await db.query(

                `
                DELETE FROM followers
                WHERE
                    artist_id = $1
                    AND follower_id = $2
                `,

                [
                    creatorId,
                    followerId
                ]

            );


            following = false;

        }


        // ==================================================
        // FOLLOW
        // ==================================================

        else {

            await db.query(

                `
                INSERT INTO followers
                (
                    artist_id,
                    follower_id,
                    created_at
                )

                VALUES
                (
                    $1,
                    $2,
                    NOW()
                )
                `,

                [
                    creatorId,
                    followerId
                ]

            );


            following = true;


            // ==================================================
            // CREATE FOLLOW NOTIFICATION
            //
            // IMPORTANT:
            //
            // userId       = creator receiving notification
            //
            // actorUserId  = person who followed
            //
            // This allows the notification UI to display
            // the follower's username/profile picture.
            // ==================================================

            try {

                await createNotification({

                    userId:
                        creatorId,

                    actorUserId:
                        followerId,

                    type:
                        "follow",

                    title:
                        "New follower",

                    message:
                        `${follower.username || "Someone"} started following you.`,

                    actionUrl:
                        `/creator/${followerId}`,

                    metadata: {

                        creatorId:
                            creatorId,

                        followerId:
                            followerId,

                        followerUsername:
                            follower.username || null,

                    },

                });

            }

            catch (notificationError) {

                /*
                 * IMPORTANT:
                 *
                 * Do NOT cancel the follow if the
                 * notification fails.
                 *
                 * The follow has already succeeded.
                 */

                console.error(
                    "FOLLOW NOTIFICATION ERROR:",
                    notificationError
                );

            }

        }


        // ==================================================
        // GET UPDATED FOLLOWER COUNT
        // ==================================================

        const followerCountResult =
            await db.query(

                `
                SELECT
                    COUNT(*) AS total
                FROM followers
                WHERE artist_id = $1
                `,

                [
                    creatorId
                ]

            );


        const followers =
            Number(
                followerCountResult
                    .rows[0]?.total
            ) || 0;


        // ==================================================
        // RESPONSE
        // ==================================================

        return res.json({

            success: true,

            following,

            followers,

            followers_count:
                followers,

            creator: {

                id:
                    creator.id,

                username:
                    creator.username,

                role:
                    creator.role,

                profile_image_url:
                    creator.profile_image_url,

                verified:
                    Boolean(
                        creator.verified
                    )

            },

            message:
                following
                    ? "Creator followed successfully."
                    : "Creator unfollowed successfully."

        });

    }

    catch (error) {

        // ==================================================
        // DUPLICATE FOLLOW PROTECTION
        // ==================================================

        if (
            error.code === "23505"
        ) {

            return res.status(409).json({

                success: false,

                message:
                    "You are already following this creator."

            });

        }


        console.error(
            "TOGGLE CREATOR FOLLOW ERROR:",
            error
        );


        return res.status(500).json({

            success: false,

            message:
                "Unable to update follow status."

        });

    }

};

// ======================================================
// SEARCH USERS FOR ROYALTY PARTICIPANTS
//
// GET /api/auth/users/search?q=username
//
// Used by RoyaltySplits.jsx.
//
// Returns existing Cave Tunes users so creators can
// select real users as royalty participants.
// ======================================================

exports.searchUsers = async (req, res) => {
    try {

        const query =
            cleanText(req.query.q);

        // ------------------------------------------------
        // Require at least 1 character
        // ------------------------------------------------

        if (!query) {

            return res.json({
                success: true,
                count: 0,
                users: [],
            });

        }

        // ------------------------------------------------
        // Prevent excessively long searches
        // ------------------------------------------------

        const search =
            query.substring(0, 50);

        // ------------------------------------------------
        // Search username / email
        //
        // Password is NEVER selected.
        // is_admin is also not exposed.
        // ------------------------------------------------

        const result =
            await db.query(

                `
                SELECT
                    id,
                    username,
                    role,
                    profile_image_url,
                    country,
                    verified
                FROM users
                WHERE
                    LOWER(username) LIKE LOWER($1)
                    OR LOWER(email) LIKE LOWER($1)
                ORDER BY
                    CASE
                        WHEN LOWER(username) = LOWER($2)
                        THEN 0

                        WHEN LOWER(username)
                            LIKE LOWER($3)
                        THEN 1

                        ELSE 2
                    END,

                    LOWER(username) ASC

                LIMIT 10
                `,

                [
                    `%${search}%`,
                    search,
                    `${search}%`,
                ]

            );

        return res.json({

            success: true,

            count:
                result.rows.length,

            users:
                result.rows.map((user) => ({

                    id:
                        user.id,

                    username:
                        user.username,

                    role:
                        user.role || "listener",

                    profile_image_url:
                        user.profile_image_url || null,

                    country:
                        user.country || null,

                    verified:
                        Boolean(
                            user.verified
                        ),

                })),

        });

    }

    catch (error) {

        console.error(
            "SEARCH USERS ERROR:",
            error
        );

        return res.status(500).json({

            success: false,

            message:
                "Unable to search users.",

        });

    }
};

// ======================================================
// LOGOUT
//
// JWT is stateless.
// Frontend should remove its stored token.
//
// Kept here for compatibility if your route uses
// authController.logout.
// ======================================================

exports.logout = async (req, res) => {
    try {

        if (req.userId && req.adminSessionId) {

            await db.query(
                `
                UPDATE admin_sessions
                SET revoked_at = NOW()
                WHERE
                    session_id = $1::uuid
                    AND user_id = $2
                    AND revoked_at IS NULL
                `,
                [
                    req.adminSessionId,
                    req.userId
                ]
            );

        }

        return res.json({
            success: true,
            message: "Logout successful."
        });

    } catch (error) {

        console.error("LOGOUT ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to complete logout."
        });

    }
};

// ======================================================
// EXPORT HELPER
//
// Not required by routes, but useful if another
// controller needs to generate a token.
// ======================================================

exports.createToken = createToken;

