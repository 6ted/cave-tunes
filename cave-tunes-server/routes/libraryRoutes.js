const express = require("express");
const router = express.Router();

const db = require("../config/database");
const authMiddleware = require("../middleware/authMiddleware");

// ============================================
// GET RECENTLY PLAYED SONGS
// GET /api/library/recently-played
// ============================================

router.get("/recently-played", authMiddleware, async (req, res) => {
try {
const userId = req.userId;


    const result = await db.query(
        `SELECT
            s.*,
            lh.last_played_at
         FROM listening_history lh
         JOIN songs s ON s.id = lh.song_id
         WHERE lh.user_id = $1
         ORDER BY lh.last_played_at DESC
         LIMIT 50`,
        [userId]
    );

    res.json({
        success: true,
        songs: result.rows
    });
} catch (error) {
    console.error("Recently played error:", error);

    res.status(500).json({
        success: false,
        message: "Could not load recently played songs."
    });
}


});

// ============================================
// RECORD A SONG IN LISTENING HISTORY
// POST /api/library/history/:songId
// ============================================

router.post("/history/:songId", authMiddleware, async (req, res) => {
try {
const userId = req.userId;
const songId = Number(req.params.songId);


    if (!Number.isInteger(songId) || songId <= 0) {
        return res.status(400).json({
            success: false,
            message: "Invalid song ID."
        });
    }

    const song = await db.query(
        `SELECT id FROM songs WHERE id = $1`,
        [songId]
    );

    if (song.rows.length === 0) {
        return res.status(404).json({
            success: false,
            message: "Song not found."
        });
    }

    await db.query(
        `INSERT INTO listening_history
            (user_id, song_id, last_played_at)
         VALUES ($1, $2, CURRENT_TIMESTAMP)
         ON CONFLICT (user_id, song_id)
         DO UPDATE SET last_played_at = CURRENT_TIMESTAMP`,
        [userId, songId]
    );

    res.json({
        success: true,
        message: "Listening history updated."
    });
} catch (error) {
    console.error("Listening history error:", error);

    res.status(500).json({
        success: false,
        message: "Could not update listening history."
    });
}


});

// ============================================
// GET MY PLAYLISTS
// GET /api/library/playlists
// ============================================

router.get("/playlists", authMiddleware, async (req, res) => {
try {
const userId = req.userId;


    const result = await db.query(
        `SELECT
            p.id,
            p.name,
            p.created_at,
            COUNT(ps.song_id)::INTEGER AS song_count
         FROM playlists p
         LEFT JOIN playlist_songs ps
            ON ps.playlist_id = p.id
         WHERE p.user_id = $1
         GROUP BY p.id, p.name, p.created_at
         ORDER BY p.created_at DESC`,
        [userId]
    );

    res.json({
        success: true,
        playlists: result.rows
    });
} catch (error) {
    console.error("Load playlists error:", error);

    res.status(500).json({
        success: false,
        message: "Could not load your playlists."
    });
}


});

// ============================================
// CREATE A PLAYLIST
// POST /api/library/playlists
// ============================================

router.post("/playlists", authMiddleware, async (req, res) => {
try {
const userId = req.userId;
const name = typeof req.body.name === "string"
? req.body.name.trim()
: "";


    if (!name) {
        return res.status(400).json({
            success: false,
            message: "Please enter a playlist name."
        });
    }

    if (name.length > 150) {
        return res.status(400).json({
            success: false,
            message: "Playlist name must be 150 characters or fewer."
        });
    }

    const result = await db.query(
        `INSERT INTO playlists (user_id, name)
         VALUES ($1, $2)
         RETURNING id, user_id, name, created_at`,
        [userId, name]
    );

    res.status(201).json({
        success: true,
        message: "Playlist created successfully.",
        playlist: result.rows[0]
    });
} catch (error) {
    console.error("Create playlist error:", error);

    res.status(500).json({
        success: false,
        message: "Could not create playlist."
    });
}


});

// ============================================
// GET SONGS IN A PLAYLIST
// GET /api/library/playlists/:playlistId/songs
// ============================================

router.get("/playlists/:playlistId/songs", authMiddleware, async (req, res) => {
try {
const userId = req.userId;
const playlistId = Number(req.params.playlistId);


    if (!Number.isInteger(playlistId) || playlistId <= 0) {
        return res.status(400).json({
            success: false,
            message: "Invalid playlist ID."
        });
    }

    const result = await db.query(
        `SELECT
            s.*,
            ps.position,
            ps.added_at
         FROM playlists p
         JOIN playlist_songs ps ON ps.playlist_id = p.id
         JOIN songs s ON s.id = ps.song_id
         WHERE p.id = $1
           AND p.user_id = $2
         ORDER BY ps.position ASC, ps.added_at ASC`,
        [playlistId, userId]
    );

    res.json({
        success: true,
        songs: result.rows
    });
} catch (error) {
    console.error("Playlist songs error:", error);

    res.status(500).json({
        success: false,
        message: "Could not load playlist songs."
    });
}


});

