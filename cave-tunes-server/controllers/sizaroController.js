// ======================================================
// CAVE TUNES
// SCIZZOR CONTROLLER
//
// Authorized video-to-MP3 conversion
// Premium protection through PostgreSQL
// ======================================================

const db = require("../config/database");

const path = require("path");
const fs = require("fs");

const { convertToMp3 } = require("../services/audioConverter");


// ======================================================
// STORAGE PATHS
// ======================================================

const AUDIO_FOLDER = path.join(
    __dirname,
    "..",
    "uploads",
    "audio"
);

const TEMP_FOLDER = path.join(
    __dirname,
    "..",
    "uploads",
    "temp"
);


// Ensure storage folders exist.

[AUDIO_FOLDER, TEMP_FOLDER].forEach(folder => {

    if (!fs.existsSync(folder)) {

        fs.mkdirSync(folder, {
            recursive: true
        });

    }

});


// ======================================================
// HELPER: CHECK PREMIUM SUBSCRIPTION
// ======================================================

async function checkPremium(userId) {

    const result = await db.query(

        `
        SELECT
            s.id AS subscription_id,
            s.user_id,
            s.status,
            s.starts_at,
            s.expires_at,

            p.name AS plan_name,
            p.slug AS plan_slug

        FROM subscriptions s

        INNER JOIN subscription_plans p
            ON p.id = s.plan_id

        WHERE s.user_id = $1

        AND s.status = 'active'

        AND s.starts_at <= NOW()

        AND s.expires_at > NOW()

        AND p.is_active = TRUE

        ORDER BY s.expires_at DESC

        LIMIT 1
        `,

        [userId]

    );

    return result.rows[0] || null;

}


// ======================================================
// PREMIUM MIDDLEWARE
// ======================================================

exports.requirePremium = async (req, res, next) => {

    try {

        if (!req.user || !req.user.id) {

            return res.status(401).json({

                success: false,

                message: "Authentication required."

            });

        }

        const subscription = await checkPremium(
            req.user.id
        );

        if (!subscription) {

            return res.status(403).json({

                success: false,

                premium_required: true,

                message:
                    "An active Premium subscription is required to use Scizzor."

            });

        }

        req.premiumSubscription = subscription;

        next();

    } catch (error) {

        console.error(
            "Scizzor Premium Check Error:",
            error
        );

        res.status(500).json({

            success: false,

            message: "Unable to verify Premium subscription."

        });

    }

};


// ======================================================
// CONVERT VIDEO TO MP3
// POST /api/sizaro/convert
// ======================================================

exports.convertVideo = async (req, res) => {

    let conversionId = null;

    let convertedFile = null;

    try {

        const userId = req.user.id;

        // ----------------------------------------------
        // CHECK UPLOADED FILE
        // ----------------------------------------------

        if (!req.file) {

            return res.status(400).json({

                success: false,

                message: "Please upload a video file."

            });

        }

        const videoFile = req.file;

        // ----------------------------------------------
        // VIDEO TITLE
        // ----------------------------------------------

        const title = (

            req.body.title ||

            path.parse(videoFile.originalname).name

        ).trim().slice(0, 500);

        // ----------------------------------------------
        // CREATE CONVERSION RECORD
        // ----------------------------------------------

        const record = await db.query(

            `
            INSERT INTO sizaro_conversions (

                user_id,

                original_title,

                original_source,

                source_reference,

                status

            )

            VALUES ($1, $2, 'authorized_upload', NULL, 'processing')

            RETURNING id
            `,

            [
                userId,
                title || "Untitled Conversion"
            ]

        );

        conversionId = record.rows[0].id;

        // ----------------------------------------------
        // START FFMPEG CONVERSION
        // ----------------------------------------------

        console.log(
            "🎵 Scizzor conversion started:",
            conversionId
        );

        convertedFile = await convertToMp3({

            ...videoFile,

            originalname: videoFile.originalname

        });

        // ----------------------------------------------
        // VERIFY OUTPUT
        // ----------------------------------------------

        if (
            !convertedFile ||
            !convertedFile.path ||
            !fs.existsSync(convertedFile.path)
        ) {

            throw new Error(
                "MP3 conversion failed. Output file was not created."
            );

        }

        const fileSize = fs.statSync(
            convertedFile.path
        ).size;

        // ----------------------------------------------
        // SAVE COMPLETED CONVERSION
        // ----------------------------------------------

        const fileUrl = `/api/sizaro/download/${conversionId}`;

        await db.query(

            `
            UPDATE sizaro_conversions

            SET

                filename = $1,

                file_url = $2,

                file_size = $3,

                status = 'completed',

                error_message = NULL,

                completed_at = NOW()

            WHERE id = $4

            AND user_id = $5
            `,

            [
                convertedFile.filename,
                fileUrl,
                fileSize,
                conversionId,
                userId
            ]

        );

        console.log(
            "✅ Scizzor conversion completed:",
            conversionId
        );

        // ----------------------------------------------
        // RESPONSE
        // ----------------------------------------------

        return res.status(201).json({

            success: true,

            message: "Video successfully converted to MP3.",

            conversion: {

                id: conversionId,

                title,

                filename: convertedFile.filename,

                file_url: fileUrl,

                file_size: fileSize,

                status: "completed"

            }

        });

    } catch (error) {

        console.error(
            "Scizzor Conversion Error:",
            error
        );

        // ----------------------------------------------
        // REMOVE FAILED OUTPUT
        // ----------------------------------------------

        if (
            convertedFile &&
            convertedFile.path &&
            fs.existsSync(convertedFile.path)
        ) {

            try {

                fs.unlinkSync(convertedFile.path);

            } catch (cleanupError) {

                console.error(
                    "Output cleanup error:",
                    cleanupError.message
                );

            }

        }

        // ----------------------------------------------
        // SAVE FAILURE
        // ----------------------------------------------

        if (conversionId) {

            try {

                await db.query(

                    `
                    UPDATE sizaro_conversions

                    SET

                        status = 'failed',

                        error_message = $1

                    WHERE id = $2

                    AND user_id = $3
                    `,

                    [
                        error.message.substring(0, 1000),
                        conversionId,
                        req.user.id
                    ]

                );

            } catch (databaseError) {

                console.error(
                    "Conversion database update error:",
                    databaseError.message
                );

            }

        }

        return res.status(500).json({

            success: false,

            message: "Unable to convert this video.",

            error:
                process.env.NODE_ENV === "production"
                    ? undefined
                    : error.message

        });

    } finally {

        // ----------------------------------------------
        // REMOVE TEMPORARY VIDEO
        // ----------------------------------------------

        if (
            req.file &&
            req.file.path &&
            fs.existsSync(req.file.path)
        ) {

            try {

                fs.unlinkSync(req.file.path);

                console.log(
                    "🗑️ Temporary video removed."
                );

            } catch (error) {

                console.error(
                    "Temporary file cleanup error:",
                    error.message
                );

            }

        }

    }

};


