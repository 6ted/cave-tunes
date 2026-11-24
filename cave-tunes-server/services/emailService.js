// ======================================================
// CAVE TUNES
// EMAIL SERVICE
// services/emailService.js
//
// Production email delivery through Resend
// ======================================================

const { Resend } = require("resend");


// ======================================================
// RESEND CLIENT
// ======================================================

if (!process.env.RESEND_API_KEY) {

    throw new Error(
        "RESEND_API_KEY is not configured."
    );

}

if (!process.env.RESEND_FROM_EMAIL) {

    throw new Error(
        "RESEND_FROM_EMAIL is not configured."
    );

}

const resend =
    new Resend(
        process.env.RESEND_API_KEY
    );


// ======================================================
// FRONTEND URL
// ======================================================

const FRONTEND_URL =
    (
        process.env.FRONTEND_URL ||
        "http://localhost:5173"
    ).replace(/\/+$/, "");


// ======================================================
// HTML ESCAPE
// ======================================================

function escapeHtml(value = "") {

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}


// ======================================================
// BUILD ACTION URL
// ======================================================

function buildActionUrl(
    actionUrl
) {

    if (!actionUrl) {
        return null;
    }

    // Already a complete URL
    if (
        /^https?:\/\//i.test(
            actionUrl
        )
    ) {

        return actionUrl;

    }

    // Convert relative Cave Tunes route
    // into complete frontend URL.

    return `${FRONTEND_URL}/${String(actionUrl)
        .replace(/^\/+/, "")}`;

}


// ======================================================
// SEND NOTIFICATION EMAIL
// ======================================================

async function sendNotificationEmail({

    to,

    title,

    message,

    actionUrl = null,

}) {

    if (!to) {

        throw new Error(
            "Notification email recipient is required."
        );

    }


    if (!title) {

        throw new Error(
            "Notification email title is required."
        );

    }


    if (!message) {

        throw new Error(
            "Notification email message is required."
        );

    }


    const safeTitle =
        escapeHtml(title);


    const safeMessage =
        escapeHtml(message);


    const completeActionUrl =
        buildActionUrl(
            actionUrl
        );


    const buttonHtml =
        completeActionUrl
            ? `
                <div style="margin-top: 28px;">

                    <a
                        href="${escapeHtml(
                            completeActionUrl
                        )}"
                        style="
                            display: inline-block;
                            padding: 13px 24px;
                            background: #ebb113;
                            color: #121212;
                            text-decoration: none;
                            border-radius: 8px;
                            font-weight: 700;
                        "
                    >
                        View on Cave Tunes
                    </a>

                </div>
            `
            : "";


    const html = `

        <!DOCTYPE html>

        <html>

        <head>

            <meta charset="UTF-8">

            <meta
                name="viewport"
                content="width=device-width, initial-scale=1.0"
            >

            <title>
                ${safeTitle}
            </title>

        </head>


        <body
            style="
                margin: 0;
                padding: 0;
                background: #121212;
                font-family: Arial, Helvetica, sans-serif;
                color: #ffffff;
            "
        >

            <div
                style="
                    max-width: 600px;
                    margin: 40px auto;
                    padding: 32px;
                    background: #1d1d1d;
                    border-radius: 14px;
                "
            >

                <div
                    style="
                        font-size: 28px;
                        font-weight: 800;
                        margin-bottom: 28px;
                        color: #ebb113;
                    "
                >
                    CAVE TUNES
                </div>


                <h1
                    style="
                        font-size: 24px;
                        margin: 0 0 18px;
                        color: #ffffff;
                    "
                >
                    ${safeTitle}
                </h1>


                <p
                    style="
                        font-size: 16px;
                        line-height: 1.7;
                        color: #dddddd;
                        margin: 0;
                    "
                >
                    ${safeMessage}
                </p>


                ${buttonHtml}


                <div
                    style="
                        margin-top: 36px;
                        padding-top: 20px;
                        border-top: 1px solid #333333;
                        font-size: 13px;
                        line-height: 1.6;
                        color: #888888;
                    "
                >

                    You are receiving this email because
                    you have an account on Cave Tunes.

                    <br><br>

                    © Cave Tunes

                </div>

            </div>

        </body>

        </html>

    `;


    try {

        const result =
            await resend.emails.send({

                from:
                    process.env.RESEND_FROM_EMAIL,

                to: [
                    to
                ],

                subject:
                    `Cave Tunes — ${title}`,

                html,

            });


        if (result.error) {

            console.error(
                "RESEND EMAIL ERROR:",
                result.error
            );

            throw new Error(
                result.error.message ||
                "Resend failed to send email."
            );

        }


        console.log(
            "CAVE TUNES EMAIL SENT:",
            {
                to,
                id:
                    result.data?.id || null,
            }
        );


        return {

            success: true,

            id:
                result.data?.id || null,

        };

    }

    catch (error) {

        console.error(
            "SEND NOTIFICATION EMAIL ERROR:",
            error
        );

        throw error;

    }

}


// ======================================================
// EXPORT
// ======================================================

module.exports = {

    sendNotificationEmail,

};