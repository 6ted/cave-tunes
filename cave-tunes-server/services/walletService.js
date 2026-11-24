// ======================================================
// CAVE TUNES
// WALLET SERVICE
// ======================================================

const pool = require("../config/database");

const {
    createNotification,
} = require("./notificationService");
// ======================================================
// CONSTANTS
// ======================================================

const DEFAULT_CURRENCY = "USD";

const TRANSACTION_TYPES = {
    ROYALTY: "royalty",
    DOWNLOAD_SALE: "download_sale",
    BONUS: "bonus",
    ADJUSTMENT: "adjustment",
    WITHDRAWAL: "withdrawal",
    REFUND: "refund"
};

const TRANSACTION_STATUSES = {
    PENDING: "pending",
    COMPLETED: "completed",
    FAILED: "failed",
    REVERSED: "reversed"
};

const WITHDRAWAL_STATUSES = {
    PENDING: "pending",
    APPROVED: "approved",
    PROCESSING: "processing",
    COMPLETED: "completed",
    REJECTED: "rejected",
    FAILED: "failed"
};


// ======================================================
// CREATE / GET WALLET
// ======================================================

async function getOrCreateWallet(userId) {

    const existing = await pool.query(
        `
        SELECT *
        FROM wallets
        WHERE user_id = $1
        LIMIT 1
        `,
        [userId]
    );

    if (existing.rows.length > 0) {
        return existing.rows[0];
    }

    const created = await pool.query(
        `
        INSERT INTO wallets (
            user_id,
            currency
        )
        VALUES (
            $1,
            $2
        )
        RETURNING *
        `,
        [
            userId,
            DEFAULT_CURRENCY
        ]
    );

    return created.rows[0];
}


// ======================================================
// GET WALLET
// ======================================================

async function getWallet(userId) {

    return getOrCreateWallet(userId);
}


// ======================================================
// GET TRANSACTIONS
// ======================================================

async function getWalletTransactions(
    userId,
    limit = 50,
    offset = 0
) {
    const result = await pool.query(
        `
        SELECT
            wt.id,
            wt.type,
            wt.amount,
            wt.currency,
            wt.status,
            wt.reference,
            wt.description,
            wt.source_type,
            wt.source_id,
            wt.metadata,
            wt.created_at,

            -- Withdrawal rejection information
            wr.rejection_reason,
            wr.status AS withdrawal_status,
            wr.rejected_at

        FROM wallet_transactions wt

        INNER JOIN wallets w
            ON w.id = wt.wallet_id

        LEFT JOIN withdrawal_requests wr
            ON wt.source_type = 'withdrawal'
            AND wt.source_id = wr.id

        WHERE
            wt.user_id = $1

        ORDER BY
            wt.created_at DESC

        LIMIT $2
        OFFSET $3
        `,
        [
            userId,
            limit,
            offset
        ]
    );

    return result.rows;
}

// ======================================================
// ADD WALLET TRANSACTION
// ======================================================
//
// This function should be used for earnings/credits.
//
// amount must be positive.
// ======================================================

