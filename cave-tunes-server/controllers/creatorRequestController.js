const db = require("../config/database");

const {
    createNotification
} = require("../services/notificationService");

const paychanguService = require("../services/paychanguService");

// ======================================================
// CAVE TUNES MONETIZATION REQUIREMENTS
// ======================================================

const REQUIRED_MONETIZATION_PLAYS = 1000;
const REQUIRED_MONETIZATION_FOLLOWERS = 1000;
// ======================================================
// CAVE TUNES
// MONETIZATION / CREATOR REQUEST CONTROLLER
// ======================================================


// ======================================================
// NOTIFY ALL ADMINISTRATORS
//
// createNotification() automatically creates:
// 1. In-app notification
// 2. Email notification through Resend
//
// If one admin notification fails, the request itself
// must still succeed.
// ======================================================

async function notifyAdministrators({
    type,
    title,
    message,
    actionUrl = null,
    metadata = {},
    actorUserId = null
}) {
    try {
        const adminsResult = await db.query(`
            SELECT
                id
            FROM users
            WHERE is_admin = TRUE
               OR role = 'admin'
        `);

        for (const admin of adminsResult.rows) {
            try {
                await createNotification({
                    userId: admin.id,
                    actorUserId,
                    type,
                    title,
                    message,
                    actionUrl,
                    metadata
                });
            } catch (notificationError) {
                console.error(
                    `ADMIN NOTIFICATION ERROR FOR ADMIN ${admin.id}:`,
                    notificationError
                );
            }
        }
    } catch (error) {
        console.error(
            "GET ADMINISTRATORS FOR NOTIFICATION ERROR:",
            error
        );
    }
}


// ======================================================
// SEND VERIFICATION REQUEST
// ======================================================
// ======================================================
// SEND VERIFICATION REQUEST
//
// PAYCHANGU PAYMENT REQUIRED
//
// SECURITY:
// 1. Verify transaction directly with PayChangu.
// 2. Confirm payment belongs to authenticated user.
// 3. Confirm exact amount and currency.
// 4. Prevent payment reuse.
// 5. Link payment and request atomically.
// 6. Admin approval is still required.
// ======================================================

