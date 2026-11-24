// ======================================================
// CAVE TUNES
// ROYALTY SPLIT SERVICE
//
// Supports:
// - Per-song royalty splits
// - Multiple royalty split versions
// - Registered Cave Tunes contributors
// - Unregistered contributors
// - Song-owner ownership protection
// - Locked royalty versions
// - Transaction-safe updates
// ======================================================

const pool = require("../config/database");

// ======================================================
// ALLOWED ROLES
// ======================================================

const ALLOWED_ROLES = [
    "artist",
    "featured_artist",
    "songwriter",
    "composer",
    "producer",
    "mixing_engineer",
    "mastering_engineer",
    "master_owner",
    "publisher",
    "label",
    "other"
];

// ======================================================
// NORMALIZE SPLITS
//
// Supports:
// - One contributor with one role
// - One registered user with multiple roles
//
// Example:
//
// {
//     user_id: 6,
//     participant_name: "Zander Africa",
//     role: "producer, mixing_engineer",
//     percentage: 20
// }
//
// is stored as one royalty participant with two roles.
// ======================================================

function normalizeRoyaltySplits(splits) {

    if (!Array.isArray(splits)) {
        throw new Error(
            "Royalty splits must be an array."
        );
    }

    return splits.map((split, index) => {

        if (!split || typeof split !== "object") {
            throw new Error(
                `Invalid royalty contributor #${index + 1}.`
            );
        }

        const participantName = String(
            split.participant_name ||
            split.name ||
            ""
        ).trim();

        // --------------------------------------------------
        // SUPPORT MULTIPLE ROLES
        // --------------------------------------------------

        const roles = String(
            split.role || ""
        )
            .split(",")
            .map(role =>
                role
                    .trim()
                    .toLowerCase()
            )
            .filter(Boolean);

        const percentage = Number(
            split.percentage
        );

        const userId =
            split.user_id === null ||
            split.user_id === undefined ||
            split.user_id === ""
                ? null
                : Number(split.user_id);

        // --------------------------------------------------
        // NAME
        // --------------------------------------------------

        if (!participantName) {
            throw new Error(
                `Royalty contributor #${index + 1} needs a name.`
            );
        }

        // --------------------------------------------------
        // ROLE
        // --------------------------------------------------

        if (roles.length === 0) {
            throw new Error(
                `Royalty contributor ${participantName} needs at least one role.`
            );
        }

        for (const role of roles) {

            if (!ALLOWED_ROLES.includes(role)) {

                throw new Error(
                    `Invalid royalty role "${role}" for ${participantName}.`
                );
            }
        }

        // --------------------------------------------------
        // REMOVE DUPLICATE ROLES
        // --------------------------------------------------

        const uniqueRoles = [
            ...new Set(roles)
        ];

        // --------------------------------------------------
        // PERCENTAGE
        // --------------------------------------------------

        if (
            !Number.isFinite(percentage) ||
            percentage <= 0 ||
            percentage > 100
        ) {
            throw new Error(
                `Invalid royalty percentage for ${participantName}.`
            );
        }

        // --------------------------------------------------
        // USER ID
        // --------------------------------------------------

        if (
            userId !== null &&
            (
                !Number.isInteger(userId) ||
                userId <= 0
            )
        ) {
            throw new Error(
                `Invalid Cave Tunes user for ${participantName}.`
            );
        }

        return {
            user_id: userId,
            participant_name: participantName,
            role: uniqueRoles.join(", "),
            percentage
        };
    });
}


// ======================================================
// MERGE REGISTERED USER SPLITS
//
// One Cave Tunes user may have multiple roles,
// but must have one accounting row.
//
// Example:
//
// Teddy artist     30%
// Teddy producer   20%
// Teddy composer   10%
//
// becomes:
//
// Teddy artist, producer, composer 60%
// ======================================================

function mergeRoyaltySplits(splits) {

    const merged = new Map();

    for (const split of splits) {

        // --------------------------------------------------
        // Registered Cave Tunes user
        // --------------------------------------------------

        if (split.user_id !== null) {

            const key = `user:${split.user_id}`;

            if (!merged.has(key)) {

                merged.set(key, {
                    user_id: split.user_id,
                    participant_name: split.participant_name,
                    role: split.role,
                    percentage: Number(split.percentage)
                });

            } else {

                const existing =
                    merged.get(key);

                existing.percentage +=
                    Number(split.percentage);

                const roles = [
                    existing.role,
                    split.role
                ]
                    .filter(Boolean)
                    .flatMap(role =>
                        String(role)
                            .split(",")
                            .map(value => value.trim())
                    );

                existing.role =
                    [...new Set(roles)]
                        .join(", ");

                if (
                    !existing.participant_name &&
                    split.participant_name
                ) {
                    existing.participant_name =
                        split.participant_name;
                }
            }

            continue;
        }

        // --------------------------------------------------
        // Unregistered contributor
        //
        // Keep different contributors separate.
        // --------------------------------------------------

        const key =
            `unregistered:${split.participant_name
                .trim()
                .toLowerCase()}:${split.role
                .trim()
                .toLowerCase()}`;

        if (!merged.has(key)) {

            merged.set(key, {
                ...split,
                percentage:
                    Number(split.percentage)
            });

        } else {

            const existing =
                merged.get(key);

            existing.percentage +=
                Number(split.percentage);
        }
    }

    return Array.from(
        merged.values()
    ).map(split => ({
        ...split,
        percentage:
            Math.round(
                Number(split.percentage) * 10000
            ) / 10000
    }));
}