async function addWalletTransaction({

    userId,

    amount,

    type,

    description = null,

    sourceType = null,

    sourceId = null,

    metadata = {},

    reference = null,

    status = TRANSACTION_STATUSES.COMPLETED,

    client = pool

}) {

    const numericAmount =
        Number(amount);

    if (
        !Number.isFinite(
            numericAmount
        ) ||
        numericAmount <= 0
    ) {

        throw new Error(
            "Wallet transaction amount must be greater than zero."
        );
    }


    const walletResult =
        await client.query(
            `
            SELECT *
            FROM wallets
            WHERE user_id = $1
            FOR UPDATE
            `,
            [userId]
        );


    let wallet;


    if (walletResult.rows.length === 0) {

        const created =
            await client.query(
                `
                INSERT INTO wallets (
                    user_id,
                    currency
                )
                VALUES (
                    $1,
                    $2
                )
                RETURNING *
                `,
                [
                    userId,
                    DEFAULT_CURRENCY
                ]
            );

        wallet =
            created.rows[0];

    } else {

        wallet =
            walletResult.rows[0];
    }


    const transaction =
        await client.query(
            `
            INSERT INTO wallet_transactions (

                wallet_id,
                user_id,
                type,
                amount,
                currency,
                status,
                reference,
                description,
                source_type,
                source_id,
                metadata

            )

            VALUES (

                $1,
                $2,
                $3,
                $4,
                $5,
                $6,
                $7,
                $8,
                $9,
                $10,
                $11

            )

            RETURNING *
            `,
            [

                wallet.id,
                userId,
                type,
                numericAmount,
                wallet.currency,
                status,
                reference,
                description,
                sourceType,
                sourceId,
                metadata

            ]
        );


    if (
        status ===
        TRANSACTION_STATUSES.COMPLETED
    ) {

        await client.query(
            `
            UPDATE wallets

            SET

                available_balance =
                    available_balance + $1,

                lifetime_earnings =
                    lifetime_earnings + $1,

                updated_at =
                    CURRENT_TIMESTAMP

            WHERE
                id = $2
            `,
            [
                numericAmount,
                wallet.id
            ]
        );

    } else {

        await client.query(
            `
            UPDATE wallets

            SET

                pending_balance =
                    pending_balance + $1,

                updated_at =
                    CURRENT_TIMESTAMP

            WHERE
                id = $2
            `,
            [
                numericAmount,
                wallet.id
            ]
        );
    }


    return transaction.rows[0];
}


// ======================================================
// GET PAYOUT METHODS
// ======================================================

async function getPayoutMethods(userId) {

    const result = await pool.query(
        `
        SELECT *

        FROM wallet_payout_methods

        WHERE
            user_id = $1

        ORDER BY
            is_default DESC,
            created_at DESC
        `,
        [userId]
    );

    return result.rows;
}


// ======================================================
// ADD PAYOUT METHOD
// ======================================================

async function addPayoutMethod(
    userId,
    data
) {

    const {

        methodType,

        accountHolderName,

        phoneNumber,

        bankName,

        accountNumber,

        accountType,

        branchName,

        bankCode,

        isDefault = false

    } = data;


    if (
        ![
            "airtel_money",
            "tnm_mpamba",
            "bank_transfer"
        ].includes(methodType)
    ) {

        throw new Error(
            "Invalid payout method."
        );
    }


    const client =
        await pool.connect();


    try {

        await client.query(
            "BEGIN"
        );


        if (isDefault) {

            await client.query(
                `
                UPDATE wallet_payout_methods

                SET
                    is_default = FALSE

                WHERE
                    user_id = $1
                `,
                [userId]
            );
        }


        const result =
            await client.query(
                `
                INSERT INTO wallet_payout_methods (

                    user_id,
                    method_type,
                    account_holder_name,
                    phone_number,
                    bank_name,
                    account_number,
                    account_type,
                    branch_name,
                    bank_code,
                    is_default

                )

                VALUES (

                    $1,
                    $2,
                    $3,
                    $4,
                    $5,
                    $6,
                    $7,
                    $8,
                    $9,
                    $10

                )

                RETURNING *
                `,
                [

                    userId,
                    methodType,
                    accountHolderName || null,
                    phoneNumber || null,
                    bankName || null,
                    accountNumber || null,
                    accountType || null,
                    branchName || null,
                    bankCode || null,
                    isDefault

                ]
            );


        await client.query(
            "COMMIT"
        );


        return result.rows[0];

    } catch (error) {

        await client.query(
            "ROLLBACK"
        );

        throw error;

    } finally {

        client.release();
    }
}



// ======================================================
// WITHDRAWAL NOTIFICATIONS
// ======================================================
//
// IMPORTANT:
// Notifications are sent AFTER the financial transaction
// has successfully committed.
//
// A notification/email failure must NEVER roll back or
// invalidate a successful withdrawal operation.
// ======================================================

