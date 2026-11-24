
// ======================================================
// CAVE TUNES UPLOAD SYSTEM
// UPLOAD ROUTES
// ======================================================

const express = require("express");

const router = express.Router();

// ======================================================
// MIDDLEWARE
// ======================================================

const authMiddleware =
    require("../middleware/authMiddleware");

const requireVerifiedUser =
    require("../middleware/verifiedMiddleware");

const upload =
    require("../middleware/uploadMiddleware");

// ======================================================
// CONTROLLERS
// ======================================================

const {
    uploadSong
} = require("../controllers/uploadController");

// ======================================================
// SONG UPLOAD ROUTE
// ======================================================
//
// POST /api/upload/song
//
// Access:
// Authenticated + verified users only.
//
// Maximum:
// 30 audio tracks
// 1 cover image
// 1 lyrics file
//
// ======================================================

router.post(
    "/song",

    // 1. Authenticate user
    authMiddleware,

    // 2. Require verified account
    requireVerifiedUser,

    // 3. Process upload files
    upload.fields([

        {
            name: "audio",
            maxCount: 30
        },

        {
            name: "cover",
            maxCount: 1
        },

        {
            name: "lyrics",
            maxCount: 1
        }

    ]),

    // 4. Create songs
    uploadSong
);

// ======================================================
// EXPORTS
// ======================================================

module.exports = router;