exports.createVerificationRequest = async (req, res) => {
    let client;
    let transactionStarted = false;

    try {
        // ==================================================
        // AUTHENTICATED USER
        // ==================================================

        const userId = req.user.id;

        const {
            role,
            email,
            country,
            tx_ref
        } = req.body;

        // ==================================================
        // VALIDATE TRANSACTION REFERENCE
        // ==================================================

        const txRef = String(tx_ref || "").trim();

        if (!txRef) {
            return res.status(400).json({
                success: false,
                message: "PayChangu transaction reference is required."
            });
        }

        // ==================================================
        // PAYMENT PROOF
        // ==================================================

        const paymentProof = req.file
            ? `/uploads/payment-proofs/${req.file.filename}`
            : null;

        if (!paymentProof) {
            return res.status(400).json({
                success: false,
                message: "Payment screenshot is required."
            });
        }

        // ==================================================
        // FIND PAYMENT
        //
        // The payment must belong to the logged-in user.
        // ==================================================

        const paymentResult = await db.query(`
            SELECT
                id,
                user_id,
                amount_mwk,
                currency,
                payment_provider,
                provider_reference,
                status,
                verification_request_id
            FROM creator_verification_payments
            WHERE provider_reference = $1
              AND user_id = $2
            LIMIT 1
        `, [
            txRef,
            userId
        ]);

        if (paymentResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Verification payment could not be found."
            });
        }

        const payment = paymentResult.rows[0];

        // ==================================================
        // CHECK PAYMENT DETAILS
        // ==================================================

        if (
            Number(payment.amount_mwk) !== 50 ||
            payment.currency !== "MWK" ||
            payment.payment_provider !== "paychangu"
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid verification payment details."
            });
        }

        // ==================================================
        // CHECK PAYMENT STATUS
        // ==================================================

        if (payment.status !== "completed") {
            return res.status(400).json({
                success: false,
                message: "Your PayChangu payment has not been confirmed yet."
            });
        }

        // ==================================================
        // PREVENT PAYMENT REUSE
        // ==================================================

        if (payment.verification_request_id !== null) {
            return res.status(400).json({
                success: false,
                message: "This payment has already been used for a verification request."
            });
        }

        // ==================================================
        // VERIFY DIRECTLY WITH PAYCHANGU
        //
        // Never trust the frontend or callback URL alone.
        // ==================================================

        const verification =
            await paychanguService.verifyTransaction(txRef);

        const validation =
            paychanguService.validateVerifiedPayment({
                verification,
                expectedTxRef: txRef,
                expectedAmount: 50,
                expectedCurrency: "MWK"
            });

        if (
            validation === false ||
            validation?.valid === false
        ) {
            return res.status(400).json({
                success: false,
                message: "PayChangu could not confirm this payment."
            });
        }

        // ==================================================
        // START POSTGRESQL TRANSACTION
        //
        // Payment linking and request creation must succeed
        // together or fail together.
        // ==================================================

        client = await db.connect();

        await client.query("BEGIN");
        transactionStarted = true;

        // ==================================================
        // LOCK USER ROW
        //
        // Helps prevent simultaneous duplicate submissions.
        // ==================================================

        await client.query(`
            SELECT id
            FROM users
            WHERE id = $1
            FOR UPDATE
        `, [userId]);

        // ==================================================
        // LOCK PAYMENT ROW
        // ==================================================

        const lockedPaymentResult = await client.query(`
            SELECT
                id,
                user_id,
                amount_mwk,
                currency,
                payment_provider,
                provider_reference,
                status,
                verification_request_id
            FROM creator_verification_payments
            WHERE id = $1
              AND user_id = $2
            FOR UPDATE
        `, [
            payment.id,
            userId
        ]);

        if (lockedPaymentResult.rows.length === 0) {
            await client.query("ROLLBACK");
            transactionStarted = false;

            return res.status(404).json({
                success: false,
                message: "Verification payment could not be found."
            });
        }

        const lockedPayment = lockedPaymentResult.rows[0];

        // ==================================================
        // RECHECK PAYMENT AFTER LOCKING
        // ==================================================

        if (
            lockedPayment.status !== "completed" ||
            Number(lockedPayment.amount_mwk) !== 50 ||
            lockedPayment.currency !== "MWK" ||
            lockedPayment.payment_provider !== "paychangu" ||
            lockedPayment.verification_request_id !== null
        ) {
            await client.query("ROLLBACK");
            transactionStarted = false;

            return res.status(400).json({
                success: false,
                message: "This payment is invalid or has already been used."
            });
        }

        // ==================================================
        // CHECK EXISTING PENDING REQUEST
        // ==================================================

        const existing = await client.query(`
            SELECT id
            FROM verification_requests
            WHERE user_id = $1
              AND status = 'pending'
            LIMIT 1
        `, [userId]);

        if (existing.rows.length > 0) {
            await client.query("ROLLBACK");
            transactionStarted = false;

            return res.status(400).json({
                success: false,
                message: "You already have a pending verification request."
            });
        }

        // ==================================================
        // CREATE VERIFICATION REQUEST
        // ==================================================

        const result = await client.query(`
            INSERT INTO verification_requests
            (
                user_id,
                role,
                email,
                country,
                payment_method,
                payment_proof_url,
                verification_fee,
                status
            )
            VALUES
            (
                $1,
                $2,
                $3,
                $4,
                'PayChangu',
                $5,
                50,
                'pending'
            )
            RETURNING *
        `, [
            userId,
            role || null,
            email || null,
            country || null,
            paymentProof
        ]);

        const request = result.rows[0];

        // ==================================================
        // LINK PAYMENT TO REQUEST
        //
        // This prevents the same payment from being reused.
        // ==================================================

        const linkedPayment = await client.query(`
            UPDATE creator_verification_payments
            SET
                verification_request_id = $1,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $2
              AND user_id = $3
              AND status = 'completed'
              AND verification_request_id IS NULL
            RETURNING id
        `, [
            request.id,
            payment.id,
            userId
        ]);

        if (linkedPayment.rowCount !== 1) {
            throw new Error(
                "Unable to link verification payment to request."
            );
        }

        // ==================================================
        // COMMIT
        // ==================================================

        await client.query("COMMIT");
        transactionStarted = false;

        // ==================================================
        // NOTIFY USER
        // ==================================================

        try {
            await createNotification({
                userId,

                type: "verification_submitted",

                title: "Verification request submitted",

                message:
                    "Your Cave Tunes verification request has been received and is now pending review.",

                actionUrl: "/verification",

                metadata: {
                    request_id: request.id,
                    request_type: "verification",
                    status: "pending",
                    payment_reference: txRef
                }
            });

        } catch (notificationError) {
            console.error(
                "VERIFICATION USER NOTIFICATION ERROR:",
                notificationError
            );
        }

        // ==================================================
        // NOTIFY ADMINISTRATORS
        // ==================================================

        await notifyAdministrators({
            type: "verification_submitted",

            title: "New verification request",

            message:
                "A new Cave Tunes verification request has been submitted and is waiting for your review.",

            actionUrl: "/admin/verification",

            actorUserId: userId,

            metadata: {
                request_id: request.id,
                request_type: "verification",
                status: "pending",
                user_id: userId,
                payment_reference: txRef,
                verification_fee: 50
            }
        });

        // ==================================================
        // SUCCESS
        // ==================================================

        return res.status(201).json({
            success: true,

            message:
                "Verification request submitted successfully. Your payment has been confirmed and your request is awaiting admin approval.",

            request
        });

    } catch (error) {

        // ==================================================
        // ROLLBACK IF SOMETHING FAILS
        // ==================================================

        if (client && transactionStarted) {
            try {
                await client.query("ROLLBACK");
            } catch (rollbackError) {
                console.error(
                    "VERIFICATION TRANSACTION ROLLBACK ERROR:",
                    rollbackError
                );
            }
        }

        console.error(
            "CREATE VERIFICATION REQUEST ERROR:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Unable to submit verification request."
        });

    } finally {

        if (client) {
            client.release();
        }
    }
};

