// ============================================================
// CAVE TUNES
// PREMIUM SUBSCRIPTION SERVICE
//
// Handles:
// - Premium plan retrieval
// - User subscription status
// - Subscription creation
// - Payment creation
// - Premium expiration checks
// - Secure payment activation
// - Pending subscription cancellation
//
// IMPORTANT:
// - Prices always come from PostgreSQL.
// - The frontend cannot choose the payment amount.
// - Premium is activated only after verified payment.
// ============================================================

const pool = require("../config/database");


// ============================================================
// SHARED HELPERS
// ============================================================

function createServiceError(message, statusCode = 500) {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
}


async function rollbackSafely(client) {
    try {
        await client.query("ROLLBACK");
    } catch (error) {
        console.error(
            "Subscription transaction rollback failed:",
            error.message
        );
    }
}


function mapPlan(plan) {
    if (!plan) return null;

    return {
        id: plan.id,
        name: plan.name,
        slug: plan.slug,
        priceMwk: Number(plan.price_mwk),
        durationDays: Number(plan.duration_days),
        description: plan.description
    };
}


function mapPayment(payment) {
    if (!payment) return null;

    return {
        id: payment.id,
        userId: payment.user_id,
        subscriptionId: payment.subscription_id,
        planId: payment.plan_id,
        amountMwk: Number(payment.amount_mwk),
        currency: payment.currency,
        status: payment.status,
        paymentProvider: payment.payment_provider,
        providerReference: payment.provider_reference,
        paymentReference: payment.payment_reference,
        paidAt: payment.paid_at,
        createdAt: payment.created_at,
        updatedAt: payment.updated_at
    };
}


// ============================================================
// GET ACTIVE SUBSCRIPTION PLANS
// ============================================================

async function getActivePlans() {
    const result = await pool.query(
        `
        SELECT
            id,
            name,
            slug,
            price_mwk,
            duration_days,
            description,
            is_active,
            created_at,
            updated_at
        FROM subscription_plans
        WHERE is_active = TRUE
        ORDER BY duration_days ASC, id ASC
        `
    );

    return result.rows;
}


// ============================================================
// GET CURRENT USER SUBSCRIPTION
// ============================================================

async function getCurrentSubscription(userId) {
    const client = await pool.connect();
    let transactionStarted = false;

    try {
        await client.query("BEGIN");
        transactionStarted = true;

        // Expire subscriptions whose validity has ended.
        await client.query(
            `
            UPDATE subscriptions
            SET
                status = 'expired',
                updated_at = CURRENT_TIMESTAMP
            WHERE
                user_id = $1
                AND status = 'active'
                AND expires_at IS NOT NULL
                AND expires_at <= CURRENT_TIMESTAMP
            `,
            [userId]
        );

        const result = await client.query(
            `
            SELECT
                s.id,
                s.user_id,
                s.plan_id,
                s.status,
                s.starts_at,
                s.expires_at,
                s.cancelled_at,
                s.created_at,
                s.updated_at,

                p.name AS plan_name,
                p.slug AS plan_slug,
                p.price_mwk,
                p.duration_days,
                p.description AS plan_description

            FROM subscriptions s

            INNER JOIN subscription_plans p
                ON p.id = s.plan_id

            WHERE
                s.user_id = $1
                AND s.status = 'active'
                AND s.starts_at <= CURRENT_TIMESTAMP
                AND s.expires_at > CURRENT_TIMESTAMP

            ORDER BY s.expires_at DESC, s.id DESC
            LIMIT 1
            `,
            [userId]
        );

        await client.query("COMMIT");
        transactionStarted = false;

        return result.rows[0] || null;

    } catch (error) {
        if (transactionStarted) {
            await rollbackSafely(client);
        }

        throw error;

    } finally {
        client.release();
    }
}


// ============================================================
// GET SUBSCRIPTION STATUS
// ============================================================

async function getSubscriptionStatus(userId) {
    const subscription = await getCurrentSubscription(userId);

    if (!subscription) {
        return {
            isPremium: false,
            subscription: null
        };
    }

    return {
        isPremium: true,
        subscription: {
            id: subscription.id,
            planId: subscription.plan_id,
            planName: subscription.plan_name,
            planSlug: subscription.plan_slug,
            priceMwk: Number(subscription.price_mwk),
            durationDays: Number(subscription.duration_days),
            startsAt: subscription.starts_at,
            expiresAt: subscription.expires_at,
            status: subscription.status
        }
    };
}


