// ======================================================
// CAVE TUNES
// ADVERTISEMENT CONTROLLER
// controllers/adController.js
// ======================================================

const path = require("path");
const fs = require("fs");

const adService = require("../services/adService");

// ======================================================
// GET ALL ADS (ADMIN)
// ======================================================

exports.getAllAds = async (req, res) => {
    try {
        const ads = await adService.getAllAds();

        res.json({
            success: true,
            ads
        });

    } catch (error) {
        console.error("Get ads error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to retrieve advertisements."
        });
    }
};

// ======================================================
// GET ACTIVE ADS
// ======================================================

exports.getActiveAds = async (req, res) => {
    try {
        const ads = await adService.getActiveAds();

        res.json({
            success: true,
            ads
        });

    } catch (error) {
        console.error("Get active ads error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to retrieve active advertisements."
        });
    }
};

// ======================================================
// UPLOAD ADVERTISEMENT
// ======================================================

exports.uploadAd = async (req, res) => {
    let uploadedFilePath = null;

    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "Please select an advertisement audio file."
            });
        }

        uploadedFilePath = req.file.path;

        const title = req.body.title?.trim();

        if (!title) {
            fs.unlinkSync(uploadedFilePath);

            return res.status(400).json({
                success: false,
                message: "Advertisement title is required."
            });
        }

        // Extract actual audio duration
        const { parseFile } = await import("music-metadata");

        const metadata = await parseFile(uploadedFilePath);

        const duration = Math.ceil(metadata.format.duration || 0);

        if (!duration || duration <= 0) {
            fs.unlinkSync(uploadedFilePath);

            return res.status(400).json({
                success: false,
                message: "Could not determine the audio duration."
            });
        }

        const ad = await adService.createAd({
            title,
            description: req.body.description,
            fileName: req.file.filename,
            filePath: uploadedFilePath,
            mimeType: req.file.mimetype,
            duration,
            createdBy: req.adminUser.id
        });

        res.status(201).json({
            success: true,
            message: "Advertisement uploaded successfully.",
            ad
        });

    } catch (error) {
        console.error("Advertisement upload error:", error);

        if (uploadedFilePath && fs.existsSync(uploadedFilePath)) {
            fs.unlinkSync(uploadedFilePath);
        }

        res.status(500).json({
            success: false,
            message: "Failed to upload advertisement."
        });
    }
};

// ======================================================
// UPDATE ADVERTISEMENT
// ======================================================

exports.updateAd = async (req, res) => {
    try {
        const { title, description, priority } = req.body;

        const ad = await adService.updateAd(req.params.id, {
            title,
            description,
            priority
        });

        if (!ad) {
            return res.status(404).json({
                success: false,
                message: "Advertisement not found."
            });
        }

        res.json({
            success: true,
            message: "Advertisement updated successfully.",
            ad
        });

    } catch (error) {
        console.error("Update ad error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to update advertisement."
        });
    }
};

// ======================================================
// ACTIVATE / DEACTIVATE ADVERTISEMENT
// ======================================================

exports.updateAdStatus = async (req, res) => {
    try {
        const { is_active } = req.body;

        if (typeof is_active !== "boolean") {
            return res.status(400).json({
                success: false,
                message: "is_active must be true or false."
            });
        }

        const ad = await adService.setAdStatus(
            req.params.id,
            is_active
        );

        if (!ad) {
            return res.status(404).json({
                success: false,
                message: "Advertisement not found."
            });
        }

        res.json({
            success: true,
            message: "Advertisement status updated.",
            ad
        });

    } catch (error) {
        console.error("Update ad status error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to update advertisement status."
        });
    }
};

// ======================================================
// STREAM ADVERTISEMENT
// ======================================================

exports.streamAd = async (req, res) => {
    try {
        const ad = await adService.getAdById(req.params.id);

        if (!ad || !ad.is_active) {
            return res.status(404).json({
                success: false,
                message: "Advertisement not available."
            });
        }

        const filePath = path.resolve(ad.file_path);
        const adsDirectory = path.resolve(
            __dirname,
            "../uploads/ads"
        );

        // Ensure the requested file belongs to the ads directory
        if (
            !filePath.startsWith(adsDirectory + path.sep) ||
            !fs.existsSync(filePath)
        ) {
            return res.status(404).json({
                success: false,
                message: "Advertisement audio file not found."
            });
        }

        const stat = fs.statSync(filePath);
        const fileSize = stat.size;

        res.setHeader("Content-Type", ad.mime_type);
        res.setHeader("Accept-Ranges", "bytes");
        res.setHeader("Cache-Control", "no-store");

        const range = req.headers.range;

        if (range) {
            const parts = range.replace(/bytes=/, "").split("-");
            const start = Number(parts[0]);
            const end = parts[1]
                ? Number(parts[1])
                : fileSize - 1;

            if (
                !Number.isInteger(start) ||
                !Number.isInteger(end) ||
                start < 0 ||
                end >= fileSize ||
                start > end
            ) {
                return res.status(416).end();
            }

            res.status(206);

            res.setHeader(
                "Content-Range",
                `bytes ${start}-${end}/${fileSize}`
            );

            res.setHeader(
                "Content-Length",
                end - start + 1
            );

            fs.createReadStream(filePath, {
                start,
                end
            }).pipe(res);

        } else {
            res.setHeader("Content-Length", fileSize);

            fs.createReadStream(filePath).pipe(res);
        }

    } catch (error) {
        console.error("Stream ad error:", error);

        if (!res.headersSent) {
            res.status(500).json({
                success: false,
                message: "Failed to stream advertisement."
            });
        }
    }
};

// ======================================================
// DELETE ADVERTISEMENT
// ======================================================

exports.deleteAd = async (req, res) => {
    try {
        const ad = await adService.deleteAd(req.params.id);

        if (!ad) {
            return res.status(404).json({
                success: false,
                message: "Advertisement not found."
            });
        }

        res.json({
            success: true,
            message: "Advertisement deleted successfully."
        });

    } catch (error) {
        console.error("Delete ad error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to delete advertisement."
        });
    }
};