// ============================================================
// CAVE TUNES
// CREATOR VERIFICATION PAYMENT CONTROLLER
// ============================================================

const pool = require("../config/database");

const paychanguService =
    require("../services/paychanguService");


// ============================================================
// HELPER: RETURN URL
// ============================================================

function buildReturnUrl(params = {}) {

    const baseUrl =
        paychanguService.getVerificationReturnUrl();

    const url = new URL(baseUrl);

    Object.entries(params).forEach(([key, value]) => {

        if (value !== undefined && value !== null) {
            url.searchParams.set(key, String(value));
        }

    });

    return url.toString();
}


// ============================================================
// HELPER: VERIFY AND SAVE PAYMENT
// ============================================================

async function confirmVerificationPayment(payment) {

    if (!payment) {
        throw new Error("Payment record not found.");
    }

    if (payment.status === "completed") {
        return true;
    }

    const verification =
        await paychanguService.verifyTransaction(
            payment.provider_reference
        );

    const validation =
        paychanguService.validateVerifiedPayment({

            verification,

            expectedTxRef:
                payment.provider_reference,

            expectedAmount:
                Number(payment.amount_mwk),

            expectedCurrency:
                "MWK",

        });

    if (!validation.valid) {

        throw new Error(validation.reason);

    }

    await pool.query(
        `
        UPDATE creator_verification_payments

        SET
            status = 'completed',
            paid_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP

        WHERE
            id = $1
            AND user_id = $2
            AND provider_reference = $3
            AND amount_mwk = 50
            AND currency = 'MWK'
        `,
        [
            payment.id,
            payment.user_id,
            payment.provider_reference,
        ]
    );

    return true;
}


// ============================================================
// CREATE VERIFICATION CHECKOUT
//
// POST /api/creator/verification/payment
// ============================================================

async function createVerificationCheckout(req, res) {

    const userId = req.userId;

    try {

        // ------------------------------------------------------
        // FIND USER
        // ------------------------------------------------------

        const userResult = await pool.query(
            `
            SELECT
                id,
                username,
                email

            FROM users

            WHERE id = $1

            LIMIT 1
            `,
            [userId]
        );

        if (userResult.rows.length === 0) {

            return res.status(404).json({
                success: false,
                message: "User account could not be found.",
            });

        }

        const user = userResult.rows[0];


        // ------------------------------------------------------
        // CHECK FOR EXISTING VERIFICATION REQUEST
        // ------------------------------------------------------

        const requestResult = await pool.query(
            `
            SELECT id, status

            FROM verification_requests

            WHERE user_id = $1

            ORDER BY created_at DESC

            LIMIT 1
            `,
            [userId]
        );

        if (requestResult.rows.length > 0) {

            const existingRequest = requestResult.rows[0];

            if (
                ["pending", "approved"].includes(
                    String(existingRequest.status).toLowerCase()
                )
            ) {

                return res.status(409).json({
                    success: false,
                    message:
                        "You already have a pending or approved verification request.",
                });

            }

        }


        // ------------------------------------------------------
        // REUSE EXISTING PENDING CHECKOUT
        // ------------------------------------------------------

        const pendingResult = await pool.query(
            `
            SELECT *

            FROM creator_verification_payments

            WHERE
                user_id = $1
                AND status = 'pending'
                AND checkout_url IS NOT NULL
                AND verification_request_id IS NULL

            ORDER BY created_at DESC

            LIMIT 1
            `,
            [userId]
        );

        if (pendingResult.rows.length > 0) {

            const existing = pendingResult.rows[0];

            return res.status(200).json({

                success: true,

                existingPayment: true,

                message: "Your existing checkout is available.",

                payment: {
                    id: existing.id,
                    amountMwk: existing.amount_mwk,
                    currency: existing.currency,
                    status: existing.status,
                    txRef: existing.provider_reference,
                },

                checkout: {
                    checkoutUrl: existing.checkout_url,
                },

            });

        }


        // ------------------------------------------------------
        // GENERATE TRANSACTION REFERENCE
        // ------------------------------------------------------

        const txRef =
            paychanguService
                .generateVerificationTransactionReference(userId);


        // ------------------------------------------------------
        // CREATE DATABASE PAYMENT RECORD
        // ------------------------------------------------------

        const paymentResult = await pool.query(
            `
            INSERT INTO creator_verification_payments (

                user_id,
                amount_mwk,
                currency,
                payment_provider,
                provider_reference,
                status

            )

            VALUES ($1, 50, 'MWK', 'paychangu', $2, 'pending')

            RETURNING *
            `,
            [
                userId,
                txRef,
            ]
        );

        const payment = paymentResult.rows[0];


        // ------------------------------------------------------
        // CREATE PAYCHANGU CHECKOUT
        // ------------------------------------------------------

        const checkout =
            await paychanguService.createVerificationCheckout({

                payment,

                user,

                txRef,

            });


        // ------------------------------------------------------
        // SAVE CHECKOUT URL
        // ------------------------------------------------------

        await pool.query(
            `
            UPDATE creator_verification_payments

            SET
                checkout_url = $1,
                updated_at = CURRENT_TIMESTAMP

            WHERE id = $2
            `,
            [
                checkout.checkoutUrl,
                payment.id,
            ]
        );


        // ------------------------------------------------------
        // RESPONSE
        // ------------------------------------------------------

        console.log(
            "Creator verification checkout created:",
            {
                userId,
                paymentId: payment.id,
                txRef,
            }
        );

        return res.status(201).json({

            success: true,

            message: "Creator verification checkout created.",

            payment: {
                id: payment.id,
                amountMwk: 50,
                currency: "MWK",
                status: "pending",
                txRef,
            },

            checkout: {
                checkoutUrl: checkout.checkoutUrl,
            },

        });

    } catch (error) {

        console.error(
            "Creator verification checkout error:",
            error
        );

        return res.status(500).json({

            success: false,

            message:
                error.message ||
                "Unable to create verification checkout.",

        });

    }

}