// ============================================================
// FIND ACTIVE PLAN BY SLUG
// ============================================================

async function getPlanBySlug(slug) {
    const result = await pool.query(
        `
        SELECT
            id,
            name,
            slug,
            price_mwk,
            duration_days,
            description,
            is_active
        FROM subscription_plans
        WHERE slug = $1
          AND is_active = TRUE
        LIMIT 1
        `,
        [slug]
    );

    return result.rows[0] || null;
}


// ============================================================
// CREATE SUBSCRIPTION + PAYMENT
// ============================================================
//
// A user may have only one pending subscription attempt.
//
// PostgreSQL advisory transaction locks serialize subscription
// creation attempts for the same user.
//
// Premium is NOT activated here.
// ============================================================

async function createSubscription(userId, planSlug) {
    const client = await pool.connect();
    let transactionStarted = false;

    try {
        await client.query("BEGIN");
        transactionStarted = true;

        // Serialize subscription creation for this user.
        await client.query(
            `
            SELECT pg_advisory_xact_lock($1::bigint)
            `,
            [Number(userId)]
        );

        // ------------------------------------------------------
        // VALIDATE USER
        // ------------------------------------------------------

        const userResult = await client.query(
            `
            SELECT id, username, email
            FROM users
            WHERE id = $1
            LIMIT 1
            `,
            [userId]
        );

        if (userResult.rows.length === 0) {
            throw createServiceError(
                "User account could not be found.",
                404
            );
        }

        // ------------------------------------------------------
        // EXPIRE OLD SUBSCRIPTIONS
        // ------------------------------------------------------

        await client.query(
            `
            UPDATE subscriptions
            SET
                status = 'expired',
                updated_at = CURRENT_TIMESTAMP
            WHERE
                user_id = $1
                AND status = 'active'
                AND expires_at IS NOT NULL
                AND expires_at <= CURRENT_TIMESTAMP
            `,
            [userId]
        );

        // ------------------------------------------------------
        // CHECK ACTIVE SUBSCRIPTION
        // ------------------------------------------------------

        const activeResult = await client.query(
            `
            SELECT id
            FROM subscriptions
            WHERE
                user_id = $1
                AND status = 'active'
                AND starts_at <= CURRENT_TIMESTAMP
                AND expires_at > CURRENT_TIMESTAMP
            ORDER BY expires_at DESC
            LIMIT 1
            `,
            [userId]
        );

        if (activeResult.rows.length > 0) {
            throw createServiceError(
                "You already have an active Premium subscription.",
                409
            );
        }

        // ------------------------------------------------------
        // FIND REQUESTED PLAN
        // ------------------------------------------------------

        const planResult = await client.query(
            `
            SELECT
                id,
                name,
                slug,
                price_mwk,
                duration_days,
                description
            FROM subscription_plans
            WHERE slug = $1
              AND is_active = TRUE
            LIMIT 1
            `,
            [planSlug]
        );

        if (planResult.rows.length === 0) {
            throw createServiceError(
                "The selected Premium plan is not available.",
                404
            );
        }

        const requestedPlan = planResult.rows[0];

        // ------------------------------------------------------
        // CHECK EXISTING PENDING SUBSCRIPTION
        // ------------------------------------------------------

        const pendingResult = await client.query(
            `
            SELECT
                s.id,
                s.user_id,
                s.plan_id,
                s.status,
                s.starts_at,
                s.expires_at,
                s.cancelled_at,
                s.created_at,
                s.updated_at,

                p.id AS current_plan_id,
                p.name AS plan_name,
                p.slug AS plan_slug,
                p.price_mwk,
                p.duration_days,
                p.description AS plan_description

            FROM subscriptions s

            INNER JOIN subscription_plans p
                ON p.id = s.plan_id

            WHERE
                s.user_id = $1
                AND s.status = 'pending'

            ORDER BY s.created_at DESC, s.id DESC
            LIMIT 1
            `,
            [userId]
        );

        if (pendingResult.rows.length > 0) {
            const pending = pendingResult.rows[0];

            const pendingPaymentResult = await client.query(
                `
                SELECT
                    id,
                    user_id,
                    subscription_id,
                    plan_id,
                    amount_mwk,
                    currency,
                    status,
                    payment_provider,
                    provider_reference,
                    payment_reference,
                    paid_at,
                    created_at,
                    updated_at
                FROM subscription_payments
                WHERE
                    subscription_id = $1
                    AND status = 'pending'
                ORDER BY created_at DESC, id DESC
                LIMIT 1
                `,
                [pending.id]
            );

            const payment = pendingPaymentResult.rows[0] || null;

            await client.query("COMMIT");
            transactionStarted = false;

            return {
                existingPending: true,
                plan: {
                    id: pending.current_plan_id,
                    name: pending.plan_name,
                    slug: pending.plan_slug,
                    priceMwk: Number(pending.price_mwk),
                    durationDays: Number(pending.duration_days),
                    description: pending.plan_description
                },
                requestedPlan: mapPlan(requestedPlan),
                samePlan: Number(pending.plan_id) === Number(requestedPlan.id),
                subscription: {
                    id: pending.id,
                    userId: pending.user_id,
                    planId: pending.plan_id,
                    status: pending.status,
                    startsAt: pending.starts_at,
                    expiresAt: pending.expires_at,
                    createdAt: pending.created_at
                },
                payment: mapPayment(payment)
            };
        }

        // ------------------------------------------------------
        // CREATE PENDING SUBSCRIPTION
        // ------------------------------------------------------

        const subscriptionResult = await client.query(
            `
            INSERT INTO subscriptions (
                user_id,
                plan_id,
                status
            )
            VALUES ($1, $2, 'pending')
            RETURNING
                id,
                user_id,
                plan_id,
                status,
                starts_at,
                expires_at,
                created_at,
                updated_at
            `,
            [userId, requestedPlan.id]
        );

        const subscription = subscriptionResult.rows[0];

        // ------------------------------------------------------
        // CREATE PAYMENT
        // ------------------------------------------------------

        const paymentResult = await client.query(
            `
            INSERT INTO subscription_payments (
                user_id,
                subscription_id,
                plan_id,
                amount_mwk,
                currency,
                status
            )
            VALUES ($1, $2, $3, $4, 'MWK', 'pending')
            RETURNING
                id,
                user_id,
                subscription_id,
                plan_id,
                amount_mwk,
                currency,
                status,
                payment_provider,
                provider_reference,
                payment_reference,
                paid_at,
                created_at,
                updated_at
            `,
            [
                userId,
                subscription.id,
                requestedPlan.id,
                requestedPlan.price_mwk
            ]
        );

        const payment = paymentResult.rows[0];

        await client.query("COMMIT");
        transactionStarted = false;

        return {
            existingPending: false,
            subscription: {
                id: subscription.id,
                userId: subscription.user_id,
                planId: subscription.plan_id,
                status: subscription.status,
                startsAt: subscription.starts_at,
                expiresAt: subscription.expires_at,
                createdAt: subscription.created_at
            },
            plan: mapPlan(requestedPlan),
            payment: mapPayment(payment)
        };

    } catch (error) {
        if (transactionStarted) {
            await rollbackSafely(client);
        }

        throw error;

    } finally {
        client.release();
    }
}