// ======================================================
// VALIDATE TOTAL
// ======================================================

function validateRoyaltySplitTotal(splits) {

    const total = splits.reduce(
        (sum, split) =>
            sum + Number(split.percentage),
        0
    );

    const roundedTotal =
        Math.round(total * 10000) / 10000;

    if (roundedTotal !== 100) {
        throw new Error(
            `Royalty split must equal 100%. Current total: ${roundedTotal}%.`
        );
    }

    return roundedTotal;
}

// ======================================================
// VERIFY USERS
//
// Registered Cave Tunes contributors must actually
// exist in the users table.
//
// Contributors without user_id are allowed.
// ======================================================

async function verifyRoyaltyUsers(
    client,
    splits
) {

    const userIds = [
        ...new Set(
            splits
                .map(split => split.user_id)
                .filter(
                    userId =>
                        userId !== null &&
                        userId !== undefined
                )
        )
    ];

    if (userIds.length === 0) {
        return;
    }

    const result =
        await client.query(
            `
            SELECT id
            FROM users
            WHERE id = ANY($1::bigint[])
            `,
            [userIds]
        );

    const existingIds =
        new Set(
            result.rows.map(
                row => Number(row.id)
            )
        );

    for (const userId of userIds) {

        if (!existingIds.has(userId)) {

            throw new Error(
                `Cave Tunes user ${userId} does not exist.`
            );
        }
    }
}

// ======================================================
// GET SONG + VERIFY OWNER
// ======================================================

async function getOwnedSong(
    client,
    songId,
    ownerId,
    lockRow = false
) {

    const query = `
        SELECT
            id,
            user_id,
            title,
            artist_name
        FROM songs
        WHERE id = $1
        ${lockRow ? "FOR UPDATE" : ""}
    `;

    const result =
        await client.query(
            query,
            [songId]
        );

    if (result.rows.length === 0) {
        throw new Error(
            "Song not found."
        );
    }

    const song =
        result.rows[0];

    if (
        Number(song.user_id) !==
        Number(ownerId)
    ) {
        throw new Error(
            "You do not own this song."
        );
    }

    return song;
}

// ======================================================
// GET LATEST ROYALTY VERSION
// ======================================================

async function getLatestRoyaltyVersion(
    client,
    songId,
    lockRow = false
) {

    const query = `
        SELECT
            id,
            song_id,
            version,
            total_percentage,
            locked,
            locked_at,
            created_at
        FROM song_royalty_split_versions
        WHERE song_id = $1
        ORDER BY version DESC
        LIMIT 1
        ${lockRow ? "FOR UPDATE" : ""}
    `;

    const result =
        await client.query(
            query,
            [songId]
        );

    return result.rows[0] || null;
}

// ======================================================
// CREATE INITIAL SPLIT
//
// Used automatically during song upload.
//
// Creates version 1.
// ======================================================