// ======================================================
// GET MY VERIFICATION REQUEST
// ======================================================

exports.getMyVerificationRequest = async (req, res) => {
    try {

        const userId = req.user.id;

        const result = await db.query(`
            SELECT *
            FROM verification_requests
            WHERE user_id = $1
            ORDER BY created_at DESC
            LIMIT 1
        `, [userId]);


        return res.json({
            success: true,
            request:
                result.rows[0] || null
        });

    } catch (error) {

        console.error(
            "GET VERIFICATION REQUEST ERROR:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Unable to get verification request."
        });
    }
};


// ======================================================
// SEND MONETIZATION REQUEST
//
// STEP 01
// Application / eligibility
//
// STEP 02
// Payout setup
//
// STEP 03
// Review / final submission
//
// IMPORTANT:
// Eligibility is ALWAYS calculated from PostgreSQL.
// Frontend eligibility values are never trusted.
// ======================================================

exports.createMonetizationRequest = async (req, res) => {
    try {

        // ==================================================
        // AUTHENTICATED USER
        // ==================================================

        const userId = req.user.id;


        // ==================================================
        // RECEIVE COMPLETE 3-STEP APPLICATION
        // ==================================================

        const {
            application,
            payout,
            review
        } = req.body;


        // ==================================================
        // BASIC VALIDATION
        // ==================================================

        if (
            !application ||
            typeof application !== "object"
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Monetization application information is required."
            });
        }


        if (
            !payout ||
            typeof payout !== "object"
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Payout information is required."
            });
        }


        // ==================================================
        // STEP 01
        // ==================================================

        const {
            creatorType,
            primaryContent,
            audienceSize,
            uploadFrequency,
            monetizationGoal,
            ownsContent,
            followsPolicies,
            accurateInformation
        } = application;


        // ==================================================
        // VALIDATE STEP 01
        // ==================================================

        if (!creatorType) {
            return res.status(400).json({
                success: false,
                message:
                    "Creator type is required."
            });
        }


        if (!primaryContent) {
            return res.status(400).json({
                success: false,
                message:
                    "Primary content type is required."
            });
        }


        if (!audienceSize) {
            return res.status(400).json({
                success: false,
                message:
                    "Audience size is required."
            });
        }


        if (!uploadFrequency) {
            return res.status(400).json({
                success: false,
                message:
                    "Release frequency is required."
            });
        }


        if (!monetizationGoal) {
            return res.status(400).json({
                success: false,
                message:
                    "Monetization goal is required."
            });
        }


        // ==================================================
        // CREATOR DECLARATIONS
        // ==================================================

        if (!ownsContent) {
            return res.status(400).json({
                success: false,
                message:
                    "You must confirm that you own or have the necessary rights to your content."
            });
        }


        if (!followsPolicies) {
            return res.status(400).json({
                success: false,
                message:
                    "You must agree to follow Cave Tunes policies."
            });
        }


        if (!accurateInformation) {
            return res.status(400).json({
                success: false,
                message:
                    "You must confirm that the information provided is accurate."
            });
        }


        // ==================================================
        // DATABASE ELIGIBILITY
        // ==================================================

        const userResult = await db.query(`
            SELECT
                id,
                username,
                email,
                verified,
                is_admin
            FROM users
            WHERE id = $1
            LIMIT 1
        `, [userId]);


        if (userResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message:
                    "User account could not be found."
            });
        }


        const user = userResult.rows[0];


        // ==================================================
        // REAL VERIFICATION STATUS
        // ==================================================

        const verified =
            Boolean(user.verified);


        // ==================================================
        // REAL ADMIN STATUS
        // ==================================================

        const isAdmin =
            Boolean(user.is_admin);


        // ==================================================
        // COUNT REAL FOLLOWERS
        // ==================================================

        const followersResult =
            await db.query(`
                SELECT
                    COUNT(*)::integer AS followers_count
                FROM followers
                WHERE artist_id = $1
            `, [userId]);


        const followersCount =
            Number(
                followersResult.rows[0]
                    ?.followers_count || 0
            );


        // ==================================================
        // GET HIGHEST SONG PLAYS
        // ==================================================

        const playsResult =
            await db.query(`
                SELECT
                    COALESCE(
                        MAX(COALESCE(plays, 0)),
                        0
                    )::integer AS highest_song_plays
                FROM songs
                WHERE user_id = $1
            `, [userId]);


        const highestSongPlays =
            Number(
                playsResult.rows[0]
                    ?.highest_song_plays || 0
            );


        // ======================================================