// ============================================================
// PAYCHANGU CALLBACK
//
// GET /api/creator/verification/payment/callback
//
// PUBLIC ROUTE
// ============================================================

async function verificationPaymentCallback(req, res) {

    try {

        const txRef =
            req.query.tx_ref ||
            req.query.txRef;

        console.log(
            "Creator verification callback:",
            { txRef }
        );

        if (
            typeof txRef !== "string" ||
            !txRef.trim()
        ) {

            return res.status(400).send(
                "Missing transaction reference."
            );

        }


        // ------------------------------------------------------
        // FIND PAYMENT
        // ------------------------------------------------------

        const result = await pool.query(
            `
            SELECT *

            FROM creator_verification_payments

            WHERE provider_reference = $1

            LIMIT 1
            `,
            [txRef]
        );

        if (result.rows.length === 0) {

            return res.status(404).send(
                "Creator verification payment not found."
            );

        }

        const payment = result.rows[0];


        // ------------------------------------------------------
        // VERIFY PAYMENT
        // ------------------------------------------------------

        await confirmVerificationPayment(payment);


        // ------------------------------------------------------
        // REDIRECT USER
        // ------------------------------------------------------

        return res.redirect(
            buildReturnUrl({
                payment: "success",
                tx_ref: txRef,
            })
        );

    } catch (error) {

        console.error(
            "Creator verification callback error:",
            error
        );

        const txRef =
            req.query.tx_ref ||
            req.query.txRef ||
            "";

        try {

            return res.redirect(
                buildReturnUrl({
                    payment: "pending",
                    tx_ref: txRef,
                })
            );

        } catch {

            return res.status(500).send(
                "Payment verification could not be completed."
            );

        }

    }

}


// ============================================================
// CHECK PAYMENT STATUS
//
// GET /api/creator/verification/payment/status?tx_ref=...
//
// AUTHENTICATED ROUTE
// ============================================================

async function getVerificationPaymentStatus(req, res) {

    const userId = req.userId;

    try {

        const txRef =
            req.query.tx_ref ||
            req.query.txRef;

        if (
            typeof txRef !== "string" ||
            !txRef.trim()
        ) {

            return res.status(400).json({
                success: false,
                message: "Transaction reference is required.",
            });

        }


        // ------------------------------------------------------
        // USER-OWNED PAYMENT ONLY
        // ------------------------------------------------------

        const result = await pool.query(
            `
            SELECT *

            FROM creator_verification_payments

            WHERE
                provider_reference = $1
                AND user_id = $2

            LIMIT 1
            `,
            [
                txRef,
                userId,
            ]
        );

        if (result.rows.length === 0) {

            return res.status(404).json({
                success: false,
                message: "Payment could not be found.",
            });

        }

        let payment = result.rows[0];


        // ------------------------------------------------------
        // VERIFY IF STILL PENDING
        // ------------------------------------------------------

        if (payment.status === "pending") {

            try {

                await confirmVerificationPayment(payment);

            } catch (verificationError) {

                console.log(
                    "Verification payment not confirmed yet:",
                    verificationError.message
                );

            }

            const refreshed = await pool.query(
                `
                SELECT *

                FROM creator_verification_payments

                WHERE id = $1

                LIMIT 1
                `,
                [payment.id]
            );

            payment = refreshed.rows[0];

        }


        // ------------------------------------------------------
        // RESPONSE
        // ------------------------------------------------------

        return res.status(200).json({

            success: true,

            payment: {

                id: payment.id,

                amountMwk: Number(payment.amount_mwk),

                currency: payment.currency,

                status: payment.status,

                txRef: payment.provider_reference,

                paidAt: payment.paid_at,

            },

        });

    } catch (error) {

        console.error(
            "Get verification payment status error:",
            error
        );

        return res.status(500).json({

            success: false,

            message: "Unable to check payment status.",

        });

    }

}


// ============================================================
// EXPORTS
// ============================================================

module.exports = {

    createVerificationCheckout,

    verificationPaymentCallback,

    getVerificationPaymentStatus,

};