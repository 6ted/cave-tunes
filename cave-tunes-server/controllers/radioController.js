
const db = require("../config/database");

// ======================================================
// HELPERS
// ======================================================

function getUserId(req) {
    return req.userId || req.user?.id || null;
}

function validId(value) {
    const id = Number(value);
    return Number.isInteger(id) && id > 0 ? id : null;
}

// ======================================================
// GET UPCOMING RADIO PROGRAMS
// GET /api/radio/programs
// ======================================================


// ======================================================
// GET UPCOMING AND CURRENT RADIO PROGRAMS
// GET /api/radio/programs
// ======================================================


exports.getPrograms = async (req, res) => {
    try {
        const result = await db.query(
            `
            SELECT
                id,
                title,
                description,
                presenter_name,
                cover_image_url,
                start_at,
                end_at,
                timezone,
                CASE
                    WHEN start_at > NOW()
                        THEN 'upcoming'
                    WHEN end_at > NOW()
                        THEN 'live'
                    ELSE 'recently_finished'
                END AS status
            FROM radio_programs
            WHERE status IN ('scheduled', 'live')
              AND end_at > NOW() - INTERVAL '24 hours'
            ORDER BY
                CASE
                    WHEN start_at <= NOW()
                     AND end_at > NOW() THEN 1
                    WHEN start_at > NOW() THEN 2
                    ELSE 3
                END,
                start_at ASC
            LIMIT 100
            `
        );

        return res.json({
            success: true,
            programs: result.rows
        });

    } catch (error) {
        console.error("GET RADIO PROGRAMS ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to load radio programs."
        });
    }
};



// ======================================================
// SET PROGRAM REMINDER
// POST /api/radio/programs/:id/remind
// ======================================================

exports.setProgramReminder = async (req, res) => {
    try {
        const userId = getUserId(req);
        const programId = validId(req.params.id);

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Please login to set a reminder."
            });
        }

        if (!programId) {
            return res.status(400).json({
                success: false,
                message: "Invalid program ID."
            });
        }

        const programResult = await db.query(
            `
            SELECT
                id,
                title,
                start_at,
                status
            FROM radio_programs
            WHERE id = $1
            `,
            [programId]
        );

        if (!programResult.rows.length) {
            return res.status(404).json({
                success: false,
                message: "Radio program not found."
            });
        }

        const program = programResult.rows[0];

        if (program.status !== "scheduled") {
            return res.status(400).json({
                success: false,
                message: "Reminders are only available for scheduled programs."
            });
        }

        if (new Date(program.start_at).getTime() <= Date.now()) {
            return res.status(400).json({
                success: false,
                message: "This program has already started."
            });
        }

        // Remind five minutes before the program.
        // If the program starts in less than five minutes,
        // make the reminder due immediately.

        const reminderResult = await db.query(
            `
            INSERT INTO radio_program_reminders (
                user_id,
                program_id,
                remind_at,
                is_active
            )
            VALUES (
                $1,
                $2,
                GREATEST(
                    $3::timestamptz - INTERVAL '5 minutes',
                    NOW()
                ),
                TRUE
            )
            ON CONFLICT (user_id, program_id)
            DO UPDATE SET
                remind_at = EXCLUDED.remind_at,
                is_active = TRUE
            WHERE radio_program_reminders.notification_sent_at IS NULL
            RETURNING *
            `,
            [
                userId,
                programId,
                program.start_at
            ]
        );

        if (!reminderResult.rows.length) {
            return res.json({
                success: true,
                alreadyNotified: true,
                message: "Your reminder notification has already been sent."
            });
        }

        return res.status(201).json({
            success: true,
            message: "Program reminder set. We'll notify you five minutes before it starts.",
            reminder: reminderResult.rows[0]
        });

    } catch (error) {
        console.error("SET RADIO REMINDER ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to set program reminder."
        });
    }
};

// ======================================================
// CANCEL PROGRAM REMINDER
// DELETE /api/radio/programs/:id/remind
// ======================================================