// NORMAL MONETIZATION REQUIREMENTS
//
// Verified creator
// 1,000 followers
// 1,000 plays on at least one song
// ======================================================

const requirementsComplete =
    verified &&
    followersCount >= REQUIRED_MONETIZATION_FOLLOWERS &&
    highestSongPlays >= REQUIRED_MONETIZATION_PLAYS;


        // ==================================================
        // FINAL ELIGIBILITY
        //
        // ADMIN = BYPASS
        // ==================================================

        const eligibleToSubmit =
            requirementsComplete ||
            isAdmin;


        // ==================================================
        // BLOCK NON-ELIGIBLE CREATOR
        // ==================================================

        if (!eligibleToSubmit) {
            return res.status(403).json({
                success: false,
                message:
                    "You do not currently meet the Cave Tunes monetization requirements.",

                eligibility: {
                    verified,

                    followers_count:
                        followersCount,

                    highest_song_plays:
                        highestSongPlays,

                    is_admin:
                        isAdmin,

                requirements: {
    verified,

    followers:
        followersCount >= REQUIRED_MONETIZATION_FOLLOWERS,

    plays:
        highestSongPlays >= REQUIRED_MONETIZATION_PLAYS
},

                    requirements_complete:
                        requirementsComplete,

                    eligible_to_submit:
                        false
                }
            });
        }


        // ==================================================
        // STEP 02
        // PAYOUT DETAILS
        // ==================================================

        const {
            payoutMethod,
            accountHolderName
        } = payout;


        if (!payoutMethod) {
            return res.status(400).json({
                success: false,
                message:
                    "Payout method is required."
            });
        }


        // ==================================================
        // VALID PAYOUT METHODS
        // ==================================================

        const allowedPayoutMethods = [
            "airtel_money",
            "tnm_mpamba",
            "bank_transfer"
        ];


        if (
            !allowedPayoutMethods.includes(
                payoutMethod
            )
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Invalid payout method."
            });
        }


        // ==================================================
        // ACCOUNT HOLDER
        // ==================================================

        if (
            !accountHolderName ||
            !accountHolderName.trim()
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Account holder name is required."
            });
        }


        if (
            accountHolderName.trim().length < 2
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Please provide a valid account holder name."
            });
        }


        // ==================================================
        // MOBILE MONEY VALIDATION
        // ==================================================

        if (
            payoutMethod === "airtel_money" ||
            payoutMethod === "tnm_mpamba"
        ) {

            if (
                !payout.phoneNumber ||
                !String(
                    payout.phoneNumber
                ).trim()
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Mobile money phone number is required."
                });
            }


            const phone =
                String(
                    payout.phoneNumber
                )
                .replace(/\s+/g, "")
                .trim();


            // Supports:
            // 0881234567
            // 881234567
            // +265881234567
            // 265881234567

            const normalizedPhone =
                phone
                    .replace(/^\+265/, "")
                    .replace(/^265/, "");


            if (
                !/^(0?(88|99|98|89|21))\d{7}$/
                    .test(normalizedPhone)
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Please provide a valid Malawi mobile phone number."
                });
            }
        }


        // ==================================================
        // BANK VALIDATION
        // ==================================================

        if (
            payoutMethod === "bank_transfer"
        ) {

            if (
                !payout.bankName ||
                !payout.bankName.trim()
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Bank name is required."
                });
            }


            if (
                !payout.accountNumber ||
                !String(
                    payout.accountNumber
                ).trim()
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Bank account number is required."
                });
            }


            const accountNumber =
                String(
                    payout.accountNumber
                )
                .replace(/\s+/g, "")
                .trim();


            if (
                !/^\d{6,30}$/.test(
                    accountNumber
                )
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Please provide a valid bank account number."
                });
            }


            if (!payout.accountType) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Bank account type is required."
                });
            }


            const allowedAccountTypes = [
                "savings",
                "current",
                "business"
            ];


            if (
                !allowedAccountTypes.includes(
                    payout.accountType
                )
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Invalid bank account type."
                });
            }


            if (
                !payout.branchName ||
                !payout.branchName.trim()
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Bank branch name is required."
                });
            }
        }


        // ==================================================
        // STEP 03
        // REVIEW DATA
        // ==================================================

        const reviewData =
            review &&
            typeof review === "object"
                ? review
                : {};


        // ==================================================
        // CHECK EXISTING PENDING REQUEST
        // ==================================================

        const existing =
            await db.query(`
                SELECT id
                FROM monetization_requests
                WHERE user_id = $1
                AND status = 'pending'
                LIMIT 1
            `, [userId]);


        if (
            existing.rows.length > 0
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "You already have a pending monetization request."
            });
        }


        // ==================================================
        // BUILD CLEAN APPLICATION DATA
        // ==================================================

        const applicationData = {

            creatorType:
                typeof creatorType === "string"
                    ? creatorType.trim()
                    : creatorType,

            primaryContent:
                typeof primaryContent === "string"
                    ? primaryContent.trim()
                    : primaryContent,

            audienceSize:
                typeof audienceSize === "string"
                    ? audienceSize.trim()
                    : audienceSize,

            uploadFrequency:
                typeof uploadFrequency === "string"
                    ? uploadFrequency.trim()
                    : uploadFrequency,

            monetizationGoal:
                typeof monetizationGoal === "string"
                    ? monetizationGoal.trim()
                    : monetizationGoal,

            ownsContent:
                Boolean(ownsContent),

            followsPolicies:
                Boolean(followsPolicies),

            accurateInformation:
                Boolean(accurateInformation)
        };


        // ==================================================
        // DATABASE-TRUSTED ELIGIBILITY SNAPSHOT
        // ==================================================

        const eligibilitySnapshot = {

            verified,

            followers_count:
                followersCount,

            highest_song_plays:
                highestSongPlays,

            is_admin:
                isAdmin,

            requirements: {

                verified,

                followers:
                    followersCount >= 100,

                plays:
                    highestSongPlays >= 500
            },

            requirements_complete:
                requirementsComplete,

            eligible_to_submit:
                eligibleToSubmit,

            captured_at:
                new Date().toISOString()
        };


        // ==================================================
        // CLEAN PAYOUT DATA
        // ==================================================

        const payoutDetails = {

            payoutMethod,

            accountHolderName:
                accountHolderName.trim()
        };


        // ==================================================
        // MOBILE MONEY
        // ==================================================

        if (
            payoutMethod === "airtel_money" ||
            payoutMethod === "tnm_mpamba"
        ) {

            payoutDetails.phoneNumber =
                String(
                    payout.phoneNumber
                )
                .replace(/\s+/g, "")
                .trim();
        }


        // ==================================================
        // BANK
        // ==================================================

        if (
            payoutMethod === "bank_transfer"
        ) {

            payoutDetails.bankName =
                payout.bankName.trim();


            payoutDetails.accountNumber =
                String(
                    payout.accountNumber
                )
                .replace(/\s+/g, "")
                .trim();


            payoutDetails.accountType =
                payout.accountType;


            payoutDetails.branchName =
                payout.branchName.trim();


            payoutDetails.bankCode =
                payout.bankCode
                    ? String(
                        payout.bankCode
                    ).trim()
                    : null;
        }


        // ==================================================
        // CREATE MONETIZATION REQUEST
        // ==================================================

        const result =
            await db.query(`
                INSERT INTO monetization_requests
                (
                    user_id,
                    status,
                    application_data,
                    payout_details,
                    eligibility_snapshot,
                    review_data,
                    submitted_at
                )
                VALUES
                (
                    $1,
                    'pending',
                    $2::jsonb,
                    $3::jsonb,
                    $4::jsonb,
                    $5::jsonb,
                    CURRENT_TIMESTAMP
                )
                RETURNING *
            `, [
                userId,

                JSON.stringify(
                    applicationData
                ),

                JSON.stringify(
                    payoutDetails
                ),

                JSON.stringify(
                    eligibilitySnapshot
                ),

                JSON.stringify(
                    reviewData
                )
            ]);


        const request =
            result.rows[0];


        // ==================================================
        // NOTIFY USER
        // ==================================================

        try {

            await createNotification({

                userId,

                type:
                    "monetization_submitted",

                title:
                    "Monetization application submitted",

                message:
                    "Your Cave Tunes monetization application has been received and is now pending review.",

                actionUrl:
                    "/monetization",

                metadata: {

                    request_id:
                        request.id,

                    request_type:
                        "monetization",

                    status:
                        "pending"
                }
            });

        } catch (notificationError) {

            console.error(
                "MONETIZATION USER NOTIFICATION ERROR:",
                notificationError
            );
        }


        // ==================================================
        // NOTIFY ADMINS
        //
        // Every admin receives:
        // - In-app notification
        // - Email notification
        // ==================================================

        await notifyAdministrators({

            type:
                "monetization_submitted",

            title:
                "New monetization application",

            message:
                "A new Cave Tunes monetization application has been submitted and is waiting for your review.",

            actionUrl:
                "/admin/monetization",

            actorUserId:
                userId,

            metadata: {

                request_id:
                    request.id,

                request_type:
                    "monetization",

                status:
                    "pending",

                user_id:
                    userId
            }
        });


        // ==================================================
        // SUCCESS
        // ==================================================

        return res.status(201).json({

            success: true,

            message:
                "Your Cave Tunes monetization request has been submitted successfully.",

            request
        });

    } catch (error) {

        console.error(
            "CREATE MONETIZATION REQUEST ERROR:",
            error
        );

        return res.status(500).json({

            success: false,

            message:
                "Unable to submit monetization request."
        });
    }
};