async function notifyWithdrawalRequestCreated(withdrawal) {
    try {
        // --------------------------------------------------
        // GET REQUESTING USER
        // --------------------------------------------------

        const userResult = await pool.query(
            `
            SELECT
                id,
                username
            FROM users
            WHERE id = $1
            LIMIT 1
            `,
            [withdrawal.user_id]
        );

        const user = userResult.rows[0];

        const username =
            user?.username || "User";

        // --------------------------------------------------
        // NOTIFY REQUESTING USER
        // --------------------------------------------------

        try {
            await createNotification({
                userId: withdrawal.user_id,
                actorUserId: null,
                songId: null,
                type: "system",
                title: "Withdrawal request submitted",
                message:
                    `Your withdrawal request of ` +
                    `${withdrawal.currency} ${Number(
                        withdrawal.amount
                    ).toFixed(2)} has been submitted and is currently pending admin review.`,
                actionUrl: "/wallet",
                metadata: {
                    category: "withdrawal",
                    event: "withdrawal_requested",
                    withdrawalId: withdrawal.id,
                    reference:
                        withdrawal.transaction_reference,
                    amount: Number(
                        withdrawal.amount
                    ),
                    currency: withdrawal.currency,
                    status: withdrawal.status,
                },
            });
        } catch (error) {
            console.error(
                "USER WITHDRAWAL REQUEST NOTIFICATION ERROR:",
                error
            );
        }

        // --------------------------------------------------
        // GET ALL ADMINS
        // --------------------------------------------------

        const adminResult = await pool.query(
            `
            SELECT id
            FROM users
            WHERE is_admin = TRUE
            `
        );

        // --------------------------------------------------
        // NOTIFY ADMINS
        // --------------------------------------------------

        for (const admin of adminResult.rows) {
            try {
                await createNotification({
                    userId: admin.id,
                    actorUserId: withdrawal.user_id,
                    songId: null,
                    type: "system",
                    title: "New withdrawal request",
                    message:
                        `${username} has requested a withdrawal of ` +
                        `${withdrawal.currency} ${Number(
                            withdrawal.amount
                        ).toFixed(2)}. The request is pending your review.`,
                    actionUrl: "/admin/requests",
                    metadata: {
                        category: "withdrawal",
                        event: "withdrawal_requested",
                        withdrawalId: withdrawal.id,
                        userId: withdrawal.user_id,
                        reference:
                            withdrawal.transaction_reference,
                        amount: Number(
                            withdrawal.amount
                        ),
                        currency: withdrawal.currency,
                        status: withdrawal.status,
                    },
                });
            } catch (error) {
                console.error(
                    `ADMIN WITHDRAWAL NOTIFICATION ERROR ` +
                    `(admin ${admin.id}):`,
                    error
                );
            }
        }
    } catch (error) {
        console.error(
            "WITHDRAWAL REQUEST NOTIFICATION SYSTEM ERROR:",
            error
        );
    }
}


// ======================================================
// NOTIFY USER AFTER WITHDRAWAL APPROVAL
// ======================================================

async function notifyWithdrawalApproved(
    withdrawal,
    adminUserId
) {
    try {
        await createNotification({
            userId: withdrawal.user_id,
            actorUserId: adminUserId,
            songId: null,
            type: "system",
            title: "Withdrawal approved",
            message:
                `Your withdrawal request of ` +
                `${withdrawal.currency} ${Number(
                    withdrawal.amount
                ).toFixed(2)} has been approved and completed.`,
            actionUrl: "/wallet",
            metadata: {
                category: "withdrawal",
                event: "withdrawal_approved",
                withdrawalId: withdrawal.id,
                reference:
                    withdrawal.transaction_reference,
                amount: Number(
                    withdrawal.amount
                ),
                currency: withdrawal.currency,
                status: withdrawal.status,
                approvedBy: adminUserId,
            },
        });
    } catch (error) {
        console.error(
            "WITHDRAWAL APPROVAL NOTIFICATION ERROR:",
            error
        );
    }
}


