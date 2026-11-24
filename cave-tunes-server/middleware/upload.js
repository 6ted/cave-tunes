const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Create upload folders if they don't exist
const folders = {
    audio: "uploads/audio",
    covers: "uploads/covers",
    lyrics: "uploads/lyrics",
    canvas: "uploads/canvas",
    dolby: "uploads/dolby"
};

Object.values(folders).forEach(folder => {
    if (!fs.existsSync(folder)) {
        fs.mkdirSync(folder, { recursive: true });
    }
});

// Configure storage
const storage = multer.diskStorage({

    destination: (req, file, cb) => {

        switch (file.fieldname) {

            case "audio":
                cb(null, folders.audio);
                break;

            case "cover":
                cb(null, folders.covers);
                break;

            case "lyrics":
                cb(null, folders.lyrics);
                break;

            case "canvas":
                cb(null, folders.canvas);
                break;

            case "dolby":
                cb(null, folders.dolby);
                break;

            default:
                cb(new Error("Unknown upload field"), null);
        }

    },

    filename: (req, file, cb) => {

        const uniqueName =
            Date.now() +
            "-" +
            Math.round(Math.random() * 1E9) +
            path.extname(file.originalname);

        cb(null, uniqueName);

    }

});

// File filter
const fileFilter = (req, file, cb) => {

    if (file.fieldname === "audio") {

        const allowed = [
            "audio/mpeg",
            "audio/mp3",
            "audio/wav",
            "audio/x-wav",
            "audio/flac",
            "audio/x-flac"
        ];

        return allowed.includes(file.mimetype)
            ? cb(null, true)
            : cb(new Error("Invalid audio format"));

    }

    if (file.fieldname === "cover") {

        const allowed = [
            "image/jpeg",
            "image/png",
            "image/webp"
        ];

        return allowed.includes(file.mimetype)
            ? cb(null, true)
            : cb(new Error("Invalid cover image"));

    }

    cb(null, true);

};

const upload = multer({

    storage,

    fileFilter,

    limits: {

        fileSize: 500 * 1024 * 1024 // 500MB

    }

});

module.exports = upload;