// ======================================================
// GET MY MONETIZATION REQUEST
// ======================================================

exports.getMyMonetizationRequest = async (req, res) => {
    try {

        const userId = req.user.id;

        const result = await db.query(`
            SELECT *
            FROM monetization_requests
            WHERE user_id = $1
            ORDER BY created_at DESC
            LIMIT 1
        `, [userId]);


        return res.json({

            success: true,

            request:
                result.rows[0] || null
        });

    } catch (error) {

        console.error(
            "GET MY MONETIZATION REQUEST ERROR:",
            error
        );

        return res.status(500).json({

            success: false,

            message:
                "Unable to get your monetization request."
        });
    }
};


// ======================================================
// GET MONETIZATION ELIGIBILITY
// ======================================================

exports.getMonetizationEligibility = async (req, res) => {
    try {

        const userId = req.user.id;


        // ==================================================
        // GET USER
        // ==================================================

        const userResult = await db.query(`
            SELECT
                id,
                username,
                email,
                role,
                country,
                verified,
                is_admin,
                monetized
            FROM users
            WHERE id = $1
            LIMIT 1
        `, [userId]);


        if (userResult.rows.length === 0) {
            return res.status(404).json({

                success: false,

                message:
                    "Creator account could not be found."
            });
        }


        const user =
            userResult.rows[0];


        // ==================================================
        // FOLLOWER COUNT
        // ==================================================

        const followersResult =
            await db.query(`
                SELECT
                    COUNT(*)::integer AS followers_count
                FROM followers
                WHERE artist_id = $1
            `, [userId]);


        const followers =
            Number(
                followersResult.rows[0]
                    ?.followers_count || 0
            );


        // ==================================================
        // HIGHEST SONG PLAYS
        // ==================================================

        const playsResult =
            await db.query(`
                SELECT
                    COALESCE(
                        MAX(COALESCE(plays, 0)),
                        0
                    )::integer AS highest_song_plays
                FROM songs
                WHERE user_id = $1
            `, [userId]);


        const highestPlays =
            Number(
                playsResult.rows[0]
                    ?.highest_song_plays || 0
            );


        // ==================================================
        // ADMIN
        // ==================================================

        const isAdmin =
            Boolean(
                user.is_admin ||
                user.role === "admin"
            );


        // ==================================================
        // REQUIREMENTS
        // ==================================================

        const verified =
            Boolean(user.verified);


        const verifiedRequirement =
            verified;


      const followersRequirement =
    followers >= REQUIRED_MONETIZATION_FOLLOWERS;

const playsRequirement =
    highestPlays >= REQUIRED_MONETIZATION_PLAYS;


        const requirementsComplete =
            verifiedRequirement &&
            followersRequirement &&
            playsRequirement;


        // ==================================================
        // CAN CONTINUE
        // ==================================================

        const canContinue =
            requirementsComplete ||
            isAdmin;


        // ==================================================
        // RESPONSE
        // ==================================================

        return res.json({

            success: true,

            eligibility: {

                verified,

                followers_count:
                    followers,

                highest_song_plays:
                    highestPlays,

                requirements: {

                    verified:
                        verifiedRequirement,

                    followers:
                        followersRequirement,

                    plays:
                        playsRequirement
                },

                requirements_complete:
                    requirementsComplete,

                is_admin:
                    isAdmin,

                can_continue:
                    canContinue
            },

            creator: {

                id:
                    user.id,

                username:
                    user.username,

                email:
                    user.email,

                role:
                    user.role,

                country:
                    user.country,

                verified:
                    user.verified,

                is_admin:
                    isAdmin,

                monetized:
                    Boolean(user.monetized)
            }
        });

    } catch (error) {

        console.error(
            "GET MONETIZATION ELIGIBILITY ERROR:",
            error
        );

        return res.status(500).json({

            success: false,

            message:
                "Unable to check monetization eligibility."
        });
    }
};


