// ======================================================
// CAVE TUNES MUSIC ROUTES
// ======================================================

const express = require("express");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const router = express.Router();

router.use((req,res,next)=>{

    console.log(
        "🎵 MUSIC ROUTE HIT:",
        req.method,
        req.originalUrl
    );

    next();

});

const pool = require("../config/database");

const authMiddleware =
    require("../middleware/authMiddleware");

const upload =
    require("../middleware/uploadMiddleware");

const uploadController =
    require("../controllers/uploadController");

const { lookupCountry } = require("../utils/geoip");
// ======================================================
// HELPERS
// ======================================================

const getSongId = (value) => {

    const songId = Number(value);

    if (!Number.isInteger(songId) || songId <= 0) {
        return null;
    }

    return songId;
};

// ======================================================
// RESOLVE LOCAL AUDIO FILE
//
// Only allows files inside uploads/audio.
// Prevents path traversal and external file access.
// ======================================================

const getAudioFilePath = (audioUrl) => {
    if (!audioUrl) {
        return null;
    }

    try {
        let audioPath = String(audioUrl).trim();

        // Support existing absolute URLs.
        if (/^https?:\/\//i.test(audioPath)) {
            audioPath = new URL(audioPath).pathname;
        }

        // Remove query strings.
        audioPath = audioPath.split("?")[0];

        // Normalize old database paths.
        audioPath = audioPath.replace(/\\/g, "/");

        if (audioPath.startsWith("/")) {
            audioPath = audioPath.slice(1);
        }

        if (audioPath.startsWith("uploads/")) {
            audioPath = audioPath.slice("uploads/".length);
        }

        // Audio must be inside uploads/audio.
        if (!audioPath.startsWith("audio/")) {
            return null;
        }

        const filename = path.basename(audioPath);

        if (!filename || filename === "." || filename === "..") {
            return null;
        }

        const uploadsRoot = path.resolve(
            __dirname,
            "..",
            "uploads"
        );

        const fullPath = path.resolve(
            uploadsRoot,
            "audio",
            filename
        );

        const audioDirectory = path.resolve(
            uploadsRoot,
            "audio"
        );

        if (!fullPath.startsWith(audioDirectory + path.sep)) {
            return null;
        }

        return fullPath;
    }
    catch (error) {
        console.error("AUDIO PATH ERROR:", error);
        return null;
    }
};
// ======================================================
// DELETE LOCAL FILE
// ======================================================

const deleteLocalFile = async (fileValue) => {

    if (!fileValue) {
        return;
    }

    const fileString =
        String(fileValue).trim();

    if (!fileString) {
        return;
    }


    // Do not delete external files
    if (
        fileString.startsWith("http://") ||
        fileString.startsWith("https://")
    ) {
        return;
    }


    try {

        let cleanPath =
            fileString
                .replace(/^https?:\/\/[^/]+/i, "")
                .split("?")[0];


        cleanPath =
            cleanPath.replace(/^[/\\]+/, "");


        // Prevent path traversal
        if (
            cleanPath.includes("..")
        ) {

            console.warn(
                "Skipped unsafe file path:",
                fileString
            );

            return;
        }


        const uploadsRoot =
            path.resolve(
                __dirname,
                "..",
                "uploads"
            );


        const fullPath =
            path.resolve(
                uploadsRoot,
                cleanPath
                    .replace(
                        /^uploads[/\\]/i,
                        ""
                    )
            );


        // Make sure file remains inside uploads
        if (
            fullPath !== uploadsRoot &&
            !fullPath.startsWith(
                `${uploadsRoot}${path.sep}`
            )
        ) {

            console.warn(
                "Skipped file outside uploads directory:",
                fileString
            );

            return;
        }


        if (
            fs.existsSync(fullPath)
        ) {

            await fs.promises.unlink(
                fullPath
            );

            console.log(
                "Deleted uploaded file:",
                fullPath
            );

        }

    }

    catch (error) {

        console.warn(
            "Unable to delete local file:",
            fileString,
            error.message
        );

    }

};


// ======================================================
// DELETE ALL SONG FILES
// ======================================================

const deleteSongFiles = async (song) => {

    const possibleFiles = [

        song.audio_url,

        song.cover_url,

        song.lyrics_file_url,

        song.canvas_video_url,

        song.dolby_file_url,

        song.audio_file_url,

        song.cover_file_url,

        song.canvas_url,

        song.dolby_url

    ];


    const uniqueFiles = [
        ...new Set(
            possibleFiles.filter(Boolean)
        )
    ];


    for (
        const fileValue of uniqueFiles
    ) {

        await deleteLocalFile(
            fileValue
        );

    }

};


// ======================================================
// TEST
// ======================================================

router.get(
    "/test",
    (req, res) => {

        res.json({

            success: true,

            message:
                "Music Routes Working"

        });

    }
);


// ======================================================
// HOME PAGE
// NEW RELEASES
//
// Returns the newest uploaded songs.
//
// Singles, EP tracks and Album tracks are all
// included here.
//
// Newest first.
// ======================================================

router.get(
    "/home/new-releases",
    async (req, res) => {

        try {

            const limit =
                Math.min(
                    Number(req.query.limit) || 12,
                    50
                );


            const result =
                await pool.query(
                    `
                    SELECT
                        *

                    FROM songs

                    WHERE
                        COALESCE(
                            LOWER(status),
                            'published'
                        )
                        NOT IN (
                            'draft',
                            'deleted',
                            'rejected'
                        )

                    ORDER BY
                        created_at DESC

                    LIMIT $1
                    `,
                    [
                        limit
                    ]
                );


            return res.json({

                success: true,

                songs:
                    result.rows

            });

        }

        catch (error) {

            console.error(
                "NEW RELEASES ERROR:",
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    "Unable to load new releases."

            });

        }

    }
);


// ======================================================
// HOME PAGE
// TRENDING SONGS
//
// Ranking is based on:
//
// plays + likes
//
// Plays have slightly more weight so actual listening
// activity has stronger influence.
// ======================================================

router.get(
    "/home/trending",
    async (req, res) => {

        try {

            const limit =
                Math.min(
                    Number(req.query.limit) || 12,
                    50
                );


            const result =
                await pool.query(
                    `
                    SELECT
                        *,

                        (
                            COALESCE(plays, 0) * 3
                            +
                            COALESCE(likes, 0) * 2
                        ) AS trending_score

                    FROM songs

                    WHERE
                        COALESCE(
                            LOWER(status),
                            'published'
                        )
                        NOT IN (
                            'draft',
                            'deleted',
                            'rejected'
                        )

                    ORDER BY

                        (
                            COALESCE(plays, 0) * 3
                            +
                            COALESCE(likes, 0) * 2
                        ) DESC,

                        created_at DESC

                    LIMIT $1
                    `,
                    [
                        limit
                    ]
                );


            return res.json({

                success: true,

                songs:
                    result.rows

            });

        }

        catch (error) {

            console.error(
                "TRENDING SONGS ERROR:",
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    "Unable to load trending songs."

            });

        }

    }
);


