
// ======================================================
// CAVE TUNES AUTH ROUTES
// routes/authRoutes.js
// ======================================================

const express = require("express");
const passport = require("passport");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const router = express.Router();

// ======================================================
// CONTROLLER
// ======================================================

const authController =
    require("../controllers/authController");

// ======================================================
// AUTH MIDDLEWARE
// ======================================================

const authMiddleware =
    require("../middleware/authMiddleware");


// ======================================================
// SOCIAL MEDIA DECLARE
// ======================================================

    const socialLinksController =
    require("../controllers/socialLinksController");
// ======================================================
// ARTIST / PROFILE IMAGE UPLOAD
// ======================================================

const uploadDir = path.join(
    __dirname,
    "../uploads/artist_images"
);

// Create folder if it does not exist

if (!fs.existsSync(uploadDir)) {

    fs.mkdirSync(
        uploadDir,
        {
            recursive: true
        }
    );

}

// ======================================================
// MULTER STORAGE
// ======================================================

const storage = multer.diskStorage({

    destination: (req, file, cb) => {

        cb(
            null,
            uploadDir
        );

    },

    filename: (req, file, cb) => {

        const ext =
            path.extname(
                file.originalname
            ).toLowerCase();

        const userId =
            req.userId || "unknown";

        cb(
            null,
            `artist_${userId}_${Date.now()}${ext}`
        );

    }

});

// ======================================================
// IMAGE FILTER
// ======================================================

const fileFilter = (req, file, cb) => {

    const allowedTypes = [

        "image/jpeg",
        "image/png",
        "image/webp"

    ];

    if (
        allowedTypes.includes(
            file.mimetype
        )
    ) {

        cb(null, true);

        return;

    }

    cb(
        new Error(
            "Only JPG, PNG and WEBP images are allowed."
        )
    );

};

// ======================================================
// MULTER
// ======================================================

const upload = multer({

    storage,

    fileFilter,

    limits: {

        fileSize:
            10 * 1024 * 1024

    }

});

// ======================================================
// AUTH API HOME
// ======================================================

router.get(
    "/",
    (req, res) => {

        return res.json({

            success: true,

            application:
                "Cave Tunes Auth API",

            status:
                "Running",

            endpoints: {

                register:
                    "POST /api/auth/register",

                login:
                    "POST /api/auth/login",

 verifyOtp:
        "POST /api/auth/verify-otp",

    resendOtp:
        "POST /api/auth/resend-otp",



                me:
                    "GET /api/auth/me",

                google:
                    "GET /api/auth/google",

                googleCallback:
                    "GET /api/auth/google/callback",

                updateProfile:
                    "POST /api/auth/update-profile",

                profileCompatibility:
                    "POST /api/auth/profile",

                creators:
                    "GET /api/auth/creators",

                creator:
                    "GET /api/auth/creators/:id",

                artists:
                    "GET /api/auth/artists",

                logout:
                    "POST /api/auth/logout"

            }

        });

    }
);

// ======================================================
// TEST
// ======================================================

router.get(
    "/test",
    (req, res) => {

        return res.json({

            success: true,

            message:
                "Auth routes working 🚀"

        });

    }
);

// ======================================================
// REGISTER
// ======================================================

router.post(
    "/register",
    authController.register
);

// ======================================================
// LOGIN
// ======================================================

router.post(
    "/login",
    authController.login
);

// ======================================================
// EMAIL OTP VERIFICATION
// ======================================================

router.post(
    "/verify-otp",
    authController.verifyOtp
);

// ======================================================
// RESEND EMAIL OTP
// ======================================================

router.post(
    "/resend-otp",
    authController.resendOtp
);


// ======================================================
// CURRENT USER
//
// This route is important for the admin feature.
//
// The controller should return:
//
// is_admin: true / false
//
// The React frontend can then determine whether
// the Admin Panel button should be visible.
//
// IMPORTANT:
// The backend is still the authority.
// The frontend visibility is NOT security.
// ======================================================

router.get(
    "/me",
    authMiddleware,
    authController.me
);