// ======================================================
// NOTIFY USER AFTER WITHDRAWAL REJECTION
// ======================================================

async function notifyWithdrawalRejected(
    withdrawal,
    adminUserId,
    reason
) {
    try {
        const cleanReason =
            typeof reason === "string" &&
            reason.trim()
                ? reason.trim()
                : "No reason was provided.";

        await createNotification({
            userId: withdrawal.user_id,
            actorUserId: adminUserId,
            songId: null,
            type: "system",
            title: "Withdrawal rejected",
            message:
                `Your withdrawal request of ` +
                `${withdrawal.currency} ${Number(
                    withdrawal.amount
                ).toFixed(2)} was rejected. ` +
                `Reason: ${cleanReason}`,
            actionUrl: "/wallet",
            metadata: {
                category: "withdrawal",
                event: "withdrawal_rejected",
                withdrawalId: withdrawal.id,
                reference:
                    withdrawal.transaction_reference,
                amount: Number(
                    withdrawal.amount
                ),
                currency: withdrawal.currency,
                status: withdrawal.status,
                rejectedBy: adminUserId,
                rejectionReason: cleanReason,
            },
        });
    } catch (error) {
        console.error(
            "WITHDRAWAL REJECTION NOTIFICATION ERROR:",
            error
        );
    }
}



// ======================================================
// REQUEST WITHDRAWAL
// ======================================================
//
// IMPORTANT:
// Creating a withdrawal request DOES NOT subtract
// available_balance.
//
// Balance is only subtracted when an admin approves
// the withdrawal.
// ======================================================