// ============================================================
// ACTIVATE SUBSCRIPTION AFTER VERIFIED PAYMENT
// ============================================================
//
// Call this function only after PayChangu verification succeeds.
//
// The caller must verify the transaction reference, amount,
// currency, and provider status before calling this function.
// ============================================================

async function activateSubscription(
    paymentId,
    providerReference = null
) {
    const client = await pool.connect();
    let transactionStarted = false;

    try {
        await client.query("BEGIN");
        transactionStarted = true;

        // ------------------------------------------------------
        // LOCK PAYMENT
        // ------------------------------------------------------

        const paymentResult = await client.query(
            `
            SELECT
                id,
                user_id,
                subscription_id,
                plan_id,
                amount_mwk,
                currency,
                status,
                payment_provider,
                provider_reference,
                payment_reference,
                provider_transaction_reference
            FROM subscription_payments
            WHERE id = $1
            FOR UPDATE
            `,
            [paymentId]
        );

        if (paymentResult.rows.length === 0) {
            throw createServiceError(
                "Subscription payment could not be found.",
                404
            );
        }

        const payment = paymentResult.rows[0];

        // ------------------------------------------------------
        // IDEMPOTENCY
        // ------------------------------------------------------

        if (payment.status === "completed") {
            const existingResult = await client.query(
                `
                SELECT
                    id,
                    user_id,
                    plan_id,
                    status,
                    starts_at,
                    expires_at,
                    cancelled_at,
                    created_at,
                    updated_at
                FROM subscriptions
                WHERE id = $1
                LIMIT 1
                `,
                [payment.subscription_id]
            );

            await client.query("COMMIT");
            transactionStarted = false;

            return {
                alreadyCompleted: true,
                payment,
                subscription: existingResult.rows[0] || null
            };
        }

        if (payment.status !== "pending") {
            throw createServiceError(
                `Payment cannot be activated because its current status is "${payment.status}".`,
                409
            );
        }

        if (!payment.subscription_id || !payment.plan_id) {
            throw createServiceError(
                "Payment is not linked to a valid subscription and plan.",
                409
            );
        }

        if (
            providerReference &&
            payment.provider_reference &&
            payment.provider_reference !== providerReference
        ) {
            throw createServiceError(
                "The payment reference does not match the stored transaction.",
                409
            );
        }

        if (
            String(payment.currency).toUpperCase() !== "MWK"
        ) {
            throw createServiceError(
                "The payment currency is not supported.",
                409
            );
        }

        // ------------------------------------------------------
        // LOCK SUBSCRIPTION
        // ------------------------------------------------------

        const subscriptionResult = await client.query(
            `
            SELECT
                id,
                user_id,
                plan_id,
                status,
                starts_at,
                expires_at
            FROM subscriptions
            WHERE id = $1
              AND user_id = $2
              AND plan_id = $3
            FOR UPDATE
            `,
            [
                payment.subscription_id,
                payment.user_id,
                payment.plan_id
            ]
        );

        if (subscriptionResult.rows.length === 0) {
            throw createServiceError(
                "The subscription linked to this payment could not be found.",
                404
            );
        }

        const subscription = subscriptionResult.rows[0];

        if (subscription.status !== "pending") {
            throw createServiceError(
                `Subscription cannot be activated because its current status is "${subscription.status}".`,
                409
            );
        }

        // ------------------------------------------------------
        // LOCK USER'S OTHER SUBSCRIPTIONS
        // ------------------------------------------------------
        //
        // Lock the user's pending subscription row first. Then
        // expire any old active subscription and check for a
        // different active one.
        //
        // ------------------------------------------------------

        await client.query(
            `
            UPDATE subscriptions
            SET
                status = 'expired',
                updated_at = CURRENT_TIMESTAMP
            WHERE
                user_id = $1
                AND id <> $2
                AND status = 'active'
                AND expires_at IS NOT NULL
                AND expires_at <= CURRENT_TIMESTAMP
            `,
            [payment.user_id, subscription.id]
        );

        const activeResult = await client.query(
            `
            SELECT id
            FROM subscriptions
            WHERE
                user_id = $1
                AND id <> $2
                AND status = 'active'
                AND starts_at <= CURRENT_TIMESTAMP
                AND expires_at > CURRENT_TIMESTAMP
            ORDER BY expires_at DESC
            LIMIT 1
            FOR UPDATE
            `,
            [payment.user_id, subscription.id]
        );

        if (activeResult.rows.length > 0) {
            throw createServiceError(
                "This user already has another active Premium subscription.",
                409
            );
        }

        // ------------------------------------------------------
        // GET PLAN
        // ------------------------------------------------------

        const planResult = await client.query(
            `
            SELECT
                id,
                name,
                slug,
                price_mwk,
                duration_days
            FROM subscription_plans
            WHERE id = $1
            LIMIT 1
            `,
            [payment.plan_id]
        );

        if (planResult.rows.length === 0) {
            throw createServiceError(
                "Subscription plan no longer exists.",
                404
            );
        }

        const plan = planResult.rows[0];

        if (
            !Number.isInteger(Number(plan.duration_days)) ||
            Number(plan.duration_days) <= 0
        ) {
            throw createServiceError(
                "The subscription plan has an invalid duration.",
                500
            );
        }

        // Verify the stored payment amount against the plan's
        // current price. The controller must also verify the
        // amount returned by PayChangu.
        if (
            Number(payment.amount_mwk) !== Number(plan.price_mwk)
        ) {
            throw createServiceError(
                "The payment amount does not match the plan price.",
                409
            );
        }

        // ------------------------------------------------------
        // CALCULATE DATES USING POSTGRESQL
        // ------------------------------------------------------

        const activationResult = await client.query(
            `
            UPDATE subscriptions
            SET
                status = 'active',
                starts_at = CURRENT_TIMESTAMP,
                expires_at =
                    CURRENT_TIMESTAMP +
                    ($1::integer * INTERVAL '1 day'),
                cancelled_at = NULL,
                updated_at = CURRENT_TIMESTAMP
            WHERE
                id = $2
                AND status = 'pending'
            RETURNING
                id,
                user_id,
                plan_id,
                status,
                starts_at,
                expires_at,
                cancelled_at,
                created_at,
                updated_at
            `,
            [
                Number(plan.duration_days),
                subscription.id
            ]
        );

        if (activationResult.rows.length === 0) {
            throw createServiceError(
                "Subscription could not be activated.",
                409
            );
        }

        const activatedSubscription = activationResult.rows[0];

        // ------------------------------------------------------
        // COMPLETE PAYMENT
        // ------------------------------------------------------

        const completedPaymentResult = await client.query(
            `
            UPDATE subscription_payments
            SET
                status = 'completed',
                provider_reference =
                    COALESCE($1, provider_reference),
                provider_transaction_reference =
                    COALESCE($1, provider_transaction_reference),
                paid_at = COALESCE(paid_at, CURRENT_TIMESTAMP),
                updated_at = CURRENT_TIMESTAMP
            WHERE
                id = $2
                AND status = 'pending'
            RETURNING
                id,
                user_id,
                subscription_id,
                plan_id,
                amount_mwk,
                currency,
                status,
                payment_provider,
                provider_reference,
                payment_reference,
                provider_transaction_reference,
                paid_at,
                created_at,
                updated_at
            `,
            [providerReference, paymentId]
        );

        if (completedPaymentResult.rows.length === 0) {
            throw createServiceError(
                "Payment could not be marked as completed.",
                409
            );
        }

        await client.query("COMMIT");
        transactionStarted = false;

        return {
            alreadyCompleted: false,
            payment: completedPaymentResult.rows[0],
            subscription: activatedSubscription
        };

    } catch (error) {
        if (transactionStarted) {
            await rollbackSafely(client);
        }

        throw error;

    } finally {
        client.release();
    }
}


