// ======================================================
// CAVE TUNES
// ROYALTY SUMMARY CONTROLLER
// ======================================================

const royaltySummaryService =
    require("../services/royaltySummaryService");


// ======================================================
// GET USER ROYALTY SUMMARY
//
// GET /api/royalty-summary
// ======================================================

async function getUserRoyaltySummary(
    req,
    res
) {

    try {

        const userId =
            req.user.id;


        const summary =
            await royaltySummaryService
                .getUserRoyaltySummary(
                    userId
                );


        return res.json({

            success: true,

            summary

        });

    } catch (error) {

        console.error(
            "Get royalty summary error:",
            error
        );


        return res.status(500).json({

            success: false,

            message:
                error.message ||
                "Failed to load royalty summary."

        });
    }
}


// ======================================================
// GET USER SONG SETTLEMENT SUMMARY
//
// GET /api/royalty-summary/songs/:songId
// ======================================================

async function getUserSongSettlementSummary(
    req,
    res
) {

    try {

        const userId =
            req.user.id;


        const songId =
            Number(
                req.params.songId
            );


        if (
            !Number.isInteger(
                songId
            ) ||
            songId <= 0
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Invalid song ID."

            });
        }


        const summary =
            await royaltySummaryService
                .getUserSongSettlementSummary(
                    userId,
                    songId
                );


        return res.json({

            success: true,

            summary

        });

    } catch (error) {

        console.error(
            "Get song royalty summary error:",
            error
        );


        return res.status(500).json({

            success: false,

            message:
                error.message ||
                "Failed to load song royalty summary."

        });
    }
}


// ======================================================
// EXPORTS
// ======================================================

module.exports = {

    getUserRoyaltySummary,

    getUserSongSettlementSummary

};