async function requestWithdrawal(
    userId,
    amount,
    payoutMethodId
) {

    const numericAmount =
        Number(amount);

    if (
        !Number.isFinite(numericAmount) ||
        numericAmount <= 0
    ) {
        throw new Error(
            "Invalid withdrawal amount."
        );
    }

    const client =
        await pool.connect();

    try {

        await client.query("BEGIN");

        // --------------------------------------------------
        // LOCK WALLET
        // --------------------------------------------------

        const walletResult =
            await client.query(
                `
                SELECT *
                FROM wallets
                WHERE user_id = $1
                FOR UPDATE
                `,
                [userId]
            );

        if (
            walletResult.rows.length === 0
        ) {
            throw new Error(
                "Wallet not found."
            );
        }

        const wallet =
            walletResult.rows[0];

        const availableBalance =
            Number(
                wallet.available_balance
            );


        // --------------------------------------------------
        // CHECK BALANCE
        // --------------------------------------------------

        if (
            availableBalance <
            numericAmount
        ) {
            throw new Error(
                "Insufficient wallet balance."
            );
        }


        // --------------------------------------------------
        // PREVENT MULTIPLE PENDING REQUESTS
        // --------------------------------------------------
        //
        // We don't subtract the balance yet.
        //
        // Therefore we must make sure users cannot create
        // several pending withdrawals that together exceed
        // their available balance.
        //
        // --------------------------------------------------

        const pendingResult =
            await client.query(
                `
                SELECT
                    COALESCE(
                        SUM(amount),
                        0
                    ) AS pending_amount

                FROM withdrawal_requests

                WHERE
                    user_id = $1

                AND status IN (
                    'pending',
                    'approved',
                    'processing'
                )
                `,
                [userId]
            );

        const pendingAmount =
            Number(
                pendingResult.rows[0]
                    ?.pending_amount || 0
            );


        if (
            pendingAmount +
            numericAmount >
            availableBalance
        ) {
            throw new Error(
                "This withdrawal would exceed your available balance after pending withdrawals."
            );
        }


        // --------------------------------------------------
        // GET PAYOUT METHOD
        // --------------------------------------------------

        const payoutResult =
            await client.query(
                `
                SELECT *
                FROM wallet_payout_methods

                WHERE
                    id = $1

                AND
                    user_id = $2

                LIMIT 1
                `,
                [
                    payoutMethodId,
                    userId
                ]
            );

        if (
            payoutResult.rows.length === 0
        ) {
            throw new Error(
                "Payout method not found."
            );
        }

        const payout =
            payoutResult.rows[0];


        // --------------------------------------------------
        // VALIDATE ACCOUNT HOLDER
        // --------------------------------------------------

        if (
            !payout.account_holder_name ||
            !payout.account_holder_name.trim()
        ) {
            throw new Error(
                "Account holder name is required."
            );
        }


        // --------------------------------------------------
        // VALIDATE MOBILE MONEY
        // --------------------------------------------------

        if (
            payout.method_type ===
                "airtel_money" ||
            payout.method_type ===
                "tnm_mpamba"
        ) {

            const phone =
                String(
                    payout.phone_number || ""
                )
                    .replace(/\s+/g, "")
                    .trim();

            const normalizedPhone =
                phone
                    .replace(
                        /^\+265/,
                        ""
                    )
                    .replace(
                        /^265/,
                        ""
                    );

            if (
                !/^0?(88|99|98|89|21)\d{7}$/
                    .test(
                        normalizedPhone
                    )
            ) {
                throw new Error(
                    "Please provide a valid Malawi mobile money number."
                );
            }
        }


        // --------------------------------------------------
        // VALIDATE BANK
        // --------------------------------------------------

        if (
            payout.method_type ===
            "bank_transfer"
        ) {

            if (
                !payout.bank_name ||
                !payout.bank_name.trim()
            ) {
                throw new Error(
                    "Bank name is required."
                );
            }

            if (
                !payout.account_number ||
                !payout.account_number.trim()
            ) {
                throw new Error(
                    "Bank account number is required."
                );
            }
        }


        // --------------------------------------------------
        // REFERENCE
        // --------------------------------------------------

        const withdrawalReference =
            `WD-${Date.now()}-${userId}`;


        // --------------------------------------------------
        // SNAPSHOT PAYOUT DETAILS
        // --------------------------------------------------
        //
        // Very important:
        //
        // If the user changes their payout method later,
        // this withdrawal must still contain the exact
        // account information submitted for this request.
        //
        // --------------------------------------------------

        const payoutDetails = {

            methodType:
                payout.method_type,

            accountHolderName:
                payout.account_holder_name,

            phoneNumber:
                payout.phone_number,

            bankName:
                payout.bank_name,

            accountNumber:
                payout.account_number,

            accountType:
                payout.account_type,

            branchName:
                payout.branch_name,

            bankCode:
                payout.bank_code
        };


        // --------------------------------------------------
        // CREATE PENDING WITHDRAWAL
        // --------------------------------------------------

        const withdrawalResult =
            await client.query(
                `
                INSERT INTO withdrawal_requests (

                    wallet_id,
                    user_id,
                    payout_method_id,
                    amount,
                    currency,
                    status,
                    transaction_reference,
                    payout_details

                )

                VALUES (

                    $1,
                    $2,
                    $3,
                    $4,
                    $5,
                    'pending',
                    $6,
                    $7

                )

                RETURNING *
                `,
                [

                    wallet.id,

                    userId,

                    payoutMethodId,

                    numericAmount,

                    wallet.currency,

                    withdrawalReference,

                    JSON.stringify(
                        payoutDetails
                    )
                ]
            );


        const withdrawal =
            withdrawalResult.rows[0];


        // --------------------------------------------------
        // CREATE PENDING WALLET TRANSACTION
        // --------------------------------------------------
        //
        // IMPORTANT:
        //
        // This transaction is informational/audit history.
        // It does NOT change available_balance.
        //
        // --------------------------------------------------

        await client.query(
            `
            INSERT INTO wallet_transactions (

                wallet_id,
                user_id,
                type,
                amount,
                currency,
                status,
                reference,
                description,
                source_type,
                source_id,
                metadata

            )

            VALUES (

                $1,
                $2,
                'withdrawal',
                $3,
                $4,
                'pending',
                $5,
                $6,
                'withdrawal',
                $7,
                $8

            )
            `,
            [

                wallet.id,

                userId,

                -numericAmount,

                wallet.currency,

                withdrawalReference,

                "Wallet withdrawal request",

                withdrawal.id,

                JSON.stringify({
                    payoutMethodId
                })
            ]
        );


     // --------------------------------------------------
// COMMIT
// --------------------------------------------------

await client.query(
    "COMMIT"
);

// --------------------------------------------------
// SEND NOTIFICATIONS AFTER COMMIT
// --------------------------------------------------
//
// IMPORTANT:
// The withdrawal already exists in the database.
// Notification/email failure must NOT affect it.
// --------------------------------------------------

await notifyWithdrawalRequestCreated(
    withdrawal
);

return withdrawal;

    } catch (error) {

        await client.query(
            "ROLLBACK"
        );

        throw error;

    } finally {

        client.release();
    }
}