// ============================================================
// CANCEL PENDING SUBSCRIPTION
// ============================================================

async function cancelPendingSubscription(
    userId,
    subscriptionId
) {
    const client = await pool.connect();
    let transactionStarted = false;

    try {
        await client.query("BEGIN");
        transactionStarted = true;

        const subscriptionResult = await client.query(
            `
            SELECT
                id,
                user_id,
                status
            FROM subscriptions
            WHERE
                id = $1
                AND user_id = $2
            FOR UPDATE
            `,
            [subscriptionId, userId]
        );

        if (subscriptionResult.rows.length === 0) {
            throw createServiceError(
                "Subscription could not be found.",
                404
            );
        }

        const subscription = subscriptionResult.rows[0];

        if (subscription.status !== "pending") {
            throw createServiceError(
                "Only pending subscriptions can be cancelled.",
                409
            );
        }

        await client.query(
            `
            UPDATE subscriptions
            SET
                status = 'cancelled',
                cancelled_at = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP
            WHERE
                id = $1
                AND status = 'pending'
            `,
            [subscriptionId]
        );

        await client.query(
            `
            UPDATE subscription_payments
            SET
                status = 'cancelled',
                updated_at = CURRENT_TIMESTAMP
            WHERE
                subscription_id = $1
                AND status = 'pending'
            `,
            [subscriptionId]
        );

        await client.query("COMMIT");
        transactionStarted = false;

        return {
            success: true
        };

    } catch (error) {
        if (transactionStarted) {
            await rollbackSafely(client);
        }

        throw error;

    } finally {
        client.release();
    }
}