// ======================================================
// SEND WITHDRAW REQUEST
// ======================================================

exports.createWithdrawRequest = async (req, res) => {
    try {

        const userId =
            req.user.id;


        const {
            amount,
            payment_method,
            account_details
        } = req.body;


        // ==================================================
        // BASIC VALIDATION
        // ==================================================

        if (
            !amount ||
            Number(amount) <= 0
        ) {
            return res.status(400).json({

                success: false,

                message:
                    "A valid withdrawal amount is required."
            });
        }


        // ==================================================
        // CREATE WITHDRAWAL REQUEST
        // ==================================================

        const result =
            await db.query(`
                INSERT INTO withdraw_requests
                (
                    user_id,
                    amount,
                    payment_method,
                    account_details,
                    status
                )
                VALUES
                (
                    $1,
                    $2,
                    $3,
                    $4,
                    'pending'
                )
                RETURNING *
            `, [

                userId,

                amount,

                payment_method || null,

                account_details || null
            ]);


        const request =
            result.rows[0];


        // ==================================================
        // NOTIFY USER
        // ==================================================

        try {

            await createNotification({

                userId,

                type:
                    "withdrawal_submitted",

                title:
                    "Withdrawal request submitted",

                message:
                    "Your Cave Tunes withdrawal request has been received and is now pending review.",

                actionUrl:
                    "/wallet",

                metadata: {

                    request_id:
                        request.id,

                    request_type:
                        "withdrawal",

                    status:
                        "pending",

                    amount:
                        amount
                }
            });

        } catch (notificationError) {

            console.error(
                "WITHDRAWAL USER NOTIFICATION ERROR:",
                notificationError
            );
        }


        // ==================================================
        // NOTIFY ADMINS
        //
        // Every admin receives:
        // - In-app notification
        // - Email notification
        // ==================================================

        await notifyAdministrators({

            type:
                "withdrawal_submitted",

            title:
                "New withdrawal request",

            message:
                "A new Cave Tunes withdrawal request has been submitted and is waiting for your review.",

            actionUrl:
                "/admin/withdrawals",

            actorUserId:
                userId,

            metadata: {

                request_id:
                    request.id,

                request_type:
                    "withdrawal",

                status:
                    "pending",

                user_id:
                    userId,

                amount:
                    amount
            }
        });


        // ==================================================
        // SUCCESS
        // ==================================================

        return res.status(201).json({

            success: true,

            message:
                "Withdrawal request submitted.",

            request
        });

    } catch (error) {

        console.error(
            "CREATE WITHDRAW REQUEST ERROR:",
            error
        );

        return res.status(500).json({

            success: false,

            message:
                "Unable to submit withdrawal request."
        });
    }
};