// ======================================================
// GET ALL WITHDRAWAL REQUESTS
// ADMIN ONLY
// ======================================================
//
// Returns:
// - User information
// - Wallet information
// - Current payout method information
// - Exact payout details captured when withdrawal was requested
//
// IMPORTANT:
// `withdrawal_requests.payout_details` is the authoritative
// payout snapshot for that particular withdrawal.
//
// ======================================================

async function getAdminWithdrawals() {
    const result = await pool.query(`
        SELECT
            -- ==================================================
            -- WITHDRAWAL INFORMATION
            -- ==================================================
            wr.id,
            wr.wallet_id,
            wr.user_id,
            wr.payout_method_id,
            wr.amount,
            wr.currency,
            wr.status,
            wr.transaction_reference,
            wr.payout_details,
            wr.requested_at,
            wr.approved_at,
            wr.approved_by,
            wr.rejected_at,
            wr.rejected_by,
            wr.rejection_reason,

            -- ==================================================
            -- USER INFORMATION
            -- ==================================================
            u.username,
            u.email,

            -- ==================================================
            -- WALLET INFORMATION
            -- ==================================================
            w.currency AS wallet_currency,
            w.available_balance,
            w.pending_balance,
            w.lifetime_earnings,

            -- ==================================================
            -- CURRENT PAYOUT METHOD
            -- ==================================================
            wpm.method_type AS payout_method_type,
            wpm.account_holder_name AS payout_account_holder_name,
            wpm.phone_number AS payout_phone_number,
            wpm.bank_name AS payout_bank_name,
            wpm.account_number AS payout_account_number,
            wpm.account_type AS payout_account_type,
            wpm.branch_name AS payout_branch_name,
            wpm.bank_code AS payout_bank_code,
            wpm.is_default AS payout_method_is_default,
            wpm.created_at AS payout_method_created_at

        FROM withdrawal_requests wr

        INNER JOIN users u
            ON u.id = wr.user_id

        INNER JOIN wallets w
            ON w.id = wr.wallet_id

        LEFT JOIN wallet_payout_methods wpm
            ON wpm.id = wr.payout_method_id

        ORDER BY
            CASE
                WHEN wr.status = 'pending' THEN 1
                WHEN wr.status = 'processing' THEN 2
                WHEN wr.status = 'approved' THEN 3
                WHEN wr.status = 'completed' THEN 4
                WHEN wr.status = 'rejected' THEN 5
                WHEN wr.status = 'failed' THEN 6
                ELSE 7
            END,

            wr.requested_at ASC
    `);

    return result.rows;
}



// ======================================================
// APPROVE WITHDRAWAL
// ADMIN ONLY
// ======================================================