// ============================================
// ADD SONG TO A PLAYLIST
// POST /api/library/playlists/:playlistId/songs
// Body: { "songId": 123 }
// ============================================

router.post("/playlists/:playlistId/songs", authMiddleware, async (req, res) => {
try {
const userId = req.userId;
const playlistId = Number(req.params.playlistId);
const songId = Number(req.body.songId);


    if (
        !Number.isInteger(playlistId) ||
        playlistId <= 0 ||
        !Number.isInteger(songId) ||
        songId <= 0
    ) {
        return res.status(400).json({
            success: false,
            message: "Invalid playlist ID or song ID."
        });
    }

    const playlist = await db.query(
        `SELECT id FROM playlists
         WHERE id = $1 AND user_id = $2`,
        [playlistId, userId]
    );

    if (playlist.rows.length === 0) {
        return res.status(404).json({
            success: false,
            message: "Playlist not found."
        });
    }

    const song = await db.query(
        `SELECT id FROM songs WHERE id = $1`,
        [songId]
    );

    if (song.rows.length === 0) {
        return res.status(404).json({
            success: false,
            message: "Song not found."
        });
    }

    await db.query(
        `INSERT INTO playlist_songs
            (playlist_id, song_id, position)
         VALUES (
            $1,
            $2,
            COALESCE(
                (SELECT MAX(position) + 1
                 FROM playlist_songs
                 WHERE playlist_id = $1),
                0
            )
         )
         ON CONFLICT (playlist_id, song_id) DO NOTHING`,
        [playlistId, songId]
    );

    res.json({
        success: true,
        message: "Song added to playlist."
    });
} catch (error) {
    console.error("Add playlist song error:", error);

    res.status(500).json({
        success: false,
        message: "Could not add song to playlist."
    });
}


});

// ============================================
// REMOVE SONG FROM A PLAYLIST
// DELETE /api/library/playlists/:playlistId/songs/:songId
// ============================================

router.delete(
"/playlists/:playlistId/songs/:songId",
authMiddleware,
async (req, res) => {
try {
const userId = req.userId;
const playlistId = Number(req.params.playlistId);
const songId = Number(req.params.songId);


        if (
            !Number.isInteger(playlistId) ||
            playlistId <= 0 ||
            !Number.isInteger(songId) ||
            songId <= 0
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid playlist ID or song ID."
            });
        }

        const result = await db.query(
            `DELETE FROM playlist_songs ps
             USING playlists p
             WHERE ps.playlist_id = p.id
               AND p.id = $1
               AND ps.song_id = $2
               AND p.user_id = $3
             RETURNING ps.id`,
            [playlistId, songId, userId]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({
                success: false,
                message: "Song or playlist not found."
            });
        }

        res.json({
            success: true,
            message: "Song removed from playlist."
        });
    } catch (error) {
        console.error("Remove playlist song error:", error);

        res.status(500).json({
            success: false,
            message: "Could not remove song from playlist."
        });
    }
}


);

// ============================================
// DELETE MY PLAYLIST
// DELETE /api/library/playlists/:playlistId
// ============================================

router.delete("/playlists/:playlistId", authMiddleware, async (req, res) => {
try {
const userId = req.userId;
const playlistId = Number(req.params.playlistId);

    if (!Number.isInteger(playlistId) || playlistId <= 0) {
        return res.status(400).json({
            success: false,
            message: "Invalid playlist ID."
        });
    }

    const result = await db.query(
        `DELETE FROM playlists
         WHERE id = $1 AND user_id = $2
         RETURNING id`,
        [playlistId, userId]
    );

    if (result.rowCount === 0) {
        return res.status(404).json({
            success: false,
            message: "Playlist not found."
        });
    }

    res.json({
        success: true,
        message: "Playlist deleted successfully."
    });
} catch (error) {
    console.error("Delete playlist error:", error);

    res.status(500).json({
        success: false,
        message: "Could not delete playlist."
    });
}


});

// ============================================
// GET MY LIKED SONGS
// GET /api/library/liked-songs
// ============================================

router.get("/liked-songs", authMiddleware, async (req, res) => {
try {
const userId = req.userId;


    const result = await db.query(
        `SELECT
            s.*,
            sl.created_at AS liked_at
         FROM song_likes sl
         JOIN songs s ON s.id = sl.song_id
         WHERE sl.user_id = $1
         ORDER BY sl.created_at DESC`,
        [userId]
    );

    res.json({
        success: true,
        songs: result.rows
    });
} catch (error) {
    console.error("Liked songs error:", error);

    res.status(500).json({
        success: false,
        message: "Could not load liked songs."
    });
}


});

module.exports = router;