// ======================================================
// HOME PAGE
// TOP ALBUMS / EPS
//
// Albums and EPs are grouped together.
//
// Each release contains:
// - title
// - artist
// - cover
// - release type
// - genre
// - number of tracks
// - total plays
// - total likes
// - tracks
// ======================================================

router.get(
    "/home/albums",
    async (req, res) => {

        try {

            const limit =
                Math.min(
                    Number(req.query.limit) || 12,
                    50
                );


            const result =
                await pool.query(
                    `
                    SELECT

                        COALESCE(
                            NULLIF(
                                TRIM(album_name),
                                ''
                            ),
                            NULLIF(
                                TRIM(title),
                                ''
                            )
                        ) AS album_title,


                        MAX(
                            NULLIF(
                                TRIM(artist_name),
                                ''
                            )
                        ) AS artist_name,


                        MAX(
                            NULLIF(
                                TRIM(cover_url),
                                ''
                            )
                        ) AS cover_url,


                        MAX(
                            NULLIF(
                                TRIM(album_name),
                                ''
                            )
                        ) AS album_name,


                        MAX(
                            NULLIF(
                                TRIM(release_type),
                                ''
                            )
                        ) AS release_type,


                        MAX(
                            NULLIF(
                                TRIM(genre),
                                ''
                            )
                        ) AS genre,


                        COUNT(*) AS track_count,


                        SUM(
                            COALESCE(
                                plays,
                                0
                            )
                        ) AS total_plays,


                        SUM(
                            COALESCE(
                                likes,
                                0
                            )
                        ) AS total_likes,


                        MAX(created_at)
                            AS latest_release,


                        JSON_AGG(

                            JSON_BUILD_OBJECT(

                                'id',
                                id,

                                'title',
                                title,

                                'artist',
                                artist_name,

                                'cover',
                                cover_url,

                                'audioUrl',
                                audio_url,

                                'duration',
                                duration,

                                'plays',
                                COALESCE(
                                    plays,
                                    0
                                ),

                                'likes',
                                COALESCE(
                                    likes,
                                    0
                                ),

                                'trackNumber',
                                track_number

                            )

                            ORDER BY
                                track_number NULLS LAST,
                                id ASC

                        ) AS tracks


                    FROM songs


                    WHERE

                        LOWER(
                            COALESCE(
                                release_type,
                                ''
                            )
                        )
                        IN (
                            'album',
                            'ep'
                        )

                        

                       AND

                        COALESCE(
                            TRIM(album_name),
                            TRIM(title),
                            ''
                        ) <> ''

                        AND

                        COALESCE(
                            LOWER(status),
                            'published'
                        )
                        NOT IN (
                            'draft',
                            'deleted',
                            'rejected'
                        )


                    GROUP BY

                        COALESCE(
                            NULLIF(
                                TRIM(album_name),
                                ''
                            ),
                            NULLIF(
                                TRIM(title),
                                ''
                            )
                        )


                    ORDER BY

                        SUM(
                            COALESCE(
                                plays,
                                0
                            )
                        ) DESC,

                        MAX(created_at) DESC


                    LIMIT $1
                    `,
                    [
                        limit
                    ]
                );


            return res.json({

                success: true,

                albums:
                    result.rows

            });

        }

        catch (error) {

            console.error(
                "TOP ALBUMS ERROR:",
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    "Unable to load albums and EPs."

            });

        }

    }
);


// ======================================================
// GET MY SONGS
// PROFILE PAGE
// ======================================================

router.get(
    "/my-songs",
    authMiddleware,
    async (req, res) => {

        try {

            const result =
                await pool.query(
                    `
                    SELECT *

                    FROM songs

                    WHERE user_id = $1

                    ORDER BY
                        created_at DESC
                    `,
                    [
                        req.userId
                    ]
                );


            return res.json({

                success: true,

                songs:
                    result.rows

            });

        }

        catch (error) {

            console.error(
                "MY SONGS ERROR:",
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    "Unable to load your songs."

            });

        }

    }
);


// ======================================================
// GET MY UPLOADS
// ARTIST DASHBOARD
// ======================================================

router.get(
    "/my-uploads",
    authMiddleware,
    async (req, res) => {

        try {

            const result =
                await pool.query(
                    `
                    SELECT *

                    FROM songs

                    WHERE user_id = $1

                    ORDER BY
                        created_at DESC
                    `,
                    [
                        req.userId
                    ]
                );


            return res.json({

                success: true,

                songs:
                    result.rows

            });

        }

        catch (error) {

            console.error(
                "MY UPLOADS ERROR:",
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    "Unable to load your uploads."

            });

        }

    }
);


// ======================================================
// UPLOAD RELEASE
//
// SINGLE / EP / ALBUM
// ======================================================

router.post(

    "/upload",

    authMiddleware,

    upload.fields([

        {
            name: "audio",
            maxCount: 50
        },

        {
            name: "cover",
            maxCount: 1
        },

        {
            name: "lyrics",
            maxCount: 1
        },

        {
            name: "canvas_video",
            maxCount: 1
        },

        {
            name: "dolby_file",
            maxCount: 1
        }

    ]),

    uploadController.uploadSong

);


// ======================================================
// GET ALL PUBLISHED MUSIC WITH UPLOADER ROLE
// ======================================================