async function approveWithdrawal(
    withdrawalId,
    adminUserId
) {

    const client =
        await pool.connect();

    try {

        await client.query("BEGIN");


        // ==================================================
        // LOCK WITHDRAWAL
        // ==================================================

        const withdrawalResult =
            await client.query(
                `
                SELECT *
                FROM withdrawal_requests
                WHERE id = $1
                FOR UPDATE
                `,
                [withdrawalId]
            );


        if (
            withdrawalResult.rows.length === 0
        ) {

            throw new Error(
                "Withdrawal request not found."
            );

        }


        const withdrawal =
            withdrawalResult.rows[0];


        // ==================================================
        // IDEMPOTENCY PROTECTION
        // ==================================================
        //
        // If another admin already completed this request,
        // never deduct the balance again.
        //

        if (
            withdrawal.status ===
            "completed"
        ) {

            await client.query("COMMIT");

            return withdrawal;

        }


        // ==================================================
        // ONLY PENDING REQUESTS CAN BE APPROVED
        // ==================================================

        if (
            withdrawal.status !==
            "pending"
        ) {

            throw new Error(
                `Withdrawal cannot be approved because its current status is "${withdrawal.status}".`
            );

        }


        // ==================================================
        // LOCK WALLET
        // ==================================================

        const walletResult =
            await client.query(
                `
                SELECT *
                FROM wallets
                WHERE id = $1
                FOR UPDATE
                `,
                [withdrawal.wallet_id]
            );


        if (
            walletResult.rows.length === 0
        ) {

            throw new Error(
                "Wallet not found."
            );

        }


        const wallet =
            walletResult.rows[0];


        const amount =
            Number(
                withdrawal.amount
            );


        const availableBalance =
            Number(
                wallet.available_balance
            );


        // ==================================================
        // FINAL BALANCE CHECK
        // ==================================================

        if (
            availableBalance <
            amount
        ) {

            throw new Error(
                "Withdrawal cannot be approved because the wallet no longer has sufficient available balance."
            );

        }


        // ==================================================
        // FIND ORIGINAL PENDING TRANSACTION
        // ==================================================
        //
        // This is the transaction created when the user
        // submitted the withdrawal.
        //
        // We update this SAME transaction.
        //
        // No duplicate transaction is created.
        //

        const transactionResult =
            await client.query(
                `
                SELECT *
                FROM wallet_transactions
                WHERE
                    source_type = 'withdrawal'
                AND
                    source_id = $1
                AND
                    status = 'pending'
                ORDER BY created_at DESC
                LIMIT 1
                FOR UPDATE
                `,
                [withdrawal.id]
            );


        if (
            transactionResult.rows.length === 0
        ) {

            throw new Error(
                "Pending withdrawal wallet transaction not found."
            );

        }


        const transaction =
            transactionResult.rows[0];


        // ==================================================
        // COMPLETE ORIGINAL TRANSACTION
        // ==================================================

        await client.query(
            `
            UPDATE wallet_transactions

            SET
                status = 'completed',

                description =
                    'Wallet withdrawal approved',

                metadata =
                    COALESCE(metadata, '{}'::jsonb)
                    || $1::jsonb

            WHERE
                id = $2
            `,
            [
                JSON.stringify({
                    approvedBy: adminUserId,
                    approvedAt: new Date().toISOString(),
                    payoutDetails:
                        withdrawal.payout_details
                }),

                transaction.id
            ]
        );


        // ==================================================
        // DEDUCT AVAILABLE BALANCE
        // ==================================================

        await client.query(
            `
            UPDATE wallets

            SET
                available_balance =
                    available_balance - $1,

                updated_at =
                    CURRENT_TIMESTAMP

            WHERE
                id = $2
            `,
            [
                amount,
                wallet.id
            ]
        );


        // ==================================================
        // COMPLETE WITHDRAWAL
        // ==================================================

        const updatedResult =
            await client.query(
                `
                UPDATE withdrawal_requests

                SET
                    status = 'completed',

                    approved_at =
                        CURRENT_TIMESTAMP,

                    approved_by =
                        $1

                WHERE
                    id = $2

                RETURNING *
                `,
                [
                    adminUserId,
                    withdrawal.id
                ]
            );


       await client.query("COMMIT");

const updatedWithdrawal =
    updatedResult.rows[0];

// --------------------------------------------------
// NOTIFY USER AFTER SUCCESSFUL COMMIT
// --------------------------------------------------

await notifyWithdrawalApproved(
    updatedWithdrawal,
    adminUserId
);

return updatedWithdrawal;


    } catch (error) {

        await client.query(
            "ROLLBACK"
        );

        throw error;

    } finally {

        client.release();

    }

}

