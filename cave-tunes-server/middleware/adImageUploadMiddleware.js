
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

// ======================================================
// IMAGE ADVERTISEMENT UPLOAD DIRECTORY
// ======================================================

const uploadDirectory = path.join(
    __dirname,
    "..",
    "uploads",
    "ad-images"
);

// Create folder automatically if it does not exist
if (!fs.existsSync(uploadDirectory)) {
    fs.mkdirSync(uploadDirectory, { recursive: true });
}

// ======================================================
// ALLOWED IMAGE TYPES
// ======================================================

const allowedMimeTypes = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif"
};

// ======================================================
// STORAGE CONFIGURATION
// ======================================================

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDirectory);
    },

    filename: (req, file, cb) => {
        const extension = allowedMimeTypes[file.mimetype];

        if (!extension) {
            return cb(new Error("Unsupported image format."));
        }

        const uniqueFilename =
            `image-ad-${crypto.randomUUID()}${extension}`;

        cb(null, uniqueFilename);
    }
});

// ======================================================
// FILE VALIDATION
// ======================================================

function fileFilter(req, file, cb) {
    if (!allowedMimeTypes[file.mimetype]) {
        return cb(
            new Error(
                "Only JPG, PNG, WEBP and GIF images are allowed."
            )
        );
    }

    cb(null, true);
}

// ======================================================
// MULTER CONFIGURATION
// ======================================================

const adImageUpload = multer({
    storage,

    fileFilter,

    limits: {
        fileSize: 10 * 1024 * 1024, // 10 MB
        files: 1
    }
});

module.exports = adImageUpload;
