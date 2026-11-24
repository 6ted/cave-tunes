// ======================================================
// CAVE TUNES
// ADVERTISEMENT SERVICE
// services/adService.js
// ======================================================

const db = require("../config/database");
const fs = require("fs");

// ======================================================
// GET ALL ADVERTISEMENTS
// ======================================================

const getAllAds = async () => {
    const result = await db.query(`
        SELECT
            id,
            title,
            description,
            file_name,
            mime_type,
            duration_seconds,
            is_active,
            priority,
            created_by,
            created_at,
            updated_at
        FROM audio_ads
        ORDER BY created_at DESC
    `);

    return result.rows;
};

// ======================================================
// GET ACTIVE ADVERTISEMENTS
// ======================================================

const getActiveAds = async () => {
    const result = await db.query(`
        SELECT
            id,
            title,
            description,
            mime_type,
            duration_seconds,
            priority
        FROM audio_ads
        WHERE is_active = TRUE
        ORDER BY priority ASC, RANDOM()
    `);

    return result.rows;
};

// ======================================================
// GET ONE ADVERTISEMENT
// ======================================================

const getAdById = async (id) => {
    const result = await db.query(
        `SELECT * FROM audio_ads WHERE id = $1 LIMIT 1`,
        [id]
    );

    return result.rows[0] || null;
};

// ======================================================
// CREATE ADVERTISEMENT
// ======================================================

const createAd = async (data) => {
    const {
        title,
        description,
        fileName,
        filePath,
        mimeType,
        duration,
        createdBy
    } = data;

    const result = await db.query(
        `
        INSERT INTO audio_ads (
            title,
            description,
            file_name,
            file_path,
            mime_type,
            duration_seconds,
            is_active,
            priority,
            created_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, FALSE, 1, $7)
        RETURNING *
        `,
        [
            title,
            description || null,
            fileName,
            filePath,
            mimeType,
            duration,
            createdBy
        ]
    );

    return result.rows[0];
};

// ======================================================
// UPDATE ADVERTISEMENT
// ======================================================

const updateAd = async (id, data) => {
    const { title, description, priority } = data;

    const result = await db.query(
        `
        UPDATE audio_ads
        SET
            title = COALESCE($2, title),
            description = COALESCE($3, description),
            priority = COALESCE($4, priority),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING *
        `,
        [id, title, description, priority]
    );

    return result.rows[0] || null;
};

// ======================================================
// ACTIVATE / DEACTIVATE ADVERTISEMENT
// ======================================================

const setAdStatus = async (id, isActive) => {
    const result = await db.query(
        `
        UPDATE audio_ads
        SET
            is_active = $2,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING *
        `,
        [id, isActive]
    );

    return result.rows[0] || null;
};

// ======================================================
// DELETE ADVERTISEMENT
// ======================================================

const deleteAd = async (id) => {
    const ad = await getAdById(id);

    if (!ad) {
        return null;
    }

    await db.query(
        `DELETE FROM audio_ads WHERE id = $1`,
        [id]
    );

    if (ad.file_path && fs.existsSync(ad.file_path)) {
        fs.unlinkSync(ad.file_path);
    }

    return ad;
};

module.exports = {
    getAllAds,
    getActiveAds,
    getAdById,
    createAd,
    updateAd,
    setAdStatus,
    deleteAd
};