// ======================================================
// REJECT WITHDRAWAL
// ADMIN ONLY
// ======================================================

async function rejectWithdrawal(
    withdrawalId,
    adminUserId,
    reason = null
) {

    const normalizedReason =
        typeof reason === "string"
            ? reason.trim()
            : "";

    if (!normalizedReason) {
        throw new Error(
            "A rejection reason is required."
        );
    }

    const client =
        await pool.connect();

    try {

        await client.query(
            "BEGIN"
        );


        const result =
            await client.query(
                `
                SELECT *

                FROM withdrawal_requests

                WHERE
                    id = $1

                FOR UPDATE
                `,
                [withdrawalId]
            );


        if (
            result.rows.length === 0
        ) {
            throw new Error(
                "Withdrawal request not found."
            );
        }


        const withdrawal =
            result.rows[0];


        if (
            withdrawal.status !==
            "pending"
        ) {
            throw new Error(
                `Withdrawal cannot be rejected because its current status is "${withdrawal.status}".`
            );
        }


        // --------------------------------------------------
        // MARK WITHDRAWAL REJECTED
        // --------------------------------------------------

        const updated =
            await client.query(
                `
                UPDATE withdrawal_requests

                SET

                    status = 'rejected',

                    rejected_at =
                        CURRENT_TIMESTAMP,

                    rejected_by =
                        $1,

                    rejection_reason =
                        $2

                WHERE
                    id = $3

                RETURNING *
                `,
                [
                    adminUserId,
                    reason,
                    withdrawalId
                ]
            );


        // --------------------------------------------------
        // UPDATE PENDING WALLET TRANSACTION
        // --------------------------------------------------

        await client.query(
            `
            UPDATE wallet_transactions

            SET

                status = 'failed',

                description =
                    'Wallet withdrawal rejected',

                metadata =
                    metadata || $1::jsonb

            WHERE

                source_type =
                    'withdrawal'

            AND
                source_id =
                    $2

            AND
                status =
                    'pending'
            `,
            [
                JSON.stringify({
                    rejectedBy:
                        adminUserId,

                    rejectionReason:
                        reason
                }),

                withdrawalId
            ]
        );


        // --------------------------------------------------
        // IMPORTANT:
        //
        // NO WALLET BALANCE CHANGE.
        // --------------------------------------------------


      await client.query(
    "COMMIT"
);

const rejectedWithdrawal =
    updated.rows[0];

// --------------------------------------------------
// NOTIFY REQUESTING USER
// --------------------------------------------------

await notifyWithdrawalRejected(
    rejectedWithdrawal,
    adminUserId,
    reason
);

return rejectedWithdrawal;

    } catch (error) {

        await client.query(
            "ROLLBACK"
        );

        throw error;

    } finally {

        client.release();
    }
}

    
// ======================================================
// GET WITHDRAWALS
// ======================================================

async function getWithdrawals(userId) {

    const result = await pool.query(
        `
        SELECT

            wr.*,

            wpm.method_type,
            wpm.account_holder_name,
            wpm.phone_number,
            wpm.bank_name

        FROM withdrawal_requests wr

        LEFT JOIN wallet_payout_methods wpm
            ON wpm.id =
                wr.payout_method_id

        WHERE
            wr.user_id = $1

        ORDER BY
            wr.requested_at DESC
        `,
        [userId]
    );

    return result.rows;
}


// ======================================================
// EXPORTS
// ======================================================

module.exports = {

    getWallet,

    getOrCreateWallet,

    getWalletTransactions,

    addWalletTransaction,

    getPayoutMethods,

    addPayoutMethod,

    requestWithdrawal,

    getAdminWithdrawals,

    approveWithdrawal,

    rejectWithdrawal,

    getWithdrawals,

    TRANSACTION_TYPES,

    TRANSACTION_STATUSES,

    WITHDRAWAL_STATUSES

};