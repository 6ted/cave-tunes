const express = require("express");

const router = express.Router();


const authMiddleware =
require("../middleware/authMiddleware");


const creatorController =
require("../controllers/creatorController");



router.use(
    authMiddleware
);



router.post(
    "/monetization-request",
    creatorController.createMonetizationRequest
);

router.post(
    "/withdraw-request",
    creatorController.createWithdrawRequest
);


module.exports = router;