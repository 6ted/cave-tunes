// ======================================================
// CAVE TUNES
// WALLET CONTROLLER
// ======================================================

const walletService =
    require("../services/walletService");


// ======================================================
// GET WALLET
// GET /api/wallet
// ======================================================

async function getWallet(
    req,
    res
) {

    try {

        const userId =
            req.user.id;

        const wallet =
            await walletService.getWallet(
                userId
            );

        return res.json({
            success: true,
            wallet
        });

    } catch (error) {

        console.error(
            "Get wallet error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Failed to load wallet."
        });
    }
}


// ======================================================
// GET TRANSACTIONS
// GET /api/wallet/transactions
// ======================================================

async function getTransactions(
    req,
    res
) {

    try {

        const userId =
            req.user.id;

        const limit =
            Math.min(
                Number(
                    req.query.limit || 50
                ),
                100
            );

        const offset =
            Math.max(
                Number(
                    req.query.offset || 0
                ),
                0
            );


        const transactions =
            await walletService
                .getWalletTransactions(
                    userId,
                    limit,
                    offset
                );


        return res.json({
            success: true,
            transactions
        });

    } catch (error) {

        console.error(
            "Get wallet transactions error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Failed to load wallet transactions."
        });
    }
}


// ======================================================
// GET PAYOUT METHODS
// GET /api/wallet/payout-methods
// ======================================================

async function getPayoutMethods(
    req,
    res
) {

    try {

        const userId =
            req.user.id;

        const methods =
            await walletService
                .getPayoutMethods(
                    userId
                );

        return res.json({
            success: true,
            methods
        });

    } catch (error) {

        console.error(
            "Get payout methods error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Failed to load payout methods."
        });
    }
}


// ======================================================
// ADD PAYOUT METHOD
// POST /api/wallet/payout-methods
// ======================================================

async function addPayoutMethod(
    req,
    res
) {

    try {

        const userId =
            req.user.id;

        const method =
            await walletService
                .addPayoutMethod(
                    userId,
                    req.body
                );

        return res.status(201).json({
            success: true,
            message:
                "Payout method added successfully.",
            method
        });

    } catch (error) {

        console.error(
            "Add payout method error:",
            error
        );

        return res.status(400).json({
            success: false,
            message:
                error.message ||
                "Failed to add payout method."
        });
    }
}


// ======================================================
// REQUEST WITHDRAWAL
// POST /api/wallet/withdrawals
// ======================================================

async function requestWithdrawal(
    req,
    res
) {

    try {

        const userId =
            req.user.id;

        const {
            amount,
            payoutMethodId
        } = req.body;


        const withdrawal =
            await walletService
                .requestWithdrawal(
                    userId,
                    amount,
                    payoutMethodId
                );


        return res.status(201).json({

            success: true,

            message:
                "Withdrawal request submitted successfully.",

            withdrawal
        });

    } catch (error) {

        console.error(
            "Withdrawal request error:",
            error
        );

        return res.status(400).json({

            success: false,

            message:
                error.message ||
                "Failed to request withdrawal."
        });
    }
}


// ======================================================
// GET WITHDRAWALS
// GET /api/wallet/withdrawals
// ======================================================

async function getWithdrawals(
    req,
    res
) {

    try {

        const userId =
            req.user.id;

        const withdrawals =
            await walletService
                .getWithdrawals(
                    userId
                );


        return res.json({

            success: true,

            withdrawals
        });

    } catch (error) {

        console.error(
            "Get withdrawals error:",
            error
        );

        return res.status(500).json({

            success: false,

            message:
                "Failed to load withdrawals."
        });
    }
}


// ======================================================
// EXPORTS
// ======================================================

module.exports = {

    getWallet,

    getTransactions,

    getPayoutMethods,

    addPayoutMethod,

    requestWithdrawal,

    getWithdrawals
};