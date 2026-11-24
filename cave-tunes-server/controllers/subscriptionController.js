// ============================================================
// CAVE TUNES
// PREMIUM SUBSCRIPTION CONTROLLER
// ============================================================

const subscriptionService =
    require("../services/subscriptionService");

const paychanguService =
    require("../services/paychanguService");

const pool =
    require("../config/database");


// ============================================================
// HELPERS
// ============================================================

function getValue(object, camelCase, snakeCase) {

    if (!object) return undefined;

    return object[camelCase] !== undefined
        ? object[camelCase]
        : object[snakeCase];
}


function getReturnUrl(params = {}) {

    const baseUrl =
        process.env.PAYCHANGU_RETURN_URL;

    if (!baseUrl) return null;

    const url = new URL(baseUrl);

    Object.entries(params).forEach(([key, value]) => {

        if (value !== undefined && value !== null) {

            url.searchParams.set(
                key,
                String(value)
            );

        }

    });

    return url.toString();
}


// ============================================================
// GET ACTIVE PLANS
// GET /api/subscription/plans
// ============================================================

async function getPlans(req, res) {

    try {

        const plans =
            await subscriptionService.getActivePlans();

        return res.status(200).json({

            success: true,

            plans: plans.map((plan) => ({

                id: plan.id,

                name: plan.name,

                slug: plan.slug,

                priceMwk: Number(
                    getValue(plan, "priceMwk", "price_mwk")
                ),

                durationDays: Number(
                    getValue(plan, "durationDays", "duration_days")
                ),

                description: plan.description,

            })),

        });

    } catch (error) {

        console.error(
            "Get subscription plans error:",
            error
        );

        return res.status(500).json({

            success: false,

            message:
                "Unable to load Premium plans.",

        });

    }
}


// ============================================================
// GET CURRENT SUBSCRIPTION STATUS
// GET /api/subscription/status
// ============================================================

async function getStatus(req, res) {

    try {

        const userId =
            req.userId;

        const status =
            await subscriptionService.getSubscriptionStatus(
                userId
            );

        return res.status(200).json({

            success: true,

            ...status,

        });

    } catch (error) {

        console.error(
            "Get subscription status error:",
            error
        );

        return res.status(500).json({

            success: false,

            message:
                "Unable to check Premium status.",

        });

    }
}


// ============================================================
// CREATE SUBSCRIPTION + PAYCHANGU CHECKOUT
// POST /api/subscription/subscribe
// ============================================================