// ======================================================
// GET USER CONVERSION LIBRARY
// GET /api/sizaro/library
// ======================================================

exports.getLibrary = async (req, res) => {

    try {

        const result = await db.query(

            `
            SELECT

                id,

                original_title,

                original_source,

                filename,

                file_url,

                file_size,

                status,

                error_message,

                created_at,

                completed_at

            FROM sizaro_conversions

            WHERE user_id = $1

            ORDER BY created_at DESC

            LIMIT 100
            `,

            [req.user.id]

        );

        res.json({

            success: true,

            count: result.rows.length,

            conversions: result.rows

        });

    } catch (error) {

        console.error(
            "Scizzor Library Error:",
            error
        );

        res.status(500).json({

            success: false,

            message: "Unable to retrieve your Scizzor library."

        });

    }

};


// ======================================================
// SECURE MP3 DOWNLOAD
// GET /api/sizaro/download/:id
// ======================================================

exports.downloadMp3 = async (req, res) => {

    try {

        const userId = req.user.id;

        const conversionId = Number(req.params.id);

        if (
            !Number.isSafeInteger(conversionId) ||
            conversionId <= 0
        ) {

            return res.status(400).json({

                success: false,

                message: "Invalid conversion ID."

            });

        }

        // ----------------------------------------------
        // CHECK FILE OWNERSHIP
        // ----------------------------------------------

        const result = await db.query(

            `
            SELECT

                id,

                user_id,

                original_title,

                filename,

                status

            FROM sizaro_conversions

            WHERE id = $1

            AND user_id = $2

            LIMIT 1
            `,

            [
                conversionId,
                userId
            ]

        );

        if (result.rows.length === 0) {

            return res.status(404).json({

                success: false,

                message: "Conversion not found."

            });

        }

        const conversion = result.rows[0];

        if (conversion.status !== "completed") {

            return res.status(400).json({

                success: false,

                message: "This conversion is not ready for download."

            });

        }

        // ----------------------------------------------
        // VALIDATE FILE PATH
        // ----------------------------------------------

        if (
            !conversion.filename ||
            path.basename(conversion.filename) !== conversion.filename
        ) {

            return res.status(400).json({

                success: false,

                message: "Invalid audio file."

            });

        }

        const filePath = path.join(
            AUDIO_FOLDER,
            conversion.filename
        );

        if (!fs.existsSync(filePath)) {

            return res.status(404).json({

                success: false,

                message: "MP3 file is no longer available."

            });

        }

        // ----------------------------------------------
        // DOWNLOAD
        // ----------------------------------------------

        const downloadName =

            conversion.original_title
                .replace(/[<>:"/\\|?*\x00-\x1F]/g, "_")
                .trim()
                .slice(0, 150) || "Cave-Tunes-Audio";

        res.download(

            filePath,

            `${downloadName}.mp3`,

            error => {

                if (error) {

                    console.error(
                        "Scizzor Download Error:",
                        error.message
                    );

                }

            }

        );

    } catch (error) {

        console.error(
            "Scizzor Download Error:",
            error
        );

        if (!res.headersSent) {

            res.status(500).json({

                success: false,

                message: "Unable to download MP3."

            });

        }

    }

};


// ======================================================
// SCIZZOR STATUS
// GET /api/sizaro/status
// ======================================================

exports.getStatus = async (req, res) => {

    try {

        const subscription = req.premiumSubscription;

        res.json({

            success: true,

            service: "Cave Tunes Scizzor",

            available: true,

            premium: true,

            plan: subscription.plan_name,

            expires_at: subscription.expires_at

        });

    } catch (error) {

        res.status(500).json({

            success: false,

            message: "Unable to retrieve Scizzor status."

        });

    }

};