router.get("/", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        s.*,
        LOWER(COALESCE(u.role, 'listener')) AS uploader_role
      FROM songs s
      LEFT JOIN users u
        ON u.id = s.user_id
      WHERE COALESCE(LOWER(s.status), 'published')
        NOT IN ('draft', 'deleted', 'rejected')
      ORDER BY s.created_at DESC
    `);

    return res.json({
      success: true,
      songs: result.rows,
    });

  } catch (error) {
    console.error("GET ALL MUSIC ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to load music.",
    });
  }
});


// ======================================================
// LISTENING SESSIONS
//
// A play qualifies after 30 seconds of verified playback.
// The server validates elapsed time against media progress.
// ======================================================



 // ======================================================
 // START LISTENING SESSION
 //
 // POST /api/music/:id/listening-session
 //
 // Detects listener country using GeoLite2.
 // Stores only the hashed IP and country code.
 // ======================================================

router.post(
    "/:id/listening-session",
    authMiddleware.optional,
    async (req, res) => {
        try {
            const songId = getSongId(req.params.id);

            if (!songId) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid song ID."
                });
            }

            const userId = req.userId
                ? Number(req.userId)
                : null;

            const visitorId =
                req.body?.visitor_id ||
                req.headers["x-visitor-id"] ||
                null;

            if (!userId && !visitorId) {
                return res.status(400).json({
                    success: false,
                    message: "Listener identity is required."
                });
            }

            // ==================================================
            // CHECK SONG
            // ==================================================

            const songResult = await pool.query(
                `
                SELECT id, user_id
                FROM songs
                WHERE id = $1
                AND COALESCE(
                    LOWER(status),
                    'published'
                ) NOT IN (
                    'draft',
                    'deleted',
                    'rejected'
                )
                LIMIT 1
                `,
                [songId]
            );

            if (!songResult.rows.length) {
                return res.status(404).json({
                    success: false,
                    message: "Song not found."
                });
            }

            // ==================================================
            // PREVENT ARTISTS COUNTING THEIR OWN PLAYS
            // ==================================================

            if (
                userId &&
                Number(songResult.rows[0].user_id) === userId
            ) {
                return res.status(403).json({
                    success: false,
                    message: "You cannot earn plays on your own song."
                });
            }

            // ==================================================
            // GET LISTENER IP
            //
            // Local development:
            // Use the direct connection IP.
            //
            // Do not trust forwarded IP headers until
            // the reverse proxy configuration is verified.
            // ==================================================

            const ipAddress =
                req.socket.remoteAddress || null;

            // ==================================================
            // HASH IP ADDRESS
            //
            // Never store the raw IP address.
            // ==================================================

            const ipHash = ipAddress
                ? crypto
                    .createHash("sha256")
                    .update(ipAddress)
                    .digest("hex")
                : null;

            // ==================================================
            // GEOLOCATION
            //
            // Examples:
            // Malawi       = MW
            // South Africa = ZA
            // Nigeria      = NG
            // United States = US
            // ==================================================

            const country = await lookupCountry(ipAddress);

            // ==================================================
            // CREATE SESSION
            // ==================================================

            const sessionId = crypto.randomUUID();

            await pool.query(
                `
                INSERT INTO listening_sessions (
                    id,
                    song_id,
                    user_id,
                    visitor_id,
                    ip_hash,
                    country,
                    started_at,
                    last_heartbeat_at,
                    last_media_time,
                    listened_seconds,
                    status
                )
                VALUES (
                    $1,
                    $2,
                    $3,
                    $4,
                    $5,
                    $6,
                    NOW(),
                    NOW(),
                    0,
                    0,
                    'active'
                )
                `,
                [
                    sessionId,
                    songId,
                    userId,
                    visitorId,
                    ipHash,
                    country
                ]
            );

            console.log("🌍 LISTENER GEOLOCATION:", {
                sessionId,
                country: country || "Unknown"
            });

            return res.status(201).json({
                success: true,
                session_id: sessionId,
                country: country,
                message: "Listening session started."
            });
        }
        catch (error) {
            console.error(
                "START LISTENING SESSION ERROR:",
                error
            );

            return res.status(500).json({
                success: false,
                message: "Unable to start listening session."
            });
        }
    }
);


// ======================================================
// LISTENING HEARTBEAT
//
// POST /api/music/:id/listening-session/:sessionId/heartbeat
//
// Heartbeats should be sent approximately every 5 seconds
// while the audio is actually playing.
// ======================================================

router.post(
    "/:id/listening-session/:sessionId/heartbeat",
    authMiddleware.optional,
    async (req, res) => {
        const client = await pool.connect();

        try {
            const songId = getSongId(req.params.id);
            const sessionId = String(req.params.sessionId);

            const mediaTime = Number(req.body?.media_time);
            const isPlaying = req.body?.playing === true;

            if (!songId) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid song ID."
                });
            }

            if (
                !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(sessionId)
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid listening session."
                });
            }

            if (
                !Number.isFinite(mediaTime) ||
                mediaTime < 0 ||
                mediaTime > 86400
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid playback position."
                });
            }

            await client.query("BEGIN");

            // Lock the session so simultaneous heartbeats
            // cannot add the same listening time twice.
            const sessionResult = await client.query(
                `
                SELECT
                    *,
                    EXTRACT(
                        EPOCH FROM (
                            NOW() - last_heartbeat_at
                        )
                    ) AS elapsed_seconds
                FROM listening_sessions
                WHERE
                    id = $1
                    AND song_id = $2
                FOR UPDATE
                `,
                [sessionId, songId]
            );

            if (!sessionResult.rows.length) {
                await client.query("ROLLBACK");

                return res.status(404).json({
                    success: false,
                    message: "Listening session not found."
                });
            }

            const session = sessionResult.rows[0];

            // A completed session cannot earn another play.
            if (session.status !== "active") {
                await client.query("COMMIT");

                return res.json({
                    success: true,
                    qualified: session.status === "qualified",
                    counted: false,
                    listened_seconds: Number(
                        session.listened_seconds || 0
                    ),
                    message: "This listening session is already complete."
                });
            }

            // Ensure the session belongs to the current listener.
            const requestUserId = req.userId
                ? Number(req.userId)
                : null;

            const requestVisitorId =
                req.body?.visitor_id ||
                req.headers["x-visitor-id"] ||
                null;

            const ownsSession = session.user_id
                ? requestUserId &&
                    Number(session.user_id) === requestUserId
                : !requestUserId &&
                    requestVisitorId &&
                    session.visitor_id === requestVisitorId;

            if (!ownsSession) {
                await client.query("ROLLBACK");

                return res.status(403).json({
                    success: false,
                    message: "You do not own this listening session."
                });
            }

            const elapsed = Number(
                session.elapsed_seconds || 0
            );

            const previousMediaTime = Number(
                session.last_media_time || 0
            );

            const mediaDelta =
                mediaTime - previousMediaTime;

            let addedSeconds = 0;

            // Credit progress only when:
            // - the player reports that it is playing;
            // - heartbeat timing is plausible;
            // - media position moves forward;
            // - media movement reasonably matches server time.
            //
            // Long delays, seeks, and suspicious jumps
            // reset the baseline without adding listening time.
            const validProgress =
                isPlaying &&
                elapsed >= 1 &&
                elapsed <= 15 &&
                mediaDelta > 0 &&
                mediaDelta <= elapsed + 2 &&
                mediaDelta >= elapsed * 0.5;
console.log("🎧 LISTENING VALIDATION:", {
    sessionId,
    isPlaying,
    elapsed,
    previousMediaTime,
    mediaTime,
    mediaDelta,
    validProgress
});
            if (validProgress) {
                addedSeconds = Math.min(
                    mediaDelta,
                    8
                );
            }

            const totalListened =
                Number(session.listened_seconds || 0) +
                addedSeconds;

            // Update the heartbeat baseline.
            await client.query(
                `
                UPDATE listening_sessions
                SET
                    last_heartbeat_at = NOW(),
                    last_media_time = $1,
                    listened_seconds = $2
                WHERE id = $3
                `,
                [
                    mediaTime,
                    totalListened,
                    sessionId
                ]
            );

            // Not yet qualified.
            if (totalListened < 30) {
                await client.query("COMMIT");

                return res.json({
                    success: true,
                    qualified: false,
                    counted: false,
                    listened_seconds: Number(
                        totalListened.toFixed(2)
                    ),
                    remaining_seconds: Number(
                        Math.max(0, 30 - totalListened).toFixed(2)
                    ),
                    message: "Listening progress recorded."
                });
            }

            // Lock the song while checking the 24-hour rule.
            const songResult = await client.query(
                `
                SELECT id, plays, user_id
                FROM songs
                WHERE id = $1
                FOR UPDATE
                `,
                [songId]
            );

            if (!songResult.rows.length) {
                await client.query("ROLLBACK");

                return res.status(404).json({
                    success: false,
                    message: "Song not found."
                });
            }

            const song = songResult.rows[0];

            let existingPlay;

            if (session.user_id) {
                existingPlay = await client.query(
                    `
                    SELECT id
                    FROM plays
                    WHERE
                        track_id = $1
                        AND user_id = $2
                        AND played_at > NOW() - INTERVAL '24 hours'
                    LIMIT 1
                    `,
                    [
                        songId,
                        session.user_id
                    ]
                );
            }
            else {
                existingPlay = await client.query(
                    `
                    SELECT id
                    FROM plays
                    WHERE
                        track_id = $1
                        AND visitor_id = $2
                        AND played_at > NOW() - INTERVAL '24 hours'
                    LIMIT 1
                    `,
                    [
                        songId,
                        session.visitor_id
                    ]
                );
            }

            let counted = false;
            let currentPlays = Number(song.plays || 0);

            if (!existingPlay.rows.length) {
                await client.query(
                    `
                        INSERT INTO plays (
                            track_id,
                            user_id,
                            visitor_id,
                            ip_hash,
                            country,
                            played_at
                        )
                        VALUES ($1, $2, $3, $4, $5, NOW())
                        `,
                        [
                            songId,
                            session.user_id,
                            session.visitor_id,
                            session.ip_hash,
                            session.country
                        ]
                    );

                const updateResult = await client.query(
                    `
                    UPDATE songs
                    SET
                        plays = COALESCE(plays, 0) + 1
                    WHERE id = $1
                    RETURNING plays
                    `,
                    [songId]
                );

                currentPlays = Number(
                    updateResult.rows[0].plays
                );

                counted = true;
            }

            // Mark the session complete whether or not
            // the 24-hour rule allowed a new play.
            await client.query(
                `
                UPDATE listening_sessions
                SET
                    status = 'qualified',
                    qualified_at = NOW()
                WHERE id = $1
                `,
                [sessionId]
            );

            await client.query("COMMIT");

            return res.json({
                success: true,
                qualified: true,
                counted,
                plays: currentPlays,
                listened_seconds: Number(
                    totalListened.toFixed(2)
                ),
                message: counted
                    ? "Play counted successfully."
                    : "Listening qualified, but this listener's play was already counted within 24 hours."
            });
        }
        catch (error) {
            try {
                await client.query("ROLLBACK");
            }
            catch (rollbackError) {
                console.error(
                    "LISTENING SESSION ROLLBACK ERROR:",
                    rollbackError
                );
            }

            console.error(
                "LISTENING HEARTBEAT ERROR:",
                error
            );

            return res.status(500).json({
                success: false,
                message: "Unable to update listening session."
            });
        }
        finally {
            client.release();
        }
    }
);


// ======================================================
// PLAY COUNT
// PUBLIC + AUTHENTICATED USERS
//
// A play is counted only once per listener/song
// within a 24-hour period.
//
// The frontend should call this endpoint after
// the listener has actually listened for 30 seconds.
// ======================================================


// ======================================================
// LEGACY PLAY COUNT ENDPOINT
//
// Direct play counting is disabled.
// Plays must qualify through listening sessions.
// ======================================================

router.post(
    "/:id/play",
    authMiddleware.optional,
    (req, res) => {
        return res.status(410).json({
            success: false,
            code: "LISTENING_SESSION_REQUIRED",
            message:
                "Direct play counting is disabled. Start a listening session and complete 30 seconds of verified playback."
        });
    }
);





// ======================================================
// GET LIKE STATUS
// AUTHENTICATED USERS ONLY
// ======================================================

router.get(
    "/:id/like",
    authMiddleware,
    async (req, res) => {

        try {

            const songId =
                getSongId(req.params.id);

            const userId =
                Number(req.userId);


            if (!songId) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid song ID."

                });

            }


            if (
                !Number.isInteger(userId) ||
                userId <= 0
            ) {

                return res.status(401).json({

                    success: false,

                    message:
                        "Authentication required."

                });

            }


            const result =
                await pool.query(
                    `
                    SELECT
                        EXISTS (
                            SELECT 1

                            FROM song_likes

                            WHERE
                                song_id = $1
                            AND
                                user_id = $2
                        ) AS liked

                    `,
                    [
                        songId,
                        userId
                    ]
                );


            const songResult =
                await pool.query(
                    `
                    SELECT
                        COALESCE(
                            likes,
                            0
                        ) AS likes

                    FROM songs

                    WHERE id = $1

                    LIMIT 1
                    `,
                    [
                        songId
                    ]
                );


            if (!songResult.rows.length) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Song not found."

                });

            }


            return res.json({

                success: true,

                liked:
                    result.rows[0].liked,

                likes:
                    Number(
                        songResult.rows[0].likes
                    )

            });

        }

        catch (error) {

            console.error(
                "GET LIKE STATUS ERROR:",
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    "Unable to load like status."

            });

        }

    }
);

// ======================================================
// LIKE / UNLIKE SONG
// AUTHENTICATED USERS ONLY
// ======================================================

router.post(
    "/:id/like",
    authMiddleware,
    async (req, res) => {

        try {

            const songId =
                getSongId(req.params.id);

            const userId =
                Number(req.userId);


            if (!songId) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid song ID."

                });

            }


            if (
                !Number.isInteger(userId) ||
                userId <= 0
            ) {

                return res.status(401).json({

                    success: false,

                    message:
                        "Authentication required."

                });

            }


            // ==================================================
            // CHECK SONG
            // ==================================================

            const songResult =
                await pool.query(
                    `
                    SELECT
                        id,
                        likes

                    FROM songs

                    WHERE id = $1

                    LIMIT 1
                    `,
                    [
                        songId
                    ]
                );


            if (!songResult.rows.length) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Song not found."

                });

            }


            // ==================================================
            // CHECK EXISTING LIKE
            // ==================================================

            const existingLike =
                await pool.query(
                    `
                    SELECT id

                    FROM song_likes

                    WHERE
                        song_id = $1
                    AND
                        user_id = $2

                    LIMIT 1
                    `,
                    [
                        songId,
                        userId
                    ]
                );


            // ==================================================
            // ALREADY LIKED
            // REMOVE LIKE
            // ==================================================

            if (existingLike.rows.length) {

                await pool.query(
                    `
                    DELETE FROM song_likes

                    WHERE
                        song_id = $1
                    AND
                        user_id = $2
                    `,
                    [
                        songId,
                        userId
                    ]
                );


                const result =
                    await pool.query(
                        `
                        UPDATE songs

                        SET
                            likes =
                                GREATEST(
                                    COALESCE(likes, 0) - 1,
                                    0
                                )

                        WHERE id = $1

                        RETURNING
                            id,
                            likes
                        `,
                        [
                            songId
                        ]
                    );


                return res.json({

                    success: true,

                    liked: false,

                    likes:
                        result.rows[0].likes

                });

            }


            // ==================================================
            // ADD LIKE
            // ==================================================

            await pool.query(
                `
                INSERT INTO song_likes (
                    song_id,
                    user_id
                )

                VALUES (
                    $1,
                    $2
                )
                `,
                [
                    songId,
                    userId
                ]
            );


            const result =
                await pool.query(
                    `
                    UPDATE songs

                    SET
                        likes =
                            COALESCE(likes, 0) + 1

                    WHERE id = $1

                    RETURNING
                        id,
                        likes
                    `,
                    [
                        songId
                    ]
                );


            return res.json({

                success: true,

                liked: true,

                likes:
                    result.rows[0].likes

            });

        }

        catch (error) {

            console.error(
                "LIKE SONG ERROR:",
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    "Unable to update like."

            });

        }

    }
);

// ======================================================
// UNLIKE SONG
//
// ONLY AUTHENTICATED CAVE TUNES USERS
// ======================================================

router.delete(
    "/:id/like",
    authMiddleware,
    async (req, res) => {

        const client = await pool.connect();

        try {

            const songId =
                getSongId(req.params.id);

            const userId =
                req.userId;


            // ==================================================
            // VALIDATE
            // ==================================================

            if (!songId) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid song ID."

                });

            }


            if (!userId) {

                return res.status(401).json({

                    success: false,

                    message:
                        "Authentication required."

                });

            }


            await client.query("BEGIN");


            // ==================================================
            // LOCK SONG
            // ==================================================

            const songResult =
                await client.query(
                    `
                    SELECT
                        id,
                        likes

                    FROM songs

                    WHERE id = $1

                    FOR UPDATE
                    `,
                    [
                        songId
                    ]
                );


            if (!songResult.rows.length) {

                await client.query("ROLLBACK");

                return res.status(404).json({

                    success: false,

                    message:
                        "Song not found."

                });

            }


            // ==================================================
            // REMOVE USER LIKE
            // ==================================================

            const deleteResult =
                await client.query(
                    `
                    DELETE FROM song_likes

                    WHERE
                        song_id = $1

                        AND

                        user_id = $2

                    RETURNING id
                    `,
                    [
                        songId,
                        userId
                    ]
                );


            // ==================================================
            // USER DID NOT LIKE IT
            // ==================================================

            if (
                deleteResult.rows.length === 0
            ) {

                await client.query("COMMIT");


                return res.json({

                    success: true,

                    liked: false,

                    likes:
                        Number(
                            songResult.rows[0].likes || 0
                        ),

                    message:
                        "Song was not liked."

                });

            }


            // ==================================================
            // DECREASE LIKE COUNT
            // ==================================================

            const updatedSong =
                await client.query(
                    `
                    UPDATE songs

                    SET

                        likes =
                            GREATEST(
                                COALESCE(
                                    likes,
                                    0
                                ) - 1,
                                0
                            ),

                        updated_at =
                            CURRENT_TIMESTAMP

                    WHERE id = $1

                    RETURNING
                        id,
                        likes
                    `,
                    [
                        songId
                    ]
                );


            await client.query("COMMIT");


            return res.json({

                success: true,

                liked: false,

                likes:
                    Number(
                        updatedSong.rows[0].likes
                    ),

                message:
                    "Song unliked successfully."

            });

        }

        catch (error) {

            try {
                await client.query("ROLLBACK");
            } catch (rollbackError) {
                console.error(
                    "ROLLBACK ERROR:",
                    rollbackError
                );
            }


            console.error(
                "UNLIKE SONG ERROR:",
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    "Unable to unlike song."

            });

        }

        finally {

            client.release();

        }

    }
);

// ======================================================
// STREAM SONG
//
// GET /api/music/:id/stream
//
// Normal playback remains free.
// Supports browser audio playback and seeking.
// Does NOT count as an official download.
// ======================================================

router.get(
    "/:id/stream",
    async (req, res) => {
        try {
            const songId = getSongId(req.params.id);

            if (!songId) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid song ID."
                });
            }

            const result = await pool.query(
                `
                SELECT
                    id,
                    audio_url
                FROM songs
                WHERE id = $1
                AND COALESCE(
                    LOWER(status),
                    'published'
                ) NOT IN (
                    'draft',
                    'deleted',
                    'rejected'
                )
                LIMIT 1
                `,
                [songId]
            );

            if (!result.rows.length) {
                return res.status(404).json({
                    success: false,
                    message: "Song not found."
                });
            }

            const audioFile = getAudioFilePath(
                result.rows[0].audio_url
            );

            if (!audioFile || !fs.existsSync(audioFile)) {
                return res.status(404).json({
                    success: false,
                    message: "Audio file not found."
                });
            }

            res.setHeader(
                "Content-Type",
                "audio/mpeg"
            );

            res.setHeader(
                "Accept-Ranges",
                "bytes"
            );

            res.setHeader(
                "Cache-Control",
                "private, no-cache"
            );

            return res.sendFile(
                audioFile,
                (error) => {
                    if (error && !res.headersSent) {
                        console.error(
                            "AUDIO STREAM ERROR:",
                            error
                        );

                        res.status(500).json({
                            success: false,
                            message: "Unable to stream audio."
                        });
                    }
                }
            );
        }
        catch (error) {
            console.error(
                "STREAM SONG ERROR:",
                error
            );

            if (!res.headersSent) {
                return res.status(500).json({
                    success: false,
                    message: "Unable to stream song."
                });
            }
        }
    }
);


// ======================================================
// YOU MAY ALSO LIKE
//
// GET /api/music/:id/recommendations
//
// Matches the song genre and the creator's registered
// country from users.country.
// ======================================================

router.get(
    "/:id/recommendations",
    async (req, res) => {
        try {
            const songId = getSongId(req.params.id);

            if (!songId) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid song ID."
                });
            }

            const limit = Math.min(
                Math.max(parseInt(req.query.limit, 10) || 12, 1),
                20
            );

            // Get the current song and its owner's registered country.
            const anchorResult = await pool.query(
                `
                SELECT
                    s.id,
                    s.user_id,
                    s.genre,
                    s.artist_name,
                    u.country AS owner_country
                FROM songs s
                LEFT JOIN users u
                    ON u.id = s.user_id
                WHERE s.id = $1
                AND COALESCE(LOWER(s.status), 'published')
                    NOT IN ('draft', 'deleted', 'rejected')
                LIMIT 1
                `,
                [songId]
            );

            if (!anchorResult.rows.length) {
                return res.status(404).json({
                    success: false,
                    message: "Song not found."
                });
            }

            const anchor = anchorResult.rows[0];

            const result = await pool.query(
                `
                SELECT
                    rec.*,
                    LOWER(COALESCE(owner.role, 'listener'))
                        AS uploader_role,
                    owner.country AS owner_country

                FROM songs rec

                LEFT JOIN users owner
                    ON owner.id = rec.user_id

                WHERE
                    rec.id <> $1

                    AND COALESCE(LOWER(rec.status), 'published')
                        NOT IN ('draft', 'deleted', 'rejected')

                    AND (
                        (
                            NULLIF(TRIM($2), '') IS NOT NULL
                            AND LOWER(TRIM(COALESCE(rec.genre, '')))
                                = LOWER(TRIM($2))
                        )

                        OR (
                            NULLIF(TRIM($3), '') IS NOT NULL
                            AND LOWER(TRIM(COALESCE(rec.artist_name, '')))
                                = LOWER(TRIM($3))
                        )

                        OR (
                            NULLIF(TRIM($4), '') IS NOT NULL
                            AND LOWER(TRIM(COALESCE(owner.country, '')))
                                = LOWER(TRIM($4))
                        )
                    )

                ORDER BY
                    CASE
                        WHEN
                            NULLIF(TRIM($2), '') IS NOT NULL
                            AND LOWER(TRIM(COALESCE(rec.genre, '')))
                                = LOWER(TRIM($2))
                            AND NULLIF(TRIM($4), '') IS NOT NULL
                            AND LOWER(TRIM(COALESCE(owner.country, '')))
                                = LOWER(TRIM($4))
                        THEN 0

                        WHEN
                            NULLIF(TRIM($2), '') IS NOT NULL
                            AND LOWER(TRIM(COALESCE(rec.genre, '')))
                                = LOWER(TRIM($2))
                        THEN 1

                        WHEN
                            NULLIF(TRIM($3), '') IS NOT NULL
                            AND LOWER(TRIM(COALESCE(rec.artist_name, '')))
                                = LOWER(TRIM($3))
                            AND NULLIF(TRIM($4), '') IS NOT NULL
                            AND LOWER(TRIM(COALESCE(owner.country, '')))
                                = LOWER(TRIM($4))
                        THEN 2

                        WHEN
                            NULLIF(TRIM($3), '') IS NOT NULL
                            AND LOWER(TRIM(COALESCE(rec.artist_name, '')))
                                = LOWER(TRIM($3))
                        THEN 3

                        ELSE 4
                    END,

                    COALESCE(rec.plays, 0) DESC,
                    rec.created_at DESC

                LIMIT $5
                `,
                [
                    songId,
                    anchor.genre,
                    anchor.artist_name,
                    anchor.owner_country,
                    limit
                ]
            );

            return res.json({
                success: true,
                count: result.rows.length,
                owner_country: anchor.owner_country,
                songs: result.rows
            });

        } catch (error) {
            console.error(
                "SONG RECOMMENDATIONS ERROR:",
                error
            );

            return res.status(500).json({
                success: false,
                message: "Unable to load song recommendations."
            });
        }
    }
);

// ======================================================
// ARTIST ANALYTICS
//
// GET /api/music/analytics/me?period=7d
//
// Periods:
// 7d  = Last 7 days
// 30d = Last 30 days
// 90d = Last 90 days
// all = All time
//
// No earnings or financial information is returned.
// ======================================================

router.get(
    "/analytics/me",
    authMiddleware,
    async (req, res) => {

        try {

            const userId = Number(req.userId);

            const allowedPeriods = [
                "7d",
                "30d",
                "90d",
                "all"
            ];

            const period = allowedPeriods.includes(
                req.query.period
            )
                ? req.query.period
                : "30d";


            // ==================================================
            // SUMMARY
            // ==================================================

            const summaryResult = await pool.query(
                `
                SELECT

                    (
                        SELECT COUNT(*)
                        FROM plays p
                        INNER JOIN songs s
                            ON s.id = p.track_id
                        WHERE
                            s.user_id = $1
                            AND COALESCE(LOWER(s.status), 'published')
                                NOT IN ('draft', 'deleted', 'rejected')
                            AND (
                                $2::text = 'all'
                                OR p.played_at >= NOW() - CASE $2::text
                                    WHEN '7d' THEN INTERVAL '7 days'
                                    WHEN '30d' THEN INTERVAL '30 days'
                                    WHEN '90d' THEN INTERVAL '90 days'
                                    ELSE INTERVAL '30 days'
                                END
                            )
                    ) AS total_plays,


                    (
                        SELECT COUNT(
                            DISTINCT COALESCE(
                                p.user_id::text,
                                p.visitor_id,
                                p.ip_hash
                            )
                        )
                        FROM plays p
                        INNER JOIN songs s
                            ON s.id = p.track_id
                        WHERE
                            s.user_id = $1
                            AND COALESCE(LOWER(s.status), 'published')
                                NOT IN ('draft', 'deleted', 'rejected')
                            AND (
                                $2::text = 'all'
                                OR p.played_at >= NOW() - CASE $2::text
                                    WHEN '7d' THEN INTERVAL '7 days'
                                    WHEN '30d' THEN INTERVAL '30 days'
                                    WHEN '90d' THEN INTERVAL '90 days'
                                    ELSE INTERVAL '30 days'
                                END
                            )
                    ) AS unique_listeners,


                    (
                        SELECT COALESCE(
                            SUM(COALESCE(s.likes, 0)),
                            0
                        )
                        FROM songs s
                        WHERE
                            s.user_id = $1
                            AND COALESCE(LOWER(s.status), 'published')
                                NOT IN ('draft', 'deleted', 'rejected')
                    ) AS total_likes,


                    (
                        SELECT COUNT(*)
                        FROM songs s
                        WHERE
                            s.user_id = $1
                            AND COALESCE(LOWER(s.status), 'published')
                                NOT IN ('draft', 'deleted', 'rejected')
                    ) AS total_songs

                `,
                [userId, period]
            );


            // ==================================================
            // DAILY PLAY ACTIVITY
            // ==================================================

            const dailyResult = await pool.query(
                `
                SELECT

                    DATE(p.played_at) AS date,

                    COUNT(p.id)::INTEGER AS plays

                FROM plays p

                INNER JOIN songs s
                    ON s.id = p.track_id

                WHERE
                    s.user_id = $1

                    AND COALESCE(LOWER(s.status), 'published')
                        NOT IN ('draft', 'deleted', 'rejected')

                    AND (
                        $2::text = 'all'
                        OR p.played_at >= NOW() - CASE $2::text
                            WHEN '7d' THEN INTERVAL '7 days'
                            WHEN '30d' THEN INTERVAL '30 days'
                            WHEN '90d' THEN INTERVAL '90 days'
                            ELSE INTERVAL '30 days'
                        END
                    )

                GROUP BY DATE(p.played_at)

                ORDER BY DATE(p.played_at) ASC
                `,
                [userId, period]
            );


            // ==================================================
            // TOP PERFORMING SONGS
            // ==================================================

            const topSongsResult = await pool.query(
                `
                SELECT

                    s.id,

                    s.title,

                    s.artist_name,

                    s.cover_url,

                    COUNT(p.id)::INTEGER AS plays,

                    COALESCE(s.likes, 0) AS likes

                FROM songs s

                LEFT JOIN plays p
                    ON p.track_id = s.id

                    AND (
                        $2::text = 'all'
                        OR p.played_at >= NOW() - CASE $2::text
                            WHEN '7d' THEN INTERVAL '7 days'
                            WHEN '30d' THEN INTERVAL '30 days'
                            WHEN '90d' THEN INTERVAL '90 days'
                            ELSE INTERVAL '30 days'
                        END
                    )

                WHERE
                    s.user_id = $1

                    AND COALESCE(LOWER(s.status), 'published')
                        NOT IN ('draft', 'deleted', 'rejected')

                GROUP BY
                    s.id,
                    s.title,
                    s.artist_name,
                    s.cover_url,
                    s.likes

                ORDER BY
                    COUNT(p.id) DESC,
                    COALESCE(s.likes, 0) DESC

                LIMIT 10
                `,
                [userId, period]
            );


            // ==================================================
            // LISTENER COUNTRIES
            // ==================================================

            const countriesResult = await pool.query(
                `
                SELECT

                    TRIM(p.country) AS country,

                    COUNT(p.id)::INTEGER AS plays,

                    COUNT(
                        DISTINCT COALESCE(
                            p.user_id::text,
                            p.visitor_id,
                            p.ip_hash
                        )
                    )::INTEGER AS listeners

                FROM plays p

                INNER JOIN songs s
                    ON s.id = p.track_id

                WHERE
                    s.user_id = $1

                    AND p.country IS NOT NULL

                    AND TRIM(p.country) <> ''

                    AND COALESCE(LOWER(s.status), 'published')
                        NOT IN ('draft', 'deleted', 'rejected')

                    AND (
                        $2::text = 'all'
                        OR p.played_at >= NOW() - CASE $2::text
                            WHEN '7d' THEN INTERVAL '7 days'
                            WHEN '30d' THEN INTERVAL '30 days'
                            WHEN '90d' THEN INTERVAL '90 days'
                            ELSE INTERVAL '30 days'
                        END
                    )

                GROUP BY TRIM(p.country)

                ORDER BY COUNT(p.id) DESC

                `,
                [userId, period]
            );

// ==================================================
// FOLLOWER SUMMARY
// ==================================================

const followerSummaryResult = await pool.query(
    `
    SELECT
        COUNT(*)::INTEGER AS total_followers,

        COUNT(*) FILTER (
            WHERE
                followed_at IS NOT NULL
                AND (
                    $2::text = 'all'
                    OR followed_at >= NOW() - CASE $2::text
                        WHEN '7d' THEN INTERVAL '7 days'
                        WHEN '30d' THEN INTERVAL '30 days'
                        WHEN '90d' THEN INTERVAL '90 days'
                        ELSE INTERVAL '30 days'
                    END
                )
        )::INTEGER AS new_followers

    FROM followers

    WHERE artist_id = $1
    `,
    [userId, period]
);


// ==================================================
// DAILY FOLLOWER GROWTH
// ==================================================

const followerGrowthResult = await pool.query(
    `
    SELECT
        DATE(followed_at) AS date,

        COUNT(*)::INTEGER AS followers

    FROM followers

    WHERE
        artist_id = $1
        AND followed_at IS NOT NULL

        AND (
            $2::text = 'all'
            OR followed_at >= NOW() - CASE $2::text
                WHEN '7d' THEN INTERVAL '7 days'
                WHEN '30d' THEN INTERVAL '30 days'
                WHEN '90d' THEN INTERVAL '90 days'
                ELSE INTERVAL '30 days'
            END
        )

    GROUP BY DATE(followed_at)

    ORDER BY DATE(followed_at) ASC
    `,
    [userId, period]
);
            // ==================================================
            // RESPONSE
            // ==================================================

            return res.json({

                success: true,

                period,

                summary: {
                    total_plays: Number(
                        summaryResult.rows[0].total_plays
                    ),

                    unique_listeners: Number(
                        summaryResult.rows[0].unique_listeners
                    ),

                    total_likes: Number(
                        summaryResult.rows[0].total_likes
                    ),

                    total_songs: Number(
                        summaryResult.rows[0].total_songs
                    )
                },

                daily_activity: dailyResult.rows,

                top_songs: topSongsResult.rows,

                listener_countries: countriesResult.rows,


                follower_summary: {
    total_followers: Number(
        followerSummaryResult.rows[0].total_followers
    ),

    new_followers: Number(
        followerSummaryResult.rows[0].new_followers
    )
},

follower_growth: followerGrowthResult.rows
            });

        }

        catch (error) {

            console.error(
                "ARTIST ANALYTICS ERROR:",
                error
            );

            return res.status(500).json({

                success: false,

                message: "Unable to load artist analytics."

            });

        }

    }
);


// ======================================================
// GET SINGLE SONG
// ======================================================

router.get(
    "/:id",
    async (req, res) => {

        try {

            const songId =
                getSongId(
                    req.params.id
                );


            if (!songId) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid song ID."

                });

            }


            const result =
                await pool.query(
                    `
                    SELECT *

                    FROM songs

                    WHERE id = $1

                    LIMIT 1
                    `,
                    [
                        songId
                    ]
                );


            if (
                !result.rows.length
            ) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Song not found."

                });

            }


            return res.json({

                success: true,

                song:
                    result.rows[0]

            });

        }

        catch (error) {

            console.error(
                "GET SONG ERROR:",
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    "Unable to load song."

            });

        }

    }
);

// ======================================================
// UPDATE SONG
// ONLY OWNER CAN UPDATE
// ======================================================

router.put(
    "/:id",
    authMiddleware,
    async (req, res) => {

        try {

            const songId =
                getSongId(
                    req.params.id
                );


            if (!songId) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid song ID."

                });

            }


            const {
                title,
                genre,
                album_name
            } = req.body;


            const result =
                await pool.query(
                    `
                    UPDATE songs

                    SET

                        title = $1,

                        genre = $2,

                        album_name = $3,

                        updated_at = NOW()

                    WHERE

                        id = $4

                        AND

                        user_id = $5

                    RETURNING *
                    `,
                    [
                        title,
                        genre,
                        album_name,
                        songId,
                        req.userId
                    ]
                );


            if (
                !result.rows.length
            ) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Song not found or you do not have permission to edit it."

                });

            }


            return res.json({

                success: true,

                message:
                    "Song updated successfully.",

                song:
                    result.rows[0]

            });

        }

        catch (error) {

            console.error(
                "UPDATE SONG ERROR:",
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    "Unable to update song."

            });

        }

    }
);




// ======================================================
// PROTECTED SONG DOWNLOAD
//
// POST /api/music/:id/download
//
// REQUIREMENTS:
// 1. User must be authenticated.
// 2. User must have an active subscription.
// 3. Subscription must not have expired.
// 4. Actual MP3 file is returned.
// 5. Download count is recorded only once per user/song.
// 6. Song owners are also required to subscribe.
// ======================================================

router.post(
    "/:id/download",
    authMiddleware,
    async (req, res) => {
        const client = await pool.connect();

        try {
            const trackId = getSongId(req.params.id);
            const userId = Number(req.userId);

            // ==================================================
            // VALIDATE
            // ==================================================

            if (!trackId) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid song ID."
                });
            }

            if (
                !Number.isInteger(userId) ||
                userId <= 0
            ) {
                return res.status(401).json({
                    success: false,
                    message: "Authentication required."
                });
            }

            await client.query("BEGIN");

            // ==================================================
            // GET SONG AND LOCK ROW
            // ==================================================

            const songResult = await client.query(
                `
                SELECT
                    id,
                    user_id,
                    title,
                    audio_url,
                    downloads
                FROM songs
                WHERE id = $1
                FOR UPDATE
                `,
                [trackId]
            );

            if (!songResult.rows.length) {
                await client.query("ROLLBACK");

                return res.status(404).json({
                    success: false,
                    message: "Song not found."
                });
            }

            const song = songResult.rows[0];

            // ==================================================
            // VERIFY AUDIO FILE
            // ==================================================

            const audioFile = getAudioFilePath(
                song.audio_url
            );

            if (!audioFile || !fs.existsSync(audioFile)) {
                await client.query("ROLLBACK");

                return res.status(404).json({
                    success: false,
                    message: "Audio file not found."
                });
            }

            // ==================================================
            // CHECK ACTIVE SUBSCRIPTION
            //
            // PostgreSQL is the source of truth.
            // ==================================================

            const subscriptionResult = await client.query(
                `
                SELECT
                    id,
                    expires_at
                FROM subscriptions
                WHERE
                    user_id = $1
                    AND LOWER(status) = 'active'
                    AND starts_at <= CURRENT_TIMESTAMP
                    AND expires_at > CURRENT_TIMESTAMP
                ORDER BY expires_at DESC
                LIMIT 1
                `,
                [userId]
            );

            if (!subscriptionResult.rows.length) {
                await client.query("ROLLBACK");

                return res.status(403).json({
                    success: false,
                    code: "SUBSCRIPTION_REQUIRED",
                    message:
                        "An active Cave Tunes subscription is required to download music."
                });
            }

            // ==================================================
            // CHECK EXISTING DOWNLOAD
            // ==================================================

            const existingResult = await client.query(
                `
                SELECT id
                FROM downloads
                WHERE
                    track_id = $1
                    AND user_id = $2
                LIMIT 1
                `,
                [trackId, userId]
            );

            let downloadCount = Number(song.downloads) || 0;

            let counted = false;
            let alreadyDownloaded = false;

            // ==================================================
            // RECORD FIRST DOWNLOAD ONLY
            // ==================================================

            if (existingResult.rows.length === 0) {
                await client.query(
                    `
                    INSERT INTO downloads (
                        track_id,
                        user_id
                    )
                    VALUES ($1, $2)
                    `,
                    [trackId, userId]
                );

                const updateResult = await client.query(
                    `
                    UPDATE songs
                    SET
                        downloads = COALESCE(downloads, 0) + 1,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = $1
                    RETURNING downloads
                    `,
                    [trackId]
                );

                downloadCount = Number(
                    updateResult.rows[0].downloads
                );

                counted = true;
            }
            else {
                alreadyDownloaded = true;
            }

            // ==================================================
            // COMMIT DOWNLOAD RECORD
            // ==================================================

            await client.query("COMMIT");

            // ==================================================
            // SEND ACTUAL MP3 FILE
            // ==================================================

            const safeTitle = String(
                song.title || "Cave Tunes Song"
            )
                .replace(/[<>:"/\\|?*\x00-\x1F]/g, "")
                .trim();

            const downloadFilename = `${safeTitle || "Cave Tunes Song"}.mp3`;

            res.setHeader(
                "Content-Type",
                "audio/mpeg"
            );

            res.setHeader(
                "Content-Disposition",
                `attachment; filename="${downloadFilename.replace(/"/g, "")}"`
            );

            res.setHeader(
                "X-Downloads-Count",
                String(downloadCount)
            );

            res.setHeader(
                "X-Download-Counted",
                String(counted)
            );

            res.setHeader(
                "Cache-Control",
                "private, no-store"
            );

            return res.sendFile(
                audioFile,
                (error) => {
                    if (error) {
                        console.error(
                            "PROTECTED DOWNLOAD FILE ERROR:",
                            error
                        );

                        if (!res.headersSent) {
                            res.status(500).json({
                                success: false,
                                message: "Unable to send audio file."
                            });
                        }
                    }
                }
            );
        }
        catch (error) {
            try {
                await client.query("ROLLBACK");
            }
            catch (rollbackError) {
                console.error(
                    "DOWNLOAD ROLLBACK ERROR:",
                    rollbackError
                );
            }

            console.error(
                "PROTECTED DOWNLOAD ERROR:",
                error
            );

            if (!res.headersSent) {
                return res.status(500).json({
                    success: false,
                    message: "Unable to download song."
                });
            }
        }
        finally {
            client.release();
        }
    }
);


