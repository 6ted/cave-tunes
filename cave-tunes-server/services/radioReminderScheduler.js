
const db = require("../config/database");

let schedulerInterval = null;
let isRunning = false;

// ======================================================
// SEND DUE RADIO PROGRAM REMINDERS
// ======================================================

async function sendDueRadioReminders() {
    if (isRunning) return;

    isRunning = true;

    try {
        /*
         * This query:
         *
         * 1. Finds due reminders.
         * 2. Locks them so another scheduler worker
         *    cannot process the same reminders.
         * 3. Marks them as sent.
         * 4. Inserts notifications into the existing
         *    Cave Tunes notifications table.
         *
         * All four operations happen in one SQL statement.
         * If notification insertion fails, the update
         * is rolled back too.
         */

        const result = await db.query(
            `
            WITH due_reminders AS MATERIALIZED (

                SELECT
                    r.id AS reminder_id,
                    r.user_id,
                    r.program_id,
                    p.title AS program_title

                FROM radio_program_reminders r

                INNER JOIN radio_programs p
                    ON p.id = r.program_id

                WHERE r.is_active = TRUE

                  AND r.notification_sent_at IS NULL

                  AND r.remind_at <= NOW()

                  AND p.status = 'scheduled'

                ORDER BY r.remind_at ASC

                LIMIT 100

                FOR UPDATE OF r SKIP LOCKED

            ),

            claimed_reminders AS (

                UPDATE radio_program_reminders r

                SET notification_sent_at = NOW()

                FROM due_reminders d

                WHERE r.id = d.reminder_id

                RETURNING
                    r.user_id,
                    r.program_id,
                    d.program_title

            )

            INSERT INTO notifications (

                user_id,
                actor_user_id,
                song_id,
                type,
                title,
                message,
                action_url,
                metadata,
                is_read,
                created_at

            )

            SELECT

                c.user_id,

                NULL,

                NULL,

                'radio_program_reminder',

                c.program_title || ' starts in 5 minutes!',

                'Your Cave Tunes Radio program "' ||
                    c.program_title ||
                    '" starts in 5 minutes. Tune in now!',

                '/radio',

                jsonb_build_object(
                    'event', 'radio_program_reminder',
                    'programId', c.program_id,
                    'programTitle', c.program_title
                ),

                FALSE,

                NOW()

            FROM claimed_reminders c

            RETURNING id, user_id

            `
        );

        if (result.rowCount > 0) {
            console.log(
                `📻 Sent ${result.rowCount} radio program reminder(s).`
            );
        }

    } catch (error) {
        console.error(
            "RADIO REMINDER SCHEDULER ERROR:",
            error.message
        );

    } finally {
        isRunning = false;
    }
}

// ======================================================
// START SCHEDULER
// ======================================================

function startRadioReminderScheduler() {
    if (schedulerInterval) {
        console.log("📻 Radio reminder scheduler already running.");
        return;
    }

    console.log("📻 Radio reminder scheduler started.");

    // Check immediately when the server starts.
    sendDueRadioReminders();

    // Then check every 15 seconds.
    schedulerInterval = setInterval(() => {
        sendDueRadioReminders();
    }, 15000);
}

// ======================================================
// EXPORT
// ======================================================

module.exports = {
    startRadioReminderScheduler
};