async function subscribe(req, res) {

    try {

        const userId =
            req.userId;

        const { planSlug } =
            req.body;


        // ------------------------------------------------------
        // VALIDATE PLAN
        // ------------------------------------------------------

        if (
            typeof planSlug !== "string" ||
            !planSlug.trim()
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "A valid Premium plan must be selected.",

            });

        }


        const cleanPlanSlug =
            planSlug.trim().toLowerCase();


        // ------------------------------------------------------
        // CREATE OR FIND PENDING SUBSCRIPTION
        // ------------------------------------------------------

        const result =
            await subscriptionService.createSubscription(
                userId,
                cleanPlanSlug
            );


        const subscription =
            result.subscription;

        const payment =
            result.payment;

        const plan =
            result.plan;


        // ------------------------------------------------------
        // VALIDATE RESULT
        // ------------------------------------------------------

        if (!subscription || !payment || !plan) {

            return res.status(500).json({

                success: false,

                message:
                    "Premium subscription information could not be loaded.",

            });

        }


        // ------------------------------------------------------
        // EXISTING PENDING SUBSCRIPTION
        // ------------------------------------------------------

        if (result.existingPending) {

            // The service may return an existing pending
            // subscription for a different plan.

            if (result.samePlan === false) {

                return res.status(409).json({

                    success: false,

                    existingPending: true,

                    message:
                        "You already have a pending Premium payment for another plan. Complete or resolve that payment before selecting a different plan.",

                    pendingPlan: {

                        id: plan.id,

                        name: plan.name,

                        slug: plan.slug,

                    },

                });

            }


            // Do not create another checkout if this payment
            // already has a PayChangu transaction reference.

            const existingReference =
                getValue(
                    payment,
                    "providerReference",
                    "provider_reference"
                );

            if (existingReference) {

                return res.status(409).json({

                    success: false,

                    existingPending: true,

                    message:
                        "A PayChangu checkout has already been created for this pending payment. Please complete that payment before trying again.",

                    payment: {

                        id: payment.id,

                        providerReference:
                            existingReference,

                    },

                });

            }

        }


        // ------------------------------------------------------
        // VALIDATE PAYMENT
        // ------------------------------------------------------

        if (!payment.id) {

            return res.status(500).json({

                success: false,

                message:
                    "Premium payment could not be created.",

            });

        }


        // ------------------------------------------------------
        // GET CURRENT USER
        // ------------------------------------------------------

        const userResult =
            await pool.query(
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

                message:
                    "User account could not be found.",

            });

        }


        const user =
            userResult.rows[0];


        // ------------------------------------------------------
        // NORMALIZE SERVICE OBJECTS
        // ------------------------------------------------------
        //
        // The subscription service returns camelCase objects.
        //
        // The PayChangu service currently expects snake_case
        // database-style properties.
        //
        // We convert them here to keep both services compatible.
        //
        // ------------------------------------------------------

        const checkoutPayment = {

            ...payment,

            id: payment.id,

            subscription_id:
                getValue(payment, "subscriptionId", "subscription_id"),

            plan_id:
                getValue(payment, "planId", "plan_id"),

            amount_mwk:
                getValue(payment, "amountMwk", "amount_mwk"),

            currency:
                payment.currency,

            status:
                payment.status,

            payment_provider:
                getValue(payment, "paymentProvider", "payment_provider"),

            provider_reference:
                getValue(payment, "providerReference", "provider_reference"),

        };


        const checkoutSubscription = {

            ...subscription,

            id: subscription.id,

            user_id:
                getValue(subscription, "userId", "user_id"),

            plan_id:
                getValue(subscription, "planId", "plan_id"),

            status:
                subscription.status,

        };


        const checkoutPlan = {

            ...plan,

            id: plan.id,

            name: plan.name,

            slug: plan.slug,

            price_mwk:
                getValue(plan, "priceMwk", "price_mwk"),

            duration_days:
                getValue(plan, "durationDays", "duration_days"),

        };


        // ------------------------------------------------------
        // CREATE PAYCHANGU CHECKOUT
        // ------------------------------------------------------

        const checkout =
            await paychanguService.createCheckout({

                payment: checkoutPayment,

                subscription: checkoutSubscription,

                plan: checkoutPlan,

                user,

            });


        if (!checkout || !checkout.checkoutUrl || !checkout.txRef) {

            throw new Error(
                "PayChangu did not return a valid checkout URL."
            );

        }


        // ------------------------------------------------------
        // SAVE PAYCHANGU TX_REF
        // ------------------------------------------------------

        const updatedPayment =
            await subscriptionService.attachProviderReference(

                payment.id,

                checkout.txRef,

                "paychangu"

            );


        // ------------------------------------------------------
        // RESPONSE
        // ------------------------------------------------------

        return res.status(
            result.existingPending ? 200 : 201
        ).json({

            success: true,

            existingPending:
                Boolean(result.existingPending),

            message:
                "Premium checkout created.",

            subscription,

            plan,

            payment: {

                id: updatedPayment.id,

                amountMwk: Number(
                    getValue(
                        updatedPayment,
                        "amountMwk",
                        "amount_mwk"
                    )
                ),

                currency:
                    updatedPayment.currency,

                status:
                    updatedPayment.status,

                paymentProvider:
                    getValue(
                        updatedPayment,
                        "paymentProvider",
                        "payment_provider"
                    ),

                providerReference:
                    getValue(
                        updatedPayment,
                        "providerReference",
                        "provider_reference"
                    ),

                createdAt:
                    getValue(
                        updatedPayment,
                        "createdAt",
                        "created_at"
                    ),

            },

            checkout: {

                txRef:
                    checkout.txRef,

                checkoutUrl:
                    checkout.checkoutUrl,

            },

        });

    } catch (error) {

        console.error(
            "Create Premium checkout error:",
            error
        );

        return res.status(
            error.statusCode || 500
        ).json({

            success: false,

            message:
                error.message ||
                "Unable to create Premium checkout.",

        });

    }
}


