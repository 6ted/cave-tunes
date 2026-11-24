
const imageAdService = require("../services/imageAdService");
const fs = require("fs");

// ======================================================
// HELPERS
// ======================================================

function getUserId(req) {
    return req.userId || req.user?.id || null;
}

function validId(value) {
    const id = Number(value);

    return Number.isInteger(id) && id > 0 ? id : null;
}

function removeUploadedFile(file) {
    if (file?.path && fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
    }
}

function validPriority(value) {
    const priority = Number(value);

    return Number.isInteger(priority) && priority > 0
        ? priority
        : null;
}

// ======================================================
// GET ALL IMAGE ADVERTISEMENTS (ADMIN)
// GET /api/ads/images/admin
// ======================================================

exports.getAllImageAds = async (req, res) => {
    try {
        const ads = await imageAdService.getAllImageAds();

        return res.json({
            success: true,
            count: ads.length,
            ads
        });
    } catch (error) {
        console.error("Get image ads error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to retrieve image advertisements."
        });
    }
};

// ======================================================
// GET ACTIVE IMAGE ADVERTISEMENTS (PUBLIC)
// GET /api/ads/images/active
// ======================================================

exports.getActiveImageAds = async (req, res) => {
    try {
        const ads = await imageAdService.getActiveImageAds();

        return res.json({
            success: true,
            count: ads.length,
            ads
        });
    } catch (error) {
        console.error("Get active image ads error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to retrieve active image advertisements."
        });
    }
};

// ======================================================
// UPLOAD IMAGE ADVERTISEMENT
// POST /api/ads/images/admin/upload
// ======================================================

exports.uploadImageAd = async (req, res) => {
    try {
        const {
            title,
            description,
            click_url,
            alt_text,
            priority
        } = req.body;

        if (!title || !title.trim()) {
            removeUploadedFile(req.file);

            return res.status(400).json({
                success: false,
                message: "Advertisement title is required."
            });
        }

        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "Please select an image to upload."
            });
        }

        const parsedPriority = validPriority(priority || 1);

        if (!parsedPriority) {
            removeUploadedFile(req.file);

            return res.status(400).json({
                success: false,
                message: "Priority must be a positive whole number."
            });
        }

        const ad = await imageAdService.createImageAd({
            title: title.trim(),
            description,
            image_filename: req.file.filename,
            image_path: req.file.path,
            image_mime_type: req.file.mimetype,
            image_size: req.file.size,
            click_url,
            alt_text,
            priority: parsedPriority,
            created_by: getUserId(req)
        });

        return res.status(201).json({
            success: true,
            message: "Image advertisement uploaded successfully.",
            ad
        });
    } catch (error) {
        removeUploadedFile(req.file);

        console.error("Upload image ad error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to upload image advertisement."
        });
    }
};

// ======================================================
// UPDATE IMAGE ADVERTISEMENT
// PATCH /api/ads/images/admin/:id
// ======================================================

exports.updateImageAd = async (req, res) => {
    try {
        const id = validId(req.params.id);

        if (!id) {
            return res.status(400).json({
                success: false,
                message: "Invalid advertisement ID."
            });
        }

        const existingAd = await imageAdService.getImageAdById(id);

        if (!existingAd) {
            return res.status(404).json({
                success: false,
                message: "Image advertisement not found."
            });
        }

        const {
            title,
            description,
            click_url,
            alt_text,
            priority
        } = req.body;

        if (!title || !title.trim()) {
            return res.status(400).json({
                success: false,
                message: "Advertisement title is required."
            });
        }

        const parsedPriority = validPriority(priority);

        if (!parsedPriority) {
            return res.status(400).json({
                success: false,
                message: "Priority must be a positive whole number."
            });
        }

        const ad = await imageAdService.updateImageAd(id, {
            title: title.trim(),
            description,
            click_url,
            alt_text,
            priority: parsedPriority
        });

        return res.json({
            success: true,
            message: "Image advertisement updated successfully.",
            ad
        });
    } catch (error) {
        console.error("Update image ad error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to update image advertisement."
        });
    }
};

// ======================================================
// CHANGE IMAGE ADVERTISEMENT STATUS
// PATCH /api/ads/images/admin/:id/status
// ======================================================

exports.updateImageAdStatus = async (req, res) => {
    try {
        const id = validId(req.params.id);

        if (!id) {
            return res.status(400).json({
                success: false,
                message: "Invalid advertisement ID."
            });
        }

        const { is_active } = req.body;

        if (typeof is_active !== "boolean") {
            return res.status(400).json({
                success: false,
                message: "is_active must be true or false."
            });
        }

        const existingAd = await imageAdService.getImageAdById(id);

        if (!existingAd) {
            return res.status(404).json({
                success: false,
                message: "Image advertisement not found."
            });
        }

        const ad = await imageAdService.setImageAdStatus(
            id,
            is_active
        );

        return res.json({
            success: true,
            message: is_active
                ? "Image advertisement activated."
                : "Image advertisement deactivated.",
            ad
        });
    } catch (error) {
        console.error("Update image ad status error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to update advertisement status."
        });
    }
};

// ======================================================
// DELETE IMAGE ADVERTISEMENT
// DELETE /api/ads/images/admin/:id
// ======================================================

exports.deleteImageAd = async (req, res) => {
    try {
        const id = validId(req.params.id);

        if (!id) {
            return res.status(400).json({
                success: false,
                message: "Invalid advertisement ID."
            });
        }

        const ad = await imageAdService.deleteImageAd(id);

        if (!ad) {
            return res.status(404).json({
                success: false,
                message: "Image advertisement not found."
            });
        }

        return res.json({
            success: true,
            message: "Image advertisement deleted successfully."
        });
    } catch (error) {
        console.error("Delete image ad error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to delete image advertisement."
        });
    }
};