// ======================================================
// REPLACE COVER IMAGE
// ONLY OWNER CAN UPDATE
// ======================================================

router.put(
    "/:id/cover",
    authMiddleware,
    upload.single("cover"),
    async (req,res)=>{

        try{


            const songId =
            getSongId(req.params.id);



            if(!songId){

                return res.status(400).json({

                    success:false,

                    message:"Invalid song id"

                });

            }



            if(!req.file){

                return res.status(400).json({

                    success:false,

                    message:"No cover image uploaded"

                });

            }



            const coverUrl =
            `/uploads/covers/${req.file.filename}`;



            const result =
            await pool.query(

                `
                UPDATE songs

                SET

                    cover_url = $1,

                    updated_at = NOW()

                WHERE

                    id = $2

                AND

                    user_id = $3

                RETURNING *

                `,

                [

                    coverUrl,

                    songId,

                    req.userId

                ]

            );




            if(!result.rows.length){


                return res.status(404).json({

                    success:false,

                    message:
                    "Song not found or permission denied"

                });

            }




            res.json({

                success:true,

                message:
                "Cover updated successfully",

                song:
                result.rows[0]

            });



        }

        catch(error){


            console.error(
                "REPLACE COVER ERROR:",
                error
            );


            res.status(500).json({

                success:false,

                message:
                "Unable to replace cover"

            });


        }


    }

);

