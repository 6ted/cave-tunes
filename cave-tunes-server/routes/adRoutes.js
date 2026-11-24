
const express = require("express");
const router = express.Router();

// ======================================================
// EXISTING AUDIO ADVERTISEMENT IMPORTS
// ======================================================

const adController = require("../controllers/adController");
const adUpload = require("../middleware/adUploadMiddleware");

// ======================================================
// IMAGE ADVERTISEMENT IMPORTS
// ======================================================

const imageAdController = require("../controllers/imageAdController");
const adImageUpload = require("../middleware/adImageUploadMiddleware");

// ======================================================
// AUTHENTICATION
// ======================================================

const authMiddleware = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");

// ======================================================
// PUBLIC AUDIO ADVERTISEMENT ROUTES
// ======================================================

// Get active audio advertisements
router.get("/active", adController.getActiveAds);

// Stream audio advertisement
router.get("/:id/stream", adController.streamAd);

// ======================================================
// PUBLIC IMAGE ADVERTISEMENT ROUTES
// ======================================================

// Get active image advertisements
router.get(
    "/images/active",
    imageAdController.getActiveImageAds
);

// ======================================================
// ADMIN AUTHENTICATION
// All routes below this point require admin access
// ======================================================

router.use(authMiddleware, adminMiddleware);

// ======================================================
// EXISTING AUDIO ADMIN ROUTES
// ======================================================

// Get all audio advertisements
router.get("/admin", adController.getAllAds);

// Upload audio advertisement
router.post(
    "/admin/upload",
    adUpload.single("ad_audio"),
    adController.uploadAd
);

// Update audio advertisement
router.patch("/admin/:id", adController.updateAd);

// Activate / deactivate audio advertisement
router.patch(
    "/admin/:id/status",
    adController.updateAdStatus
);

// Delete audio advertisement
router.delete("/admin/:id", adController.deleteAd);

// ======================================================
// IMAGE ADMIN ROUTES
// ======================================================

// Get all image advertisements
router.get(
    "/images/admin",
    imageAdController.getAllImageAds
);

// Upload image advertisement
router.post(
    "/images/admin/upload",
    adImageUpload.single("ad_image"),
    imageAdController.uploadImageAd
);

// Update image advertisement
router.patch(
    "/images/admin/:id",
    imageAdController.updateImageAd
);

// Activate / deactivate image advertisement
router.patch(
    "/images/admin/:id/status",
    imageAdController.updateImageAdStatus
);

// Delete image advertisement
router.delete(
    "/images/admin/:id",
    imageAdController.deleteImageAd
);

module.exports = router;
