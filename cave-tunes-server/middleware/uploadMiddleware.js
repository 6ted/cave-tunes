
// ======================================================
// CAVE TUNES
// UPLOAD MIDDLEWARE
// ======================================================

const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { v4: uuid } = require("uuid");


// ======================================================
// CREATE UPLOAD FOLDERS
// ======================================================

const uploadFolders = [

    "uploads",

    "uploads/artist_images",

    "uploads/audio",

    "uploads/covers",

    "uploads/lyrics",

    "uploads/videos",

    "uploads/dolby",

    "uploads/temp",

    // FEED IMAGES
    "uploads/feed_images"

];


uploadFolders.forEach(folder => {

    const folderPath = path.join(
        __dirname,
        "..",
        folder
    );

    if (!fs.existsSync(folderPath)) {

        fs.mkdirSync(
            folderPath,
            {
                recursive: true
            }
        );

        console.log(
            "📁 Created:",
            folder
        );

    }

});


// ======================================================
// STORAGE
// ======================================================

const storage = multer.diskStorage({

    destination(req, file, cb) {

        let destination = "uploads/temp";

        switch (file.fieldname) {

            case "audio":

                destination = "uploads/audio";

                break;
case "sizaro_video":

    destination = "uploads/videos";

    break;

            case "cover":

                destination = "uploads/covers";

                break;


            case "lyrics":

                destination = "uploads/lyrics";

                break;


            case "canvas_video":

                destination = "uploads/videos";

                break;


            case "dolby_file":

                destination = "uploads/dolby";

                break;


            case "profile_image":

                destination = "uploads/artist_images";

                break;


            // FEED IMAGES
            case "feed_images":

                destination = "uploads/feed_images";

                break;

        }


        cb(
            null,
            path.join(
                __dirname,
                "..",
                destination
            )
        );

    },


    filename(req, file, cb) {

        const extension = path.extname(
            file.originalname
        ).toLowerCase();


        cb(
            null,
            `${Date.now()}-${uuid()}${extension}`
        );

    }

});


// ======================================================
// FILE FILTER
// ======================================================

function fileFilter(req, file, cb) {

    const allowed = {

        audio: [

            "audio/mpeg",
            "audio/mp3",
            "audio/wav",
            "audio/x-wav",
            "audio/wave",
            "audio/flac",
            "audio/x-flac",
            "audio/mp4",
            "audio/aac",
            "audio/ogg",
            "application/octet-stream"

        ],


        cover: [

            "image/jpeg",
            "image/png",
            "image/webp"

        ],

sizaro_video: [

    "video/mp4",
    "video/webm",
    "video/quicktime",
    "video/x-matroska"
],

        lyrics: [

            "text/plain",
            "application/pdf"

        ],


        canvas_video: [

            "video/mp4",
            "video/webm"

        ],


        dolby_file: [

            "audio/wav",
            "audio/x-wav",
            "audio/flac",
            "audio/x-flac"

        ],


        profile_image: [

            "image/jpeg",
            "image/png",
            "image/webp"

        ],


        // FEED IMAGES
        feed_images: [

            "image/jpeg",
            "image/png",
            "image/webp"

        ]

    };


    const allowedTypes = allowed[file.fieldname];


    if (!allowedTypes) {

        return cb(
            new Error(
                `Unknown upload field: ${file.fieldname}`
            )
        );

    }


    if (!allowedTypes.includes(file.mimetype)) {

        return cb(
            new Error(
                `Unsupported file type: ${file.originalname}`
            )
        );

    }


    cb(null, true);

}


// ======================================================
// MULTER CONFIGURATION
// ======================================================

const upload = multer({

    storage,

    fileFilter,

    limits: {

        // Default maximum single file size: 2GB
        fileSize: 2 * 1024 * 1024 * 1024,

        // Maximum files for existing upload operations
        files: 100

    }

});


// ======================================================
// FEED IMAGE UPLOAD CONFIGURATION
// ======================================================

// Maximum 10 images per post.
// Maximum 10MB per image.

const feedImageUpload = upload.fields([

    {
        name: "feed_images",
        maxCount: 10
    }

]);


// Apply a smaller file-size limit specifically
// to Feed image uploads.

const uploadFeedImages = (req, res, next) => {

    const feedUploader = multer({

        storage,

        fileFilter,

        limits: {

            fileSize: 10 * 1024 * 1024,

            files: 10

        }

    }).array("feed_images", 10);


    feedUploader(req, res, (err) => {

        if (err) {

            if (err instanceof multer.MulterError) {

                if (err.code === "LIMIT_FILE_SIZE") {

                    return res.status(400).json({

                        success: false,

                        message: "Each Feed image must be 10MB or smaller."

                    });

                }


                if (err.code === "LIMIT_FILE_COUNT") {

                    return res.status(400).json({

                        success: false,

                        message: "You can upload a maximum of 10 images per post."

                    });

                }

            }


            return res.status(400).json({

                success: false,

                message: err.message

            });

        }


        next();

    });

};


// ======================================================
// EXPORTS
// ======================================================

// Keep the original export working.
// Existing music upload routes remain compatible.

module.exports = upload;

// Additional Feed upload middleware.

module.exports.uploadFeedImages = uploadFeedImages;

