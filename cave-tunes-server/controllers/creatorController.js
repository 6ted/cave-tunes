const db = require("../config/database");


// ======================================================
// CREATE MONETIZATION REQUEST
// ======================================================

exports.createMonetizationRequest = async (req, res) => {

    try {

        const userId = req.user.id;


        // Check existing request

        const existing = await db.query(
            `
            SELECT *
            FROM monetization_requests
            WHERE user_id = $1
            AND status = 'pending'
            `,
            [userId]
        );


        if (existing.rows.length > 0) {

            return res.status(400).json({

                success:false,

                message:
                "You already have a pending monetization request."

            });

        }



        const result = await db.query(
            `
            INSERT INTO monetization_requests
            (
                user_id,
                status
            )

            VALUES
            (
                $1,
                'pending'
            )

            RETURNING *
            `,
            [
                userId
            ]
        );



        return res.json({

            success:true,

            message:
            "Monetization request submitted.",

            request:
            result.rows[0]

        });


    }

    catch(error){

        console.error(
            "CREATE MONETIZATION REQUEST ERROR:",
            error
        );


        return res.status(500).json({

            success:false,

            message:
            "Unable to submit monetization request."

        });

    }

};

// ======================================================
// CREATE WITHDRAWAL REQUEST
// ======================================================

exports.createWithdrawRequest = async (req, res) => {

    try {

        const userId = req.user.id;


        const {
            amount,
            payment_method,
            account_details
        } = req.body;



        if (!amount || Number(amount) <= 0) {

            return res.status(400).json({

                success:false,

                message:
                "Invalid withdrawal amount."

            });

        }



        const result = await db.query(
            `
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
            `,
            [
                userId,
                amount,
                payment_method,
                account_details
            ]
        );



        return res.json({

            success:true,

            message:
            "Withdrawal request submitted.",

            request:
            result.rows[0]

        });


    }

    catch(error){

        console.error(
            "CREATE WITHDRAW REQUEST ERROR:",
            error
        );


        return res.status(500).json({

            success:false,

            message:
            "Unable to submit withdrawal request."

        });

    }

};