// ============================================================
// ATTACH PAYMENT PROVIDER REFERENCE
// ============================================================
//
// Only pending payments can receive a new checkout reference.
// The reference must not already belong to another payment.
// ============================================================

async function attachProviderReference(
    paymentId,
    providerReference,
    paymentProvider = "paychangu"
) {
    if (!paymentId) {
        throw createServiceError(
            "Payment ID is required.",
            400
        );
    }

    if (!providerReference) {
        throw createServiceError(
            "Provider transaction reference is required.",
            400
        );
    }

    const client = await pool.connect();
    let transactionStarted = false;

    try {
        await client.query("BEGIN");
        transactionStarted = true;

        const paymentResult = await client.query(
            `
            SELECT
                id,
                status,
                provider_reference
            FROM subscription_payments
            WHERE id = $1
            FOR UPDATE
            `,
            [paymentId]
        );

        if (paymentResult.rows.length === 0) {
            throw createServiceError(
                "Subscription payment could not be found.",
                404
            );
        }

        const payment = paymentResult.rows[0];

        if (payment.status !== "pending") {
            throw createServiceError(
                "Only pending payments can receive a checkout reference.",
                409
            );
        }

        if (
            payment.provider_reference &&
            payment.provider_reference !== providerReference
        ) {
            throw createServiceError(
                "This payment already has a different provider reference.",
                409
            );
        }

        const duplicateResult = await client.query(
            `
            SELECT id
            FROM subscription_payments
            WHERE
                provider_reference = $1
                AND id <> $2
            LIMIT 1
            `,
            [providerReference, paymentId]
        );

        if (duplicateResult.rows.length > 0) {
            throw createServiceError(
                "This provider reference is already assigned to another payment.",
                409
            );
        }

        const result = await client.query(
            `
            UPDATE subscription_payments
            SET
                payment_provider = $1,
                provider_reference = $2,
                updated_at = CURRENT_TIMESTAMP
            WHERE
                id = $3
                AND status = 'pending'
            RETURNING
                id,
                user_id,
                subscription_id,
                plan_id,
                amount_mwk,
                currency,
                status,
                payment_provider,
                provider_reference,
                payment_reference,
                provider_transaction_reference,
                paid_at,
                created_at,
                updated_at
            `,
            [
                paymentProvider,
                providerReference,
                paymentId
            ]
        );

        if (result.rows.length === 0) {
            throw createServiceError(
                "Payment reference could not be saved.",
                409
            );
        }

        await client.query("COMMIT");
        transactionStarted = false;

        return result.rows[0];

    } catch (error) {
        if (transactionStarted) {
            await rollbackSafely(client);
        }

        throw error;

    } finally {
        client.release();
    }
}


// ============================================================
// FIND PAYMENT BY PROVIDER REFERENCE
// ============================================================

async function getPaymentByProviderReference(providerReference) {
    if (!providerReference) {
        return null;
    }

    const result = await pool.query(
        `
        SELECT
            id,
            user_id,
            subscription_id,
            plan_id,
            amount_mwk,
            currency,
            status,
            payment_provider,
            provider_reference,
            payment_reference,
            provider_transaction_reference,
            paid_at,
            created_at,
            updated_at
        FROM subscription_payments
        WHERE
            provider_reference = $1
            OR provider_transaction_reference = $1
        ORDER BY created_at DESC, id DESC
        LIMIT 1
        `,
        [providerReference]
    );

    return result.rows[0] || null;
}


// ============================================================
// EXPORTS
// ============================================================

module.exports = {
    getActivePlans,
    getCurrentSubscription,
    getSubscriptionStatus,
    getPlanBySlug,
    createSubscription,
    activateSubscription,
    cancelPendingSubscription,
    attachProviderReference,
    getPaymentByProviderReference
};