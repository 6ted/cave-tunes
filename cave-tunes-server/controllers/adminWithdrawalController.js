// ======================================================
// CAVE TUNES
// ADMIN WITHDRAWAL CONTROLLER
// ======================================================

const walletService =
    require("../services/walletService");


// ======================================================
// ADMIN AUTHORIZATION
// ======================================================

function requireAdmin(req) {

    if (
        !req.user ||
        !req.user.is_admin
    ) {
        const error =
            new Error(
                "Administrator access required."
            );

        error.statusCode = 403;

        throw error;
    }
}


// ======================================================
// GET WITHDRAWALS
// GET /api/admin/withdrawals
// ======================================================

async function getWithdrawals(
    req,
    res
) {

    try {

        requireAdmin(req);

        const withdrawals =
            await walletService
                .getAdminWithdrawals();

        return res.json({

            success: true,

            withdrawals
        });

    } catch (error) {

        console.error(
            "Admin get withdrawals error:",
            error
        );

        return res.status(
            error.statusCode || 500
        ).json({

            success: false,

            message:
                error.message ||
                "Failed to load withdrawals."
        });
    }
}


// ======================================================
// APPROVE
// POST /api/admin/withdrawals/:id/approve
// ======================================================

async function approveWithdrawal(
    req,
    res
) {

    try {

        requireAdmin(req);

        const withdrawalId =
            Number(
                req.params.id
            );

        if (
            !Number.isInteger(
                withdrawalId
            ) ||
            withdrawalId <= 0
        ) {
            return res.status(400).json({

                success: false,

                message:
                    "Invalid withdrawal ID."
            });
        }


        const withdrawal =
            await walletService
                .approveWithdrawal(
                    withdrawalId,
                    req.user.id
                );


        return res.json({

            success: true,

            message:
                "Withdrawal approved successfully.",

            withdrawal
        });

    } catch (error) {

        console.error(
            "Admin approve withdrawal error:",
            error
        );

        return res.status(
            error.statusCode || 400
        ).json({

            success: false,

            message:
                error.message ||
                "Failed to approve withdrawal."
        });
    }
}


// ======================================================
// REJECT
// POST /api/admin/withdrawals/:id/reject
// ======================================================

async function rejectWithdrawal(
    req,
    res
) {

    try {

        requireAdmin();

        const withdrawalId =
            Number(
                req.params.id
            );

        const reason =
            String(
                req.body?.reason || ""
            ).trim();


        const withdrawal =
            await walletService
                .rejectWithdrawal(
                    withdrawalId,
                    req.user.id,
                    reason || null
                );


        return res.json({

            success: true,

            message:
                "Withdrawal rejected.",

            withdrawal
        });

    } catch (error) {

        console.error(
            "Admin reject withdrawal error:",
            error
        );

        return res.status(400).json({

            success: false,

            message:
                error.message ||
                "Failed to reject withdrawal."
        });
    }
}


// ======================================================
// EXPORT
// ======================================================

module.exports = {

    getWithdrawals,

    approveWithdrawal,

    rejectWithdrawal
};