// ======================================================
// CREATOR DIRECTORY
// ======================================================

router.get(
    "/creators",
    authController.getCreatorsByRole
);


// ======================================================
// CREATOR DIRECTORY
// ======================================================

router.get(
    "/creators",
    authController.getCreatorsByRole
);

// ======================================================
// POPULAR CREATORS
// IMPORTANT: Keep this BEFORE /creators/:id
// ======================================================

router.get(
    "/creators/popular",
    authController.getPopularCreators
);

// ======================================================
// TRENDING IN LISTENER'S COUNTRY
// Artists, Albums, EPs and Singles
// ======================================================

router.get(
    "/trending-in-country",
    authMiddleware.optional,
    authController.getTrendingInCountry
);

// ======================================================
// SOCIAL MEDIA LINKS
// ======================================================

// Logged-in user: retrieve their links
router.get(
    "/social-links",
    authMiddleware,
    socialLinksController.getMySocialLinks
);

// Logged-in user: save or replace their links
router.put(
    "/social-links",
    authMiddleware,
    socialLinksController.saveMySocialLinks
);

// ======================================================
// SINGLE CREATOR PROFILE
// ======================================================

router.get(
    "/creators/:id",
    authMiddleware.optional,
    authController.getCreatorProfile
);

router.post(
    "/creators/:id/follow",
    authMiddleware,
    authController.toggleCreatorFollow
);


// ======================================================
// SINGLE CREATOR PROFILE
// ======================================================

router.get(
    "/creators/:id",
    authMiddleware.optional,
    authController.getCreatorProfile
);

router.post(
    "/creators/:id/follow",
    authMiddleware,
    authController.toggleCreatorFollow
);


// ======================================================
// GOOGLE LOGIN
// ======================================================

router.get(
    "/google",
    passport.authenticate(
        "google",
        {
            scope: [
                "profile",
                "email"
            ],
            session: false
        }
    )
);

// ======================================================
// GOOGLE CALLBACK
// ======================================================

router.get(
    "/google/callback",

    passport.authenticate(
        "google",
        {
            session: false,

            failureRedirect:
                "http://localhost:5173/signup?error=google_failed"
        }
    ),

    authController.googleCallback
);

// ======================================================
// UPDATE PROFILE
// ======================================================
//
// IMPORTANT SECURITY RULE:
//
// The frontend may update:
//
// - username
// - country
// - phone
// - profile image
//
// It MUST NOT be allowed to update:
//
// - is_admin
// - role
//
// The controller should preserve those values from
// the database.
//
// ======================================================

router.post(
    "/update-profile",

    authMiddleware,

    upload.single(
        "profile_image"
    ),

    authController.updateProfile
);

// ======================================================
// PROFILE COMPATIBILITY ROUTE
// ======================================================
//
// Your existing React frontend may still call:
//
// POST /api/auth/profile
//
// Keep this route so we do not break it.
//

router.post(
    "/profile",

    authMiddleware,

    upload.single(
        "profile_image"
    ),

    authController.updateProfile
);


router.get(
    "/users/search",
    authController.searchUsers
);


// ======================================================
// LOGOUT
// ======================================================
//
// JWT authentication is stateless, so the frontend
// normally removes the token from localStorage.
//
// This endpoint is kept for compatibility.
//

router.post(
    "/logout",
    authMiddleware,
    authController.logout
);

// ======================================================
// GET ALL ARTISTS
// ======================================================

router.get(
    "/artists",
    authController.artists
);



// ======================================================
// MULTER / PROFILE IMAGE ERROR HANDLER
// ======================================================

router.use(
    (err, req, res, next) => {

        console.error(
            "AUTH ROUTE ERROR:",
            err
        );

        if (
            err instanceof multer.MulterError
        ) {

            return res.status(400).json({

                success: false,

                message:
                    err.message ||
                    "File upload error."

            });

        }

        if (err) {

            return res.status(400).json({

                success: false,

                message:
                    err.message ||
                    "Upload error."

            });

        }

        next();

    }
);

// ======================================================
// EXPORT
// ======================================================

module.exports = router;

