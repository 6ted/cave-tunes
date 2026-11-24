// ======================================================
// CAVE TUNES
// ADVERTISEMENT AUDIO UPLOAD MIDDLEWARE
// middleware/adUploadMiddleware.js
// ======================================================

const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { v4: uuidv4 } = require("uuid");

const uploadDirectory = path.join(
    __dirname,
    "../uploads/ads"
);

// Ensure advertisement directory exists
if (!fs.existsSync(uploadDirectory)) {
    fs.mkdirSync(uploadDirectory, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDirectory);
    },

    filename: (req, file, cb) => {
        const extension = path.extname(file.originalname).toLowerCase();

        const filename = `${Date.now()}-${uuidv4()}${extension}`;

        cb(null, filename);
    }
});

const allowedMimeTypes = [
    "audio/mpeg",
    "audio/mp3",
    "audio/wav",
    "audio/x-wav",
    "audio/flac",
    "audio/aac",
    "audio/ogg",
    "audio/mp4",
    "audio/x-m4a"
];

const fileFilter = (req, file, cb) => {
    if (allowedMimeTypes.includes(file.mimetype)) {
        return cb(null, true);
    }

    cb(new Error("Unsupported advertisement audio format."));
};

const adUpload = multer({
    storage,
    fileFilter,

    limits: {
        fileSize: 100 * 1024 * 1024, // 100MB
        files: 1
    }
});

module.exports = adUpload;