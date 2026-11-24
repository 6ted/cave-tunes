// ======================================================
// CAVE TUNES
// SCIZZOR ROUTES
// ======================================================

const express = require("express");

const multer = require("multer");

const path = require("path");

const fs = require("fs");

const { v4: uuidv4 } = require("uuid");

const authMiddleware = require("../middleware/authMiddleware");

const sizaroController = require(
    "../controllers/sizaroController"
);


const router = express.Router();


// ======================================================
// TEMPORARY STORAGE
// ======================================================

const tempFolder = path.join(
    __dirname,
    "..",
    "uploads",
    "temp"
);

if (!fs.existsSync(tempFolder)) {

    fs.mkdirSync(tempFolder, {
        recursive: true
    });

}


// ======================================================
// MULTER STORAGE
// ======================================================

const storage = multer.diskStorage({

    destination: (req, file, cb) => {

        cb(null, tempFolder);

    },

    filename: (req, file, cb) => {

        const extension = path.extname(
            file.originalname
        ).toLowerCase();

        cb(
            null,
            `${Date.now()}-${uuidv4()}${extension}`
        );

    }

});


// ======================================================
// ALLOWED VIDEO FORMATS
// ======================================================

const allowedVideoTypes = [

    "video/mp4",

    "video/webm",

    "video/quicktime",

    "video/x-matroska"

];


// ======================================================
// FILE FILTER
// ======================================================

function fileFilter(req, file, cb) {

    if (!allowedVideoTypes.includes(file.mimetype)) {

        return cb(
            new Error(
                "Unsupported video format. Upload MP4, WebM, MOV or MKV."
            )
        );

    }

    cb(null, true);

}


// ======================================================
// UPLOAD CONFIGURATION
// ======================================================

const upload = multer({

    storage,

    fileFilter,

    limits: {

        fileSize: 500 * 1024 * 1024,

        files: 1

    }

});


// ======================================================
// ROUTES
// ======================================================

// Check Scizzor availability.

router.get(

    "/status",

    authMiddleware,

    sizaroController.requirePremium,

    sizaroController.getStatus

);


// Upload and convert an authorized video.

router.post(

    "/convert",

    authMiddleware,

    sizaroController.requirePremium,

    upload.single("video_file"),

    sizaroController.convertVideo

);


// Get personal conversion library.

router.get(

    "/library",

    authMiddleware,

    sizaroController.requirePremium,

    sizaroController.getLibrary

);


// Download converted MP3.

router.get(

    "/download/:id",

    authMiddleware,

    sizaroController.requirePremium,

    sizaroController.downloadMp3

);


module.exports = router;