async function createInitialRoyaltySplit(
    client,
    songId,
    ownerId,
    rawSplits
) {

    let splits =
    normalizeRoyaltySplits(
        rawSplits
    );

splits =
    mergeRoyaltySplits(
        splits
    );

validateRoyaltySplitTotal(
    splits
);
    await verifyRoyaltyUsers(
        client,
        splits
    );

    // --------------------------------------------------
    // Verify song ownership
    // --------------------------------------------------

    const song =
        await getOwnedSong(
            client,
            songId,
            ownerId,
            true
        );

    // --------------------------------------------------
    // Prevent duplicate initial version
    // --------------------------------------------------

    const existing =
        await getLatestRoyaltyVersion(
            client,
            songId,
            true
        );

    if (existing) {
        throw new Error(
            "Royalty split already exists for this song."
        );
    }

    // --------------------------------------------------
    // Create version 1
    // --------------------------------------------------

    const versionResult =
        await client.query(
            `
            INSERT INTO song_royalty_split_versions
            (
                song_id,
                version,
                total_percentage,
                locked
            )
            VALUES
            (
                $1,
                1,
                $2,
                FALSE
            )
            RETURNING *
            `,
            [
                song.id,
                100
            ]
        );

    const version =
        versionResult.rows[0];

    // --------------------------------------------------
    // Insert contributors
    // --------------------------------------------------

    for (const split of splits) {

        const registered =
            split.user_id !== null;

        await client.query(
            `
            INSERT INTO song_royalty_splits
            (
                song_id,
                user_id,
                participant_name,
                role,
                percentage,
                is_registered_user,
                is_unclaimed,
                split_version
            )
            VALUES
            (
                $1,
                $2,
                $3,
                $4,
                $5,
                $6,
                $7,
                $8
            )
            `,
            [
                songId,
                split.user_id,
                split.participant_name,
                split.role,
                split.percentage,
                registered,
                !registered,
                version.version
            ]
        );
    }

    return {
        version: version.version,
        total_percentage: 100,
        locked: version.locked,
        splits
    };
}

// ======================================================
// SAVE / UPDATE ROYALTY SPLIT
//
// Creates a NEW version.
//
// Old versions are NEVER deleted.
//
// POST:
// /api/royalties/songs/:songId/splits
// ======================================================

async function saveSongRoyaltySplit(
    songId,
    ownerId,
    rawSplits
) {

    const client =
        await pool.connect();

    try {

        // ------------------------------------------------
        // BEGIN TRANSACTION
        // ------------------------------------------------

        await client.query(
            "BEGIN"
        );

        // ------------------------------------------------
        // NORMALIZE
        // ------------------------------------------------
let splits =
    normalizeRoyaltySplits(
        rawSplits
    );

splits =
    mergeRoyaltySplits(
        splits
    );

const total =
    validateRoyaltySplitTotal(
        splits
    );

        // ------------------------------------------------
        // VERIFY USERS
        // ------------------------------------------------

        await verifyRoyaltyUsers(
            client,
            splits
        );

        // ------------------------------------------------
        // VERIFY SONG OWNER
        //
        // FOR UPDATE prevents another royalty update
        // from modifying the same song simultaneously.
        // ------------------------------------------------

        const song =
            await getOwnedSong(
                client,
                songId,
                ownerId,
                true
            );

        // ------------------------------------------------
        // GET CURRENT VERSION
        // ------------------------------------------------

        const currentVersion =
            await getLatestRoyaltyVersion(
                client,
                songId,
                true
            );

        // ------------------------------------------------
        // IF THERE IS A VERSION AND IT IS LOCKED
        // ------------------------------------------------

        if (
            currentVersion &&
            currentVersion.locked
        ) {

            throw new Error(
                `Royalty split version ${currentVersion.version} is locked and cannot be changed.`
            );
        }

        // ------------------------------------------------
        // DETERMINE NEW VERSION NUMBER
        // ------------------------------------------------

        const newVersionNumber =
            currentVersion
                ? Number(currentVersion.version) + 1
                : 1;

        // ------------------------------------------------
        // CREATE NEW VERSION
        // ------------------------------------------------

        const versionResult =
            await client.query(
                `
                INSERT INTO song_royalty_split_versions
                (
                    song_id,
                    version,
                    total_percentage,
                    locked
                )
                VALUES
                (
                    $1,
                    $2,
                    $3,
                    FALSE
                )
                RETURNING *
                `,
                [
                    songId,
                    newVersionNumber,
                    total
                ]
            );

        const version =
            versionResult.rows[0];

        // ------------------------------------------------
        // INSERT NEW CONTRIBUTORS
        // ------------------------------------------------

        for (const split of splits) {

            const registered =
                split.user_id !== null;

            await client.query(
                `
                INSERT INTO song_royalty_splits
                (
                    song_id,
                    user_id,
                    participant_name,
                    role,
                    percentage,
                    is_registered_user,
                    is_unclaimed,
                    split_version
                )
                VALUES
                (
                    $1,
                    $2,
                    $3,
                    $4,
                    $5,
                    $6,
                    $7,
                    $8
                )
                `,
                [
                    songId,
                    split.user_id,
                    split.participant_name,
                    split.role,
                    split.percentage,
                    registered,
                    !registered,
                    newVersionNumber
                ]
            );
        }

        // ------------------------------------------------
        // COMMIT
        // ------------------------------------------------

        await client.query(
            "COMMIT"
        );

        // ------------------------------------------------
        // RETURN RESULT
        // ------------------------------------------------

        return {
            song: {
                id: song.id,
                title: song.title,
                artist_name: song.artist_name
            },

            version: newVersionNumber,

            total_percentage: total,

            locked: false,

            splits
        };

    } catch (error) {

        // ------------------------------------------------
        // ROLLBACK
        // ------------------------------------------------

        try {
            await client.query(
                "ROLLBACK"
            );
        } catch (rollbackError) {
            console.error(
                "ROYALTY ROLLBACK ERROR:",
                rollbackError
            );
        }

        throw error;

    } finally {

        client.release();
    }
}