// ======================================================
// DELETE SONG
// ONLY OWNER CAN DELETE
// ======================================================

router.delete(
    "/:id",
    authMiddleware,
    async (req, res) => {

        try {

            const songId =
                getSongId(
                    req.params.id
                );


            if (!songId) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid song ID."

                });

            }


            // Find only if owned by current user
            const songResult =
                await pool.query(
                    `
                    SELECT *

                    FROM songs

                    WHERE

                        id = $1

                        AND

                        user_id = $2

                    LIMIT 1
                    `,
                    [
                        songId,
                        req.userId
                    ]
                );


            if (
                !songResult.rows.length
            ) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Song not found or you do not have permission to delete it."

                });

            }


            const song =
                songResult.rows[0];


            // Delete DB record
            const deleteResult =
                await pool.query(
                    `
                    DELETE FROM songs

                    WHERE

                        id = $1

                        AND

                        user_id = $2

                    RETURNING *
                    `,
                    [
                        songId,
                        req.userId
                    ]
                );


            if (
                !deleteResult.rows.length
            ) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Song could not be deleted."

                });

            }


            // Delete physical files
            await deleteSongFiles(
                song
            );


            return res.json({

                success: true,

                message:
                    "Song permanently deleted.",

                song:
                    deleteResult.rows[0]

            });

        }

        catch (error) {

            console.error(
                "DELETE SONG ERROR:",
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    "Unable to permanently delete song."

            });

        }

    }
);


// ======================================================
// EXPORT
// ======================================================

module.exports = router;