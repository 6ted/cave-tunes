// ======================================================
// CAVE TUNES
// MONTHLY FINANCIAL RELEASE SCHEDULE
//
// Financial operations unlock on the 28th of every month.
// They remain available until the end of that month.
//
// Timezone: Africa/Blantyre
// ======================================================

const TIME_ZONE =
    process.env.FINANCIAL_SCHEDULE_TIME_ZONE ||
    "Africa/Blantyre";

function getCurrentFinancialDay() {
    const parts = new Intl.DateTimeFormat("en-GB", {
        timeZone: TIME_ZONE,
        day: "numeric",
    }).formatToParts(new Date());

    const dayPart = parts.find(
        (part) => part.type === "day"
    );

    return Number(dayPart?.value || 0);
}

module.exports = function requireMonthlyFinancialWindow(
    req,
    res,
    next
) {
    try {
        const currentDay = getCurrentFinancialDay();

        // Financial operations are available
        // from the 28th until the end of the month.
        if (currentDay >= 28) {
            return next();
        }

        return res.status(403).json({
            success: false,

            code: "FINANCIAL_WINDOW_CLOSED",

            message:
                "Withdrawals and royalty settlements become available on the 28th of every month.",

            unlockDay: 28,

            currentDay,

            timezone: TIME_ZONE,
        });

    } catch (error) {
        console.error(
            "FINANCIAL SCHEDULE ERROR:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Unable to verify the monthly financial schedule.",
        });
    }
};