// ======================================================
// LOCK CURRENT ROYALTY VERSION
//
// Useful when royalties have already been paid/generated.
//
// Once locked, a new royalty split cannot replace it.
// ======================================================

async function lockCurrentRoyaltySplit(
    songId,
    ownerId
) {

    const client =
        await pool.connect();

    try {

        await client.query(
            "BEGIN"
        );

        // ------------------------------------------------
        // VERIFY OWNER
        // ------------------------------------------------

        const song =
            await getOwnedSong(
                client,
                songId,
                ownerId,
                true
            );

        // ------------------------------------------------
        // GET CURRENT VERSION
        // ------------------------------------------------

        const version =
            await getLatestRoyaltyVersion(
                client,
                songId,
                true
            );

        if (!version) {

            throw new Error(
                "No royalty split exists for this song."
            );
        }

        // ------------------------------------------------
        // ALREADY LOCKED
        // ------------------------------------------------

        if (version.locked) {

            await client.query(
                "COMMIT"
            );

            return {
                songId: song.id,
                version: version.version,
                locked: true,
                alreadyLocked: true
            };
        }

        // ------------------------------------------------
        // LOCK VERSION
        // ------------------------------------------------

        const result =
            await client.query(
                `
                UPDATE song_royalty_split_versions
                SET
                    locked = TRUE,
                    locked_at = NOW()
                WHERE id = $1
                RETURNING *
                `,
                [version.id]
            );

        await client.query(
            "COMMIT"
        );

        return {
            songId: song.id,
            version: result.rows[0].version,
            locked: true,
            lockedAt: result.rows[0].locked_at
        };

    } catch (error) {

        try {
            await client.query(
                "ROLLBACK"
            );
        } catch (rollbackError) {
            console.error(
                "ROYALTY LOCK ROLLBACK ERROR:",
                rollbackError
            );
        }

        throw error;

    } finally {

        client.release();
    }
}

// ======================================================
// GET CURRENT ROYALTY SPLIT
//
// This is useful internally as well as from controllers.
// ======================================================

async function getCurrentRoyaltySplit(
    songId,
    ownerId
) {

    const client =
        await pool.connect();

    try {

        const song =
            await getOwnedSong(
                client,
                songId,
                ownerId
            );

        const version =
            await getLatestRoyaltyVersion(
                client,
                songId
            );

        if (!version) {

            return {
                song: {
                    id: song.id,
                    title: song.title,
                    artist_name: song.artist_name
                },
                version: null,
                splits: []
            };
        }

        const splitResult =
            await client.query(
                `
                SELECT
                    id,
                    song_id,
                    user_id,
                    participant_name,
                    role,
                    percentage,
                    is_registered_user,
                    is_unclaimed,
                    split_version,
                    created_at,
                    updated_at
                FROM song_royalty_splits
                WHERE song_id = $1
                AND split_version = $2
                ORDER BY id ASC
                `,
                [
                    songId,
                    version.version
                ]
            );

        return {
            song: {
                id: song.id,
                title: song.title,
                artist_name: song.artist_name
            },

            version,

            splits:
                splitResult.rows
        };

    } finally {

        client.release();
    }
}

// ======================================================
// GET ALL ROYALTY VERSIONS
// ======================================================

async function getRoyaltySplitVersions(
    songId,
    ownerId
) {

    const client =
        await pool.connect();

    try {

        await getOwnedSong(
            client,
            songId,
            ownerId
        );

        const versionsResult =
            await client.query(
                `
                SELECT
                    id,
                    song_id,
                    version,
                    total_percentage,
                    locked,
                    locked_at,
                    created_at
                FROM song_royalty_split_versions
                WHERE song_id = $1
                ORDER BY version DESC
                `,
                [songId]
            );

        return versionsResult.rows;

    } finally {

        client.release();
    }
}

// ======================================================
// EXPORTS
// ======================================================

module.exports = {

    ALLOWED_ROLES,

    normalizeRoyaltySplits,

    mergeRoyaltySplits,

    validateRoyaltySplitTotal,

    verifyRoyaltyUsers,

    createInitialRoyaltySplit,

    saveSongRoyaltySplit,

    lockCurrentRoyaltySplit,

    getCurrentRoyaltySplit,

    getRoyaltySplitVersions
};