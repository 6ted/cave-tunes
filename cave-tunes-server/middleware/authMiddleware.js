
// ======================================================
// CAVE TUNES JWT AUTH MIDDLEWARE
// middleware/authMiddleware.js
// ======================================================

const jwt = require("jsonwebtoken");

// ======================================================
// BUILD USER FROM JWT
// ======================================================

const buildUserFromToken = (decoded) => {
    if (
        !decoded ||
        !decoded.id ||
        decoded.otpVerified !== true
    ) {
        return null;
    }

    const userId = Number(decoded.id);

    if (!Number.isInteger(userId) || userId <= 0) {
        return null;
    }

    return {
        id: userId,
        username: decoded.username || null,
        email: decoded.email || null,
        role: decoded.role || "listener",
        isAdmin: decoded.isAdmin === true,
        adminSessionId: decoded.adminSessionId || null,
        verified: Boolean(decoded.verified),
        profile_completed: Boolean(decoded.profile_completed)
    };
};

// ======================================================
// ATTACH USER TO REQUEST
// ======================================================

const attachUser = (req, user) => {
    req.user = user;
    req.userId = user.id;
    req.isAdmin = user.isAdmin;
    req.adminSessionId = user.adminSessionId;

    req.profileCompleted = user.profile_completed;
    req.isVerified = user.verified;
};

// ======================================================
// VERIFY JWT
// ======================================================

const authMiddleware = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader) {
            return res.status(401).json({
                success: false,
                message: "Authorization header missing."
            });
        }

        if (!authHeader.startsWith("Bearer ")) {
            return res.status(401).json({
                success: false,
                message: "Invalid authorization format."
            });
        }

        const token = authHeader.substring(7).trim();

        if (!token) {
            return res.status(401).json({
                success: false,
                message: "Authentication token missing."
            });
        }

        if (!process.env.JWT_SECRET) {
            console.error("JWT_SECRET is not configured.");

            return res.status(500).json({
                success: false,
                message: "Authentication server configuration error."
            });
        }

        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        if (decoded.otpVerified !== true) {
            return res.status(401).json({
                success: false,
                message: "Email verification required. Please login again."
            });
        }

        const user = buildUserFromToken(decoded);

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Invalid authentication token."
            });
        }

        // Admin tokens must contain a session ID.
        // The admin middleware will verify it against PostgreSQL.
        if (user.isAdmin && !user.adminSessionId) {
            return res.status(401).json({
                success: false,
                message: "Administrator session is invalid. Please login again."
            });
        }

        attachUser(req, user);

        return next();

    } catch (error) {
        console.error("JWT ERROR:", error.message);

        if (error.name === "TokenExpiredError") {
            return res.status(401).json({
                success: false,
                message: "Session expired. Please login again."
            });
        }

        if (error.name === "JsonWebTokenError") {
            return res.status(401).json({
                success: false,
                message: "Invalid authentication token."
            });
        }

        return res.status(500).json({
            success: false,
            message: "Authentication failed."
        });
    }
};

// ======================================================
// RESET OPTIONAL AUTH USER
// ======================================================

const setGuestUser = (req) => {
    req.user = null;
    req.userId = null;
    req.isAdmin = false;
    req.adminSessionId = null;
    req.profileCompleted = false;
    req.isVerified = false;
};

// ======================================================
// OPTIONAL JWT AUTHENTICATION
// ======================================================

const optionalAuthMiddleware = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (
            !authHeader ||
            !authHeader.startsWith("Bearer ")
        ) {
            setGuestUser(req);
            return next();
        }

        const token = authHeader.substring(7).trim();

        if (!token || !process.env.JWT_SECRET) {
            setGuestUser(req);
            return next();
        }

        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        const user = buildUserFromToken(decoded);

        if (!user) {
            setGuestUser(req);
            return next();
        }

        attachUser(req, user);

        return next();

    } catch (error) {
        // Public routes continue as guest if the token
        // is missing, expired, malformed, or invalid.
        setGuestUser(req);
        return next();
    }
};

// ======================================================
// ATTACH OPTIONAL MIDDLEWARE
// ======================================================

authMiddleware.optional = optionalAuthMiddleware;

// ======================================================
// EXPORT
// ======================================================

module.exports = authMiddleware;