// ============================================================
// PAYCHANGU CALLBACK
// GET /api/subscription/payment/callback
// ============================================================

async function paymentCallback(req, res) {

    try {

        const txRef =
            req.query.tx_ref ||
            req.query.txRef;


        const callbackStatus =
            req.query.status;


        console.log(
            "PayChangu callback received:",
            {
                txRef,
                callbackStatus,
            }
        );


        // ------------------------------------------------------
        // VALIDATE TX_REF
        // ------------------------------------------------------

        if (
            typeof txRef !== "string" ||
            !txRef.trim()
        ) {

            return res.status(400).send(
                "Missing PayChangu transaction reference."
            );

        }


        // ------------------------------------------------------
        // FIND PAYMENT
        // ------------------------------------------------------

        const payment =
            await subscriptionService.getPaymentByProviderReference(
                txRef
            );


        if (!payment) {

            console.error(
                "PayChangu payment not found:",
                txRef
            );

            return res.status(404).send(
                "Cave Tunes payment could not be found."
            );

        }


        // ------------------------------------------------------
        // ALREADY COMPLETED
        // ------------------------------------------------------

        if (payment.status === "completed") {

            const redirectUrl =
                getReturnUrl({

                    payment: "success",

                    tx_ref: txRef,

                });

            if (redirectUrl) {

                return res.redirect(redirectUrl);

            }

            return res.status(200).send(
                "Payment successful. Premium has already been activated."
            );

        }


        // ------------------------------------------------------
        // VERIFY DIRECTLY WITH PAYCHANGU
        // ------------------------------------------------------

        const verification =
            await paychanguService.verifyTransaction(
                txRef
            );


        // ------------------------------------------------------
        // VALIDATE PAYMENT
        // ------------------------------------------------------

        const validation =
            paychanguService.validateVerifiedPayment({

                verification,

                expectedTxRef:
                    txRef,

                expectedAmount: Number(
                    getValue(
                        payment,
                        "amountMwk",
                        "amount_mwk"
                    )
                ),

                expectedCurrency:
                    "MWK",

            });


        if (!validation.valid) {

            console.error(
                "PayChangu payment validation failed:",
                validation.reason
            );

            return res.status(400).send(
                `Payment verification failed: ${validation.reason}`
            );

        }


        // ------------------------------------------------------
        // ACTIVATE PREMIUM
        // ------------------------------------------------------

        const activated =
            await subscriptionService.activateSubscription(

                payment.id,

                txRef

            );


        console.log(
            "Premium subscription activated:",
            {

                paymentId:
                    payment.id,

                subscriptionId:
                    activated.subscription?.id,

                txRef,

            }
        );


        // ------------------------------------------------------
        // REDIRECT USER
        // ------------------------------------------------------

        const redirectUrl =
            getReturnUrl({

                payment: "success",

                tx_ref: txRef,

            });


        if (!redirectUrl) {

            return res.status(200).send(
                "Payment successful. Premium has been activated."
            );

        }


        return res.redirect(redirectUrl);

    } catch (error) {

        console.error(
            "PayChangu callback error:",
            error
        );

        return res.status(500).send(
            "Payment verification could not be completed."
        );

    }
}


// ============================================================
// PAYCHANGU RETURN / FAILED PAYMENT
// GET /api/subscription/payment/return
// ============================================================

async function paymentReturn(req, res) {

    const txRef =
        req.query.tx_ref ||
        req.query.txRef ||
        "";


    const status =
        req.query.status ||
        "failed";


    const redirectUrl =
        getReturnUrl({

            payment: "failed",

            status,

            tx_ref: txRef,

        });


    if (!redirectUrl) {

        return res.status(200).send(
            "Payment was not completed."
        );

    }


    return res.redirect(redirectUrl);

}


// ============================================================
// EXPORTS
// ============================================================

module.exports = {

    getPlans,

    getStatus,

    subscribe,

    paymentCallback,

    paymentReturn,

};