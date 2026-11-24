
const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");

const radioController = require("../controllers/radioController");

// ======================================================
// PUBLIC RADIO PROGRAMS
// ======================================================

router.get(
    "/programs",
    radioController.getPrograms
);

// ======================================================
// USER REMINDERS
// ======================================================

router.post(
    "/programs/:id/remind",
    authMiddleware,
    radioController.setProgramReminder
);

router.delete(
    "/programs/:id/remind",
    authMiddleware,
    radioController.cancelProgramReminder
);

router.get(
    "/programs/:id/reminder-status",
    authMiddleware,
    radioController.getReminderStatus
);

router.get(
    "/my-reminders",
    authMiddleware,
    radioController.getMyReminders
);

// ======================================================
// LIVE RADIO LISTENERS
// ======================================================

router.post(
    "/listeners/heartbeat",
    radioController.listenerHeartbeat
);

router.get(
    "/listeners/count",
    radioController.getListenerCount
);

module.exports = router;
