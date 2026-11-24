
const db = require("../config/database");
const fs = require("fs");
const path = require("path");

const IMAGE_UPLOAD_DIRECTORY = path.join(
    __dirname,
    "..",
    "uploads",
    "ad-images"
);

// ======================================================
// FORMAT IMAGE ADVERTISEMENT RESPONSE
// ======================================================

function formatImageAd(ad) {
    if (!ad) return null;

    return {
        ...ad,
        image_url: `/uploads/ad-images/${ad.image_filename}`
    };
}

// ======================================================
// GET ALL IMAGE ADVERTISEMENTS (ADMIN)
// ======================================================

exports.getAllImageAds = async () => {
    const result = await db.query(`
        SELECT *
        FROM image_ads
        ORDER BY priority ASC, created_at DESC
    `);

    return result.rows.map(formatImageAd);
};

// ======================================================
// GET ACTIVE IMAGE ADVERTISEMENTS (PUBLIC)
// ======================================================

exports.getActiveImageAds = async () => {
    const result = await db.query(`
        SELECT
            id,
            title,
            description,
            image_filename,
            click_url,
            alt_text,
            priority,
            created_at
        FROM image_ads
        WHERE is_active = TRUE
        ORDER BY priority ASC, created_at DESC
    `);

    return result.rows.map(formatImageAd);
};

// ======================================================
// GET IMAGE ADVERTISEMENT BY ID
// ======================================================

exports.getImageAdById = async (id) => {
    const result = await db.query(
        `SELECT * FROM image_ads WHERE id = $1`,
        [id]
    );

    return formatImageAd(result.rows[0]);
};

// ======================================================
// CREATE IMAGE ADVERTISEMENT
// ======================================================

exports.createImageAd = async (data) => {
    const {
        title,
        description,
        image_filename,
        image_path,
        image_mime_type,
        image_size,
        click_url,
        alt_text,
        priority,
        created_by
    } = data;

    const result = await db.query(
        `
        INSERT INTO image_ads (
            title,
            description,
            image_filename,
            image_path,
            image_mime_type,
            image_size,
            click_url,
            alt_text,
            is_active,
            priority,
            created_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, FALSE, $9, $10)
        RETURNING *
        `,
        [
            title,
            description || null,
            image_filename,
            image_path,
            image_mime_type,
            image_size,
            click_url || null,
            alt_text || null,
            priority || 1,
            created_by || null
        ]
    );

    return formatImageAd(result.rows[0]);
};

// ======================================================
// UPDATE IMAGE ADVERTISEMENT DETAILS
// ======================================================

exports.updateImageAd = async (id, data) => {
    const {
        title,
        description,
        click_url,
        alt_text,
        priority
    } = data;

    const result = await db.query(
        `
        UPDATE image_ads
        SET
            title = $1,
            description = $2,
            click_url = $3,
            alt_text = $4,
            priority = $5,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $6
        RETURNING *
        `,
        [
            title,
            description || null,
            click_url || null,
            alt_text || null,
            priority,
            id
        ]
    );

    return formatImageAd(result.rows[0]);
};

// ======================================================
// ACTIVATE / DEACTIVATE IMAGE ADVERTISEMENT
// ======================================================

exports.setImageAdStatus = async (id, is_active) => {
    const result = await db.query(
        `
        UPDATE image_ads
        SET
            is_active = $1,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
        RETURNING *
        `,
        [is_active, id]
    );

    return formatImageAd(result.rows[0]);
};

// ======================================================
// DELETE IMAGE ADVERTISEMENT
// ======================================================

exports.deleteImageAd = async (id) => {
    const result = await db.query(
        `
        DELETE FROM image_ads
        WHERE id = $1
        RETURNING *
        `,
        [id]
    );

    const ad = result.rows[0];

    if (!ad) {
        return null;
    }

    // Delete the physical image file
    if (ad.image_path) {
        const resolvedPath = path.resolve(ad.image_path);
        const expectedDirectory = path.resolve(IMAGE_UPLOAD_DIRECTORY);

        if (
            path.dirname(resolvedPath) === expectedDirectory &&
            fs.existsSync(resolvedPath)
        ) {
            fs.unlinkSync(resolvedPath);
        }
    }

    return ad;
};