exports.cancelProgramReminder = async (req, res) => {
    try {
        const userId = getUserId(req);
        const programId = validId(req.params.id);

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Please login."
            });
        }

        if (!programId) {
            return res.status(400).json({
                success: false,
                message: "Invalid program ID."
            });
        }

        const result = await db.query(
            `
            UPDATE radio_program_reminders
            SET is_active = FALSE
            WHERE user_id = $1
              AND program_id = $2
              AND is_active = TRUE
              AND notification_sent_at IS NULL
            RETURNING id
            `,
            [userId, programId]
        );

        return res.json({
            success: true,
            cancelled: result.rowCount > 0,
            message: result.rowCount > 0
                ? "Program reminder cancelled."
                : "No active reminder was found."
        });

    } catch (error) {
        console.error("CANCEL RADIO REMINDER ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to cancel program reminder."
        });
    }
};

// ======================================================
// GET MY RADIO REMINDERS
// GET /api/radio/my-reminders
// ======================================================

exports.getMyReminders = async (req, res) => {
    try {
        const userId = getUserId(req);

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Please login."
            });
        }

        const result = await db.query(
            `
            SELECT
                r.id AS reminder_id,
                r.remind_at,
                r.is_active,
                r.notification_sent_at,
                p.id AS program_id,
                p.title,
                p.description,
                p.presenter_name,
                p.cover_image_url,
                p.start_at,
                p.end_at,
                p.timezone,
                p.status
            FROM radio_program_reminders r
            INNER JOIN radio_programs p
                ON p.id = r.program_id
            WHERE r.user_id = $1
              AND r.is_active = TRUE
            ORDER BY p.start_at ASC
            `,
            [userId]
        );

        return res.json({
            success: true,
            reminders: result.rows
        });

    } catch (error) {
        console.error("GET MY RADIO REMINDERS ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to load your radio reminders."
        });
    }
};

// ======================================================
// GET REMINDER STATUS FOR ONE PROGRAM
// GET /api/radio/programs/:id/reminder-status
// ======================================================

exports.getReminderStatus = async (req, res) => {
    try {
        const userId = getUserId(req);
        const programId = validId(req.params.id);

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Please login."
            });
        }

        if (!programId) {
            return res.status(400).json({
                success: false,
                message: "Invalid program ID."
            });
        }

        const result = await db.query(
            `
            SELECT
                id,
                remind_at,
                is_active,
                notification_sent_at
            FROM radio_program_reminders
            WHERE user_id = $1
              AND program_id = $2
            `,
            [userId, programId]
        );

        const reminder = result.rows[0] || null;

        return res.json({
            success: true,
            hasReminder: Boolean(
                reminder &&
                reminder.is_active
            ),
            reminder
        });

    } catch (error) {
        console.error("GET RADIO REMINDER STATUS ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to check reminder status."
        });
    }
};

// ======================================================
// RADIO LISTENER HEARTBEAT
// POST /api/radio/listeners/heartbeat
// ======================================================

exports.listenerHeartbeat = async (req, res) => {
    try {
        const { sessionId, isListening } = req.body;

        const validSessionId =
            typeof sessionId === "string" &&
            /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sessionId);

        if (!validSessionId) {
            return res.status(400).json({
                success: false,
                message: "A valid listener session ID is required."
            });
        }

        if (typeof isListening !== "boolean") {
            return res.status(400).json({
                success: false,
                message: "isListening must be true or false."
            });
        }

        if (isListening) {
            await db.query(
                `
                INSERT INTO radio_listener_sessions (
                    session_id,
                    last_seen_at
                )
                VALUES ($1, NOW())
                ON CONFLICT (session_id)
                DO UPDATE SET
                    last_seen_at = NOW()
                `,
                [sessionId]
            );
        } else {
            await db.query(
                `
                DELETE FROM radio_listener_sessions
                WHERE session_id = $1
                `,
                [sessionId]
            );
        }

        return res.json({
            success: true,
            message: isListening
                ? "Listener session updated."
                : "Listener session stopped."
        });

    } catch (error) {
        console.error("RADIO LISTENER HEARTBEAT ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to update listener session."
        });
    }
};


// ======================================================
// GET ACTIVE RADIO LISTENER COUNT
// GET /api/radio/listeners/count
// ======================================================

exports.getListenerCount = async (req, res) => {
    try {
        const result = await db.query(
            `
            SELECT COUNT(*)::INTEGER AS listener_count
            FROM radio_listener_sessions
            WHERE last_seen_at > NOW() - INTERVAL '45 seconds'
            `
        );

        return res.json({
            success: true,
            listeners: result.rows[0].listener_count
        });

    } catch (error) {
        console.error("GET RADIO LISTENER COUNT ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to get radio listener count."
        });
    }
};