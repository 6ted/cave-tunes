const db = require("../config/database");
const walletService = require("../services/walletService");
// ======================================================
// GET VERIFICATION REQUESTS
// ======================================================
// ======================================================
// GET VERIFICATION REQUESTS
// ======================================================

exports.getVerificationRequests = async (req, res) => {

    try {

        const result = await db.query(`
            SELECT
                vr.id,
                vr.user_id,
                vr.role,
                vr.email,
                vr.country,
                vr.payment_method,
                vr.payment_proof_url,
                vr.verification_fee,
                vr.status,
                vr.created_at,
                vr.admin_notes,
                vr.reviewed_by,
                vr.reviewed_at,

                u.username

            FROM verification_requests vr

            LEFT JOIN users u
            ON vr.user_id = u.id

            ORDER BY vr.created_at DESC
        `);

        return res.json({
            success: true,
            requests: result.rows
        });

    } catch (error) {

        console.error(
            "GET VERIFICATION REQUESTS ERROR:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Unable to load verification requests."
        });

    }

};
// ======================================================
// UPDATE VERIFICATION REQUEST
// ======================================================
exports.updateVerificationRequest = async (req, res) => {

    try {

        const id = Number(req.params.id);
        const { status } = req.body;

        if (!["approved", "rejected", "pending"].includes(status)) {

            return res.status(400).json({
                success: false,
                message: "Invalid status."
            });

        }

        const request = await db.query(
            `
            SELECT *
            FROM verification_requests
            WHERE id = $1
            `,
            [id]
        );

        if (!request.rows.length) {

            return res.status(404).json({
                success: false,
                message: "Verification request not found."
            });

        }

        await db.query(
            `
            UPDATE verification_requests
            SET
                status = $1,
                reviewed_at = NOW()
            WHERE id = $2
            `,
            [status, id]
        );

        // Approve
        if (status === "approved") {

            await db.query(
                `
                UPDATE users
                SET verified = TRUE
                WHERE id = $1
                `,
                [request.rows[0].user_id]
            );

        }

        // Reject or Disapprove
        if (
            status === "rejected" ||
            status === "pending"
        ) {

            await db.query(
                `
                UPDATE users
                SET verified = FALSE
                WHERE id = $1
                `,
                [request.rows[0].user_id]
            );

        }

        return res.json({

            success: true,

            message:
                status === "approved"
                    ? "User verified."
                    : status === "pending"
                    ? "Verification removed."
                    : "Verification rejected."

        });

    } catch (error) {

        console.error(
            "UPDATE VERIFICATION ERROR:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Unable to update verification."
        });

    }

};


// ======================================================
// GET MONETIZATION REQUESTS
// ======================================================

exports.getMonetizationRequests = async (req, res) => {

    try {

        const result = await db.query(`
            SELECT
                m.id,
                m.user_id,
                m.status,
                m.created_at,

                u.username,
                u.email

            FROM monetization_requests m

            JOIN users u
            ON u.id = m.user_id

            ORDER BY m.created_at DESC
        `);

        return res.json({
            success: true,
            requests: result.rows
        });

    } catch (error) {

        console.error(
            "GET MONETIZATION REQUESTS ERROR:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Unable to load monetization requests."
        });

    }

};


// ======================================================
// UPDATE MONETIZATION REQUEST
// ======================================================

exports.updateMonetizationRequest = async (req, res) => {

    try {

        const id = Number(req.params.id);
        const { status } = req.body;

        if (!["approved", "rejected"].includes(status)) {

            return res.status(400).json({
                success: false,
                message: "Invalid status."
            });

        }

        const request = await db.query(`
            SELECT *
            FROM monetization_requests
            WHERE id = $1
        `, [id]);

        if (!request.rows.length) {

            return res.status(404).json({
                success: false,
                message: "Monetization request not found."
            });

        }

        await db.query(`
            UPDATE monetization_requests
            SET status = $1
            WHERE id = $2
        `, [status, id]);

        // Give the user monetization access
        if (status === "approved") {

            await db.query(`
                UPDATE users
                SET monetized = TRUE
                WHERE id = $1
            `, [request.rows[0].user_id]);

        }

        return res.json({
            success: true,
            message: `Monetization ${status}.`
        });

    } catch (error) {

        console.error(
            "UPDATE MONETIZATION ERROR:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Unable to update monetization request."
        });

    }

};

// ======================================================
// GET WITHDRAW REQUESTS
// ======================================================



exports.getWithdrawRequests = async (req, res) => {

    try {

        const requests =
            await walletService.getAdminWithdrawals();

        return res.json({
            success: true,
            requests
        });

    } catch (error) {

        console.error(
            "GET WITHDRAW REQUESTS ERROR:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Unable to load withdraw requests."
        });

    }

};


// ======================================================
// UPDATE WITHDRAW REQUEST
// ======================================================

exports.updateWithdrawRequest = async (req, res) => {

    try {

        const id = Number(req.params.id);
        const { status, reason } = req.body;

        if (!Number.isInteger(id) || id <= 0) {

            return res.status(400).json({
                success: false,
                message: "Invalid withdrawal request ID."
            });

        }


// ==================================================
// APPROVE / COMPLETE WITHDRAWAL
// ==================================================

if (
    status === "approved" ||
    status === "completed" ||
    status === "paid"
) {

    const withdrawal =
        await walletService.approveWithdrawal(
            id,
            req.user.id
        );

    return res.json({
        success: true,
        message: "Withdrawal completed successfully.",
        request: withdrawal
    });

}


        // ==================================================
        // REJECT
        // ==================================================

        if (status === "rejected") {

            const withdrawal =
                await walletService.rejectWithdrawal(
                    id,
                    req.user.id,
                    reason || null
                );

            return res.json({
                success: true,
                message: "Withdrawal rejected.",
                request: withdrawal
            });

        }


        // ==================================================
        // INVALID STATUS
        // ==================================================

        return res.status(400).json({
            success: false,
            message:
                "Invalid withdrawal status. Use approved or rejected."
        });

    } catch (error) {

        console.error(
            "UPDATE WITHDRAW ERROR:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                error.message ||
                "Unable to update withdraw request."
        });

    }

};