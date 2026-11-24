// ======================================================
// CAVE TUNES
// MULTI TRACK UPLOAD CONTROLLER
// ======================================================

const pool =
    require("../config/database");

const {
    analyzeAudio,
    embedMetadata
} = require("../services/audioProcessor");

const {
    convertToMp3
} = require("../services/audioConverter");

const {
    buildSongMetadata
} = require("../services/metadataBuilder");

const {
    deleteFiles
} = require("../services/fileManager");

const {
    createNotification
} = require("../services/notificationService");

const {
    createInitialRoyaltySplit
} = require("../services/royaltyService");


// ======================================================
// CONSTANTS
// ======================================================

const ROYALTY_TOTAL = 100;


// ======================================================
// HELPER
// Parse JSON safely
// ======================================================

function parseJsonField(value, fieldName) {

    if (
        value === undefined ||
        value === null ||
        value === ""
    ) {
        return null;
    }

    if (typeof value === "object") {
        return value;
    }

    try {

        return JSON.parse(value);

    } catch (error) {

        throw new Error(
            `Invalid ${fieldName} data.`
        );
    }
}

// ======================================================
// HELPER
// Normalize featured artists
// ======================================================

function normalizeFeaturedArtists(value) {
    const parsed =
        typeof value === "string"
            ? parseJsonField(value, "featured_artists")
            : value;

    if (
        parsed === null ||
        parsed === undefined
    ) {
        return [];
    }

    if (!Array.isArray(parsed)) {
        throw new Error(
            "Featured artists must be an array."
        );
    }

    return [
        ...new Set(
            parsed
                .filter(name => typeof name === "string")
                .map(name => name.trim())
                .filter(Boolean)
        )
    ];
}

// ======================================================
// HELPER
// Parse boolean safely
// ======================================================

function parseBooleanField(value, defaultValue = false) {
    if (
        value === undefined ||
        value === null ||
        value === ""
    ) {
        return defaultValue;
    }

    if (typeof value === "boolean") {
        return value;
    }

    if (typeof value === "string") {
        const normalized = value
            .trim()
            .toLowerCase();

        if (
            normalized === "true" ||
            normalized === "1" ||
            normalized === "yes" ||
            normalized === "on"
        ) {
            return true;
        }

        if (
            normalized === "false" ||
            normalized === "0" ||
            normalized === "no" ||
            normalized === "off"
        ) {
            return false;
        }
    }

    return Boolean(value);
}



// ======================================================
// HELPER
// Convert percentage safely
// ======================================================

function normalizePercentage(value) {

    const percentage =
        Number(value);

    if (!Number.isFinite(percentage)) {

        throw new Error(
            "Royalty percentage must be a valid number."
        );
    }

    if (
        percentage < 0 ||
        percentage > 100
    ) {

        throw new Error(
            "Royalty percentage must be between 0 and 100."
        );
    }

    return percentage;
}


// ======================================================
// HELPER
// Normalize royalty participant
// ======================================================

function normalizeRoyaltyParticipant(
    participant,
    trackIndex,
    participantIndex
) {

    if (
        !participant ||
        typeof participant !== "object"
    ) {

        throw new Error(
            `Invalid royalty participant on track ${trackIndex + 1}.`
        );
    }


    const percentage =
        normalizePercentage(
            participant.percentage
        );


    const participantName =
        String(
            participant.participant_name ||
            participant.name ||
            participant.recipient_name ||
            ""
        ).trim();


    const role =
        String(
            participant.role ||
            "participant"
        ).trim();


    const userId =
        participant.user_id !== undefined &&
        participant.user_id !== null &&
        participant.user_id !== ""
            ? Number(participant.user_id)
            : null;


    if (
        userId !== null &&
        (
            !Number.isInteger(userId) ||
            userId <= 0
        )
    ) {

        throw new Error(
            `Invalid user_id for royalty participant ${participantIndex + 1} on track ${trackIndex + 1}.`
        );
    }


    // A participant must have either
    // a registered user ID or a named recipient.

    if (
        userId === null &&
        !participantName
    ) {

        throw new Error(
            `Royalty participant ${participantIndex + 1} on track ${trackIndex + 1} must have a user_id or participant_name.`
        );
    }


    return {

        user_id:
            userId,

        participant_name:
            participantName ||
            null,

        role,

        percentage

    };
}



// ======================================================
// HELPER
// Validate one track royalty split
// ======================================================

function validateTrackRoyaltySplit(
    splits,
    trackIndex,
    userId,
    artistName
) {

    // --------------------------------------------------
    // Missing split = owner gets 100%
    // --------------------------------------------------

    if (
        !Array.isArray(splits) ||
        splits.length === 0
    ) {
        return [
            {
                user_id: Number(userId),
                participant_name: String(
                    artistName || "Song Owner"
                ).trim(),
                role: "master_owner",
                percentage: 100
            }
        ];
    }

    // --------------------------------------------------
    // Normalize participants
    // --------------------------------------------------

    const normalized = splits.map(
        (participant, participantIndex) =>
            normalizeRoyaltyParticipant(
                participant,
                trackIndex,
                participantIndex
            )
    );

    // --------------------------------------------------
    // MERGE PARTICIPANTS
    //
    // A registered user may have multiple roles.
    //
    // Example:
    //
    // Teddy - artist    - 30%
    // Teddy - producer  - 20%
    // Teddy - composer  - 10%
    //
    // becomes:
    //
    // Teddy - artist, producer, composer - 60%
    //
    // This prevents the same registered user from
    // receiving multiple royalty rows/payments.
    // --------------------------------------------------

    const mergedParticipants = new Map();

    for (const participant of normalized) {

        // ----------------------------------------------
        // Registered user
        // ----------------------------------------------

        if (participant.user_id !== null) {

            const key = `user:${participant.user_id}`;

            if (!mergedParticipants.has(key)) {

                mergedParticipants.set(
                    key,
                    {
                        user_id: participant.user_id,
                        participant_name:
                            participant.participant_name,
                        role: participant.role,
                        percentage:
                            Number(participant.percentage)
                    }
                );

            } else {

                const existing =
                    mergedParticipants.get(key);

                // --------------------------------------
                // Add percentage
                // --------------------------------------

                existing.percentage +=
                    Number(participant.percentage);

                // --------------------------------------
                // Merge roles
                // --------------------------------------

                const existingRoles =
                    existing.role
                        ? existing.role
                            .split(",")
                            .map(role => role.trim())
                            .filter(Boolean)
                        : [];

                const newRoles =
                    participant.role
                        ? participant.role
                            .split(",")
                            .map(role => role.trim())
                            .filter(Boolean)
                        : [];

                const combinedRoles = [
                    ...existingRoles,
                    ...newRoles
                ];

                existing.role =
                    [...new Set(combinedRoles)]
                        .join(", ");

                // --------------------------------------
                // Use name if the original was missing
                // --------------------------------------

                if (
                    !existing.participant_name &&
                    participant.participant_name
                ) {
                    existing.participant_name =
                        participant.participant_name;
                }
            }

            continue;
        }

        // ------------------------------------------------
        // UNREGISTERED / NAMED RECIPIENT
        //
        // These remain separate unless they are actually
        // the same registered user.
        // ------------------------------------------------

        const anonymousKey =
            `anonymous:${participant.participant_name
                ?.trim()
                .toLowerCase()}::${participant.role
                ?.trim()
                .toLowerCase()}`;

        if (!mergedParticipants.has(anonymousKey)) {

            mergedParticipants.set(
                anonymousKey,
                {
                    ...participant,
                    percentage:
                        Number(participant.percentage)
                }
            );

        } else {

            const existing =
                mergedParticipants.get(
                    anonymousKey
                );

            existing.percentage +=
                Number(participant.percentage);
        }
    }

    // --------------------------------------------------
    // Convert map back to array
    // --------------------------------------------------

    const merged = Array.from(
        mergedParticipants.values()
    );

    // --------------------------------------------------
    // Round percentages
    // --------------------------------------------------

    merged.forEach(participant => {
        participant.percentage =
            Math.round(
                Number(participant.percentage) * 100
            ) / 100;
    });

    // --------------------------------------------------
    // Calculate total
    // --------------------------------------------------

    const total =
        merged.reduce(
            (sum, participant) =>
                sum +
                Number(participant.percentage),
            0
        );

    // Avoid floating-point issues
    const roundedTotal =
        Math.round(total * 100) / 100;

    if (
        roundedTotal !== ROYALTY_TOTAL
    ) {
        throw new Error(
            `Royalty split for track ${trackIndex + 1} must total exactly 100%. Current total: ${roundedTotal}%.`
        );
    }

    return merged;
}




// ======================================================
// HELPER
// Get royalty split for a particular track
//
// Supported frontend formats:
//
// FORMAT A:
//
// [
//   {
//     track_index: 0,
//     splits: [...]
//
//   },
//   {
//     track_index: 1,
//     splits: [...]
//   }
// ]
//
//
// FORMAT B:
//
// [
//   {
//     track: 0,
//     splits: [...]
//   }
// ]
//
//
// FORMAT C:
//
// {
//   "0": [...],
//   "1": [...]
// }
//
// ======================================================

function getTrackRoyaltySplits(
    royaltyData,
    trackIndex
) {

    if (!royaltyData) {
        return null;
    }

    // --------------------------------------------------
// Nested tracks format
//
// {
//   tracks: [
//     {
//       track_index: 0,
//       splits: [...]
//     }
//   ]
// }
// --------------------------------------------------

if (
    !Array.isArray(royaltyData) &&
    typeof royaltyData === "object" &&
    Array.isArray(royaltyData.tracks)
) {
    const trackEntry =
        royaltyData.tracks.find(
            entry => {
                if (
                    !entry ||
                    typeof entry !== "object"
                ) {
                    return false;
                }

                const index =
                    entry.track_index !== undefined
                        ? entry.track_index
                        : entry.track;

                return (
                    Number(index) ===
                    Number(trackIndex)
                );
            }
        );

    if (trackEntry) {

        if (
            Array.isArray(
                trackEntry.splits
            )
        ) {
            return trackEntry.splits;
        }

        if (
            Array.isArray(
                trackEntry.royalty_splits
            )
        ) {
            return trackEntry.royalty_splits;
        }
    }

    return null;
}

    // --------------------------------------------------
    // Object format
    //
// {
//   "0": [...],
//   "1": [...]
// }
// --------------------------------------------------

    if (
        !Array.isArray(
            royaltyData
        ) &&
        typeof royaltyData === "object"
    ) {

        const direct =
            royaltyData[
                String(trackIndex)
            ];

        if (
            Array.isArray(direct)
        ) {

            return direct;
        }


        if (
            direct &&
            Array.isArray(
                direct.splits
            )
        ) {

            return direct.splits;
        }

        return null;
    }


    // --------------------------------------------------
    // Array format
    // --------------------------------------------------

    if (
        !Array.isArray(
            royaltyData
        )
    ) {

        return null;
    }


    // --------------------------------------------------
    // Look for explicit track_index
    // --------------------------------------------------

    const trackEntry =
        royaltyData.find(
            entry => {

                if (
                    !entry ||
                    typeof entry !== "object"
                ) {
                    return false;
                }

                const index =
                    entry.track_index !== undefined
                        ? entry.track_index
                        : entry.track;

                return (
                    Number(index) ===
                    Number(trackIndex)
                );
            }
        );


    if (trackEntry) {

        if (
            Array.isArray(
                trackEntry.splits
            )
        ) {

            return trackEntry.splits;
        }

        // Allow direct array-like object
        if (
            Array.isArray(
                trackEntry.royalty_splits
            )
        ) {

            return trackEntry.royalty_splits;
        }

        return null;
    }


    // --------------------------------------------------
    // IMPORTANT
    //
    // If there are no track_index values and the
    // array itself looks like participant data,
    // treat it as ONE split group.
    //
    // This preserves compatibility with older uploads.
    // --------------------------------------------------

    const looksLikeParticipants =
        royaltyData.every(
            entry =>
                entry &&
                typeof entry === "object" &&
                (
                    entry.percentage !== undefined ||
                    entry.user_id !== undefined ||
                    entry.participant_name !== undefined
                )
        );


    if (
        looksLikeParticipants
    ) {

        return royaltyData;
    }


    return null;
}


// ======================================================
// HELPER
// Detect "apply split to all tracks"
// ======================================================

function getApplyToAllSplits(
    royaltyData
) {

    if (
        !royaltyData ||
        typeof royaltyData !== "object"
    ) {

        return null;
    }


    if (
        Array.isArray(
            royaltyData
        )
    ) {

        return null;
    }


    if (
        royaltyData.apply_to_all === true &&
        Array.isArray(
            royaltyData.splits
        )
    ) {

        return royaltyData.splits;
    }


    if (
        royaltyData.applyToAll === true &&
        Array.isArray(
            royaltyData.splits
        )
    ) {

        return royaltyData.splits;
    }


    return null;
}


// ======================================================
// HELPER
// Prepare ALL track royalty splits before processing
//
// This is intentionally done BEFORE audio processing.
//
// That means an invalid Track 3 royalty split will be
// rejected before Track 1 and Track 2 are inserted.
// ======================================================

function prepareTrackRoyaltySplits({
    royaltyData,
    trackCount,
    userId,
    artistName
}) {

    const prepared = [];


    // --------------------------------------------------
    // Apply-to-all format
    // --------------------------------------------------

    const applyToAll =
        getApplyToAllSplits(
            royaltyData
        );


    if (applyToAll) {

        const normalized =
            validateTrackRoyaltySplit(
                applyToAll,
                0,
                userId,
                artistName
            );


        for (
            let i = 0;
            i < trackCount;
            i++
        ) {

            prepared.push(
                normalized.map(
                    participant => ({
                        ...participant
                    })
                )
            );
        }


        return prepared;
    }


    // --------------------------------------------------
    // Individual track splits
    // --------------------------------------------------

    for (
        let trackIndex = 0;
        trackIndex < trackCount;
        trackIndex++
    ) {

        const trackSplits =
            getTrackRoyaltySplits(
                royaltyData,
                trackIndex
            );


        prepared.push(

            validateTrackRoyaltySplit(
                trackSplits,
                trackIndex,
                userId,
                artistName
            )

        );
    }


    return prepared;
}


// ======================================================
// UPLOAD SONGS
// ======================================================

async function uploadSong(
    req,
    res
) {

    let uploadedFiles = [];

    try {

        console.log(
            "\n========================================"
        );

        console.log(
            "🎵 NEW RELEASE UPLOAD"
        );

        console.log(
            "========================================"
        );


        // ==================================================
        // AUTH
        // ==================================================

        if (!req.userId) {

            return res.status(401).json({

                success: false,

                message:
                    "Unauthorized"

            });
        }


        // ==================================================
        // FILE CHECK
        // ==================================================

        if (
            !req.files ||
            !req.files.audio ||
            req.files.audio.length === 0
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "No audio files selected"

            });
        }


        const audioFiles =
            req.files.audio;


        const coverFile =
            req.files.cover
                ? req.files.cover[0]
                : null;


        const lyricsFile =
            req.files.lyrics
                ? req.files.lyrics[0]
                : null;


        uploadedFiles = [

            ...audioFiles,

            ...(coverFile
                ? [coverFile]
                : []),

            ...(lyricsFile
                ? [lyricsFile]
                : [])

        ];


        console.log(
            "Tracks:",
            audioFiles.length
        );


        audioFiles.forEach(
            (
                file,
                index
            ) => {

                console.log(
                    `Track ${index + 1}:`,
                    file.originalname
                );

            }
        );


        // ==================================================
        // PLATFORMS
        // ==================================================

        let platforms = [];


        if (
            req.body.platforms
        ) {

            platforms =
                parseJsonField(
                    req.body.platforms,
                    "platforms"
                ) || [];

        }


        req.body.platforms =
            platforms;



// ==================================================
// MONETIZATION OPTIONS
// ==================================================

req.body.youtube_monetization =
    parseBooleanField(
        req.body.youtube_monetization,
        false
    );

req.body.streaming_royalties =
    parseBooleanField(
        req.body.streaming_royalties,
        false
    );

req.body.download_sales =
    parseBooleanField(
        req.body.download_sales,
        false
    );

 // --------------------------------------------------
// MASTER MONETIZATION SWITCH
// --------------------------------------------------

req.body.monetization_enabled =
    parseBooleanField(
        req.body.monetization_enabled,
        false
    );   

console.log("\n💰 MONETIZATION OPTIONS");

console.log(
    "YouTube Monetization:",
    req.body.youtube_monetization
);

console.log(
    "Streaming Royalties:",
    req.body.streaming_royalties
);

console.log(
    "Download Sales:",
    req.body.download_sales
);

console.log(
    "Monetization Enabled:",
    req.body.monetization_enabled
);

        // ==================================================
        // RELEASE TYPE
        // ==================================================

        const releaseType =
            String(
                req.body.release_type ||
                "single"
            )
                .trim()
                .toLowerCase();

// ==================================================
// TRACK-SPECIFIC FEATURED ARTISTS
// ==================================================

const trackFeaturedArtistsData =
    parseJsonField(
        req.body.track_featured_artists,
        "track_featured_artists"
    );

// The frontend should send one manifest entry per track.
// If no manifest was sent, all tracks receive empty arrays.
const normalizedTrackFeaturedArtists = [];

if (
    trackFeaturedArtistsData !== null &&
    !Array.isArray(trackFeaturedArtistsData)
) {
    throw new Error(
        "Track featured artists data must be an array."
    );
}

if (
    Array.isArray(trackFeaturedArtistsData) &&
    trackFeaturedArtistsData.length !== audioFiles.length
) {
    throw new Error(
        "Featured artists data must match the number of uploaded tracks."
    );
}

for (
    let index = 0;
    index < audioFiles.length;
    index++
) {
    const entry =
        trackFeaturedArtistsData
            ? trackFeaturedArtistsData[index]
            : null;

    if (
        trackFeaturedArtistsData &&
        (
            !entry ||
            typeof entry !== "object" ||
            Array.isArray(entry)
        )
    ) {
        throw new Error(
            `Invalid featured artists data for track ${index + 1}.`
        );
    }

    // If the frontend supplies track_index, make sure
    // it matches the audio file's position.
    if (
        entry &&
        entry.track_index !== undefined &&
        Number(entry.track_index) !== index
    ) {
        throw new Error(
            `Featured artists are assigned to the wrong track at position ${index + 1}.`
        );
    }

    normalizedTrackFeaturedArtists.push(
        normalizeFeaturedArtists(
            entry?.featured_artists
        )
    );
}

console.log("\n🎤 TRACK FEATURED ARTISTS");

normalizedTrackFeaturedArtists.forEach(
    (artists, index) => {
        console.log(
            `Track ${index + 1}:`,
            artists.length
                ? artists.join(", ")
                : "None"
        );
    }
);

        // ==================================================
        // ROYALTY SPLITS
        //
        // Each track gets an independent split.
        // ==================================================

        const royaltyData =
            parseJsonField(
                req.body.royalty_splits,
                "royalty_splits"
            );


        const trackRoyaltySplits =
            prepareTrackRoyaltySplits({

                royaltyData,

                trackCount:
                    audioFiles.length,

                userId:
                    req.userId,

                artistName:
                    req.body.artist_name

            });


        console.log(
            "\n💰 ROYALTY SPLITS"
        );


        trackRoyaltySplits.forEach(
            (
                splits,
                index
            ) => {

                const total =
                    splits.reduce(
                        (
                            sum,
                            participant
                        ) =>
                            sum +
                            Number(
                                participant.percentage
                            ),
                        0
                    );


                console.log(
                    `Track ${index + 1}: ${total}%`
                );


                splits.forEach(
                    participant => {

                        console.log(
                            `  - ${
                                participant.participant_name ||
                                `User ${participant.user_id}`
                            } | ${
                                participant.role
                            } | ${
                                participant.percentage
                            }%`
                        );

                    }
                );

            }
        );


        // ==================================================
        // STORE UPLOADED SONGS
        // ==================================================

        const uploadedSongs = [];


        // ==================================================
        // PROCESS EACH TRACK
        // ==================================================

        for (
            let i = 0;
            i < audioFiles.length;
            i++
        ) {

            let audioFile =
                audioFiles[i];

// =============================================
// THIS TRACK'S FEATURED ARTISTS
// =============================================

const currentFeaturedArtists =
    normalizedTrackFeaturedArtists[i];

console.log(
    `🎤 Track ${i + 1} featured artists:`,
    currentFeaturedArtists.length
        ? currentFeaturedArtists.join(", ")
        : "None"
);
            // =============================================
            // ORIGINAL FILE TITLE
            // =============================================

            const originalTitle =
                audioFile.originalname
                    .replace(
                        /\.[^/.]+$/,
                        ""
                    )
                    .trim();


            // =============================================
            // TRACK TITLE
            // =============================================

            let trackTitle;


            if (
                releaseType === "album" ||
                releaseType === "ep"
            ) {

                trackTitle =
                    originalTitle;

            } else {

                trackTitle =
                    req.body.title?.trim() ||
                    originalTitle;

            }


            // Send temporary title to metadata builder

            req.body.track_title =
                trackTitle;


            // =============================================
            // AUDIO FILE VALIDATION
            // =============================================

            if (
                !audioFile.mimetype ||
                !audioFile.mimetype.startsWith(
                    "audio/"
                )
            ) {

                throw new Error(
                    `Invalid audio file uploaded for track ${i + 1}.`
                );
            }


            console.log(
                "\n-----------------------------"
            );

            console.log(
                `Processing Track ${i + 1}`
            );

            console.log(
                `Title: ${trackTitle}`
            );

            console.log(
                "-----------------------------"
            );


            // =============================================
            // GET THIS TRACK'S ROYALTY SPLIT
            // =============================================

            const currentRoyaltySplit =
                trackRoyaltySplits[i];


            console.log(
                `💰 Track ${i + 1} royalty split:`,
                currentRoyaltySplit
            );


            // =============================================
            // CONVERT AUDIO TO MP3
            // =============================================

            console.log(
                "Converting audio..."
            );


            console.time(
                `FFmpeg Track ${i + 1}`
            );


            const convertedFile =
                await convertToMp3(
                    audioFile
                );


            console.timeEnd(
                `FFmpeg Track ${i + 1}`
            );


            uploadedFiles.push(
                convertedFile
            );


            audioFile =
                convertedFile;


            console.log(
                "FINAL AUDIO FILE:",
                audioFile.path
            );


            console.log(
                "FINAL AUDIO SIZE:",
                Math.round(
                    audioFile.size /
                    1024 /
                    1024
                ),
                "MB"
            );


            console.log(
                "✅ Conversion complete"
            );


            // =============================================
            // AUDIO ANALYSIS
            // =============================================

            console.log(
                "Analyzing audio..."
            );


            const audioInfo =
                await analyzeAudio(
                    audioFile.path
                );


            console.log(
                "Audio analysis complete."
            );


            // =============================================
            // EMBED METADATA
            // =============================================

            if (coverFile) {

                console.log(
                    "Embedding artwork..."
                );


                await embedMetadata({

                    audioPath:
                        audioFile.path,

                    coverPath:
                        coverFile.path,

                    metadata: {

                        title:
                            trackTitle,

                        artist:
                            req.body.artist_name,

                        album:
                            req.body.album_name,

                        genre:
                            req.body.genre,

                        copyright_owner:
                            req.body.copyright_owner,

                        composer:
                            req.body.composer,

                        record_label:
                            req.body.record_label

                    }

                });


                console.log(
                    "✅ Artwork embedded"
                );

            }


            // =============================================
            // BUILD SONG DATA
            // =============================================

            const song =
                buildSongMetadata({

                    body: {

                        ...req.body,

                        title:
                            trackTitle

                    },

                    userId:
                        req.userId,

                    audioFile,

                    coverFile,

                    lyricsFile,

                    audioInfo

                });


            if (!song.artist_name) {

                throw new Error(
                    "Artist name is required"
                );
            }


            // =============================================
            // INSERT SONG
            // =============================================
// =============================================
// INSERT SONG
// =============================================

const query = `
    INSERT INTO songs
    (
        user_id,
        title,
        artist_name,
        album_name,
        ep_name,
        release_type,
        genre,
        country,
        language,
        audio_file_id,
        cover_file_id,
        audio_url,
        cover_url,
        duration,
        file_size,
        copyright_owner,
        copyright_year,
        lyrics,
        lyrics_file_url,
        platforms,
        bitrate,
        youtube_monetization,
        streaming_royalties,
        monetization_enabled,
        download_sales,
        featured_artists,
        status
    )
    VALUES
    (
        $1, $2, $3, $4, $5, $6, $7,
        $8, $9, $10, $11, $12, $13, $14,
        $15, $16, $17, $18, $19, $20, $21,
        $22, $23, $24, $25, $26, $27
    )
    RETURNING *;
`;

const values = [
    req.userId,
    song.title,
    song.artist_name,
    song.album_name,
    song.ep_name,
    song.release_type,
    song.genre,
    song.country,
    song.language,
    song.audio_file_id,
    song.cover_file_id,
    song.audio_url,
    song.cover_url,
    song.duration,
    song.file_size,
    song.copyright_owner,
    song.copyright_year,
    song.lyrics,
    song.lyrics_file_url,
    JSON.stringify(song.platforms),
    song.bitrate,

    // Monetization
    req.body.youtube_monetization,
    req.body.streaming_royalties,
    req.body.monetization_enabled,
    req.body.download_sales,

    // This track's featured artists only
    JSON.stringify(currentFeaturedArtists),

    // Song status
    "published"
];

const result = await pool.query(
    query,
    values
);

const savedSong = result.rows[0];


           



            // =============================================
            // CREATE ROYALTY SPLIT FOR THIS TRACK ONLY
            // =============================================

            await createInitialRoyaltySplit(

                pool,

                savedSong.id,

                req.userId,

                currentRoyaltySplit

            );


            console.log(
                `💰 Royalty split created for Track ${i + 1} / Song ID ${savedSong.id}`
            );


            // =============================================
            // STORE SONG
            // =============================================

            uploadedSongs.push(
                savedSong
            );


            console.log(
                `✅ Track ${i + 1} saved`
            );

        }


        // ==================================================
        // CREATE ONE RELEASE NOTIFICATION
        // ==================================================

        if (
            uploadedSongs.length > 0
        ) {

            try {

                const trackCount =
                    uploadedSongs.length;


                const firstSong =
                    uploadedSongs[0];


                // =========================================
                // RELEASE NAME
                // =========================================

                let releaseName =
                    req.body.album_name?.trim();


                if (
                    !releaseName &&
                    releaseType === "ep"
                ) {

                    releaseName =
                        req.body.ep_name?.trim();

                }


                // =========================================
                // DEFAULT SINGLE
                // =========================================

                let notificationTitle =
                    "Upload complete";


                let notificationMessage =
                    `"${firstSong.title}" has been successfully uploaded to Cave Tunes.`;


                // =========================================
                // EP
                // =========================================

                if (
                    releaseType === "ep"
                ) {

                    releaseName =
                        releaseName ||
                        "Your EP";


                    notificationTitle =
                        "EP upload complete";


                    notificationMessage =
                        `"${releaseName}" with ${trackCount} ${
                            trackCount === 1
                                ? "track"
                                : "tracks"
                        } has been successfully uploaded to Cave Tunes.`;

                }


                // =========================================
                // ALBUM
                // =========================================

                else if (
                    releaseType === "album"
                ) {

                    releaseName =
                        releaseName ||
                        "Your album";


                    notificationTitle =
                        "Album upload complete";


                    notificationMessage =
                        `"${releaseName}" with ${trackCount} ${
                            trackCount === 1
                                ? "track"
                                : "tracks"
                        } has been successfully uploaded to Cave Tunes.`;

                }


                // =========================================
                // NOTIFICATION TARGET
                // =========================================

                const actionUrl =
                    firstSong?.id
                        ? `/song/${firstSong.id}`
                        : "/library";


                // =========================================
                // CREATE NOTIFICATION
                // =========================================

                await createNotification({

                    userId:
                        req.userId,

                    actorUserId:
                        null,

                    songId:
                        firstSong?.id ||
                        null,

                    type:
                        "upload_complete",

                    title:
                        notificationTitle,

                    message:
                        notificationMessage,

                    actionUrl,

                    metadata: {

                        releaseType,

                        releaseName:
                            releaseName ||
                            firstSong.title,

                        trackCount,

                        songIds:
                            uploadedSongs.map(
                                song =>
                                    song.id
                            )

                    }

                });


                console.log(
                    "🔔 Release upload notification created"
                );


            } catch (
                notificationError
            ) {

                // =========================================
                // DO NOT FAIL SUCCESSFUL UPLOAD
                // =========================================

                console.error(
                    "⚠️ Failed to create release upload notification:",
                    notificationError
                );

            }

        }


        // ==================================================
        // SUCCESS
        // ==================================================

        console.log(
            "\n🎉 RELEASE UPLOAD COMPLETE"
        );


        return res.status(201).json({

            success:
                true,

            message:
                `${uploadedSongs.length} track(s) uploaded successfully`,

            songs:
                uploadedSongs

        });


    } catch (error) {

        console.error(
            "\n❌ UPLOAD FAILED"
        );


        console.error(
            error.stack ||
            error
        );


        // ==================================================
        // DELETE UPLOADED FILES
        // ==================================================

        if (
            uploadedFiles.length
        ) {

            try {

                await deleteFiles(
                    uploadedFiles
                );

            } catch (
                cleanupError
            ) {

                console.error(
                    "⚠️ File cleanup failed:",
                    cleanupError
                );

            }

        }


        return res.status(500).json({

            success:
                false,

            message:
                "Upload failed",

            error:
                error.message

        });

    }

}


// ======================================================
// GET LOGGED-IN USER SONGS
// ======================================================

async function getMySongs(
    req,
    res
) {

    try {

        const userId =
            req.userId;


        if (!userId) {

            return res.status(401).json({

                success:
                    false,

                message:
                    "Unauthorized"

            });

        }


        const result =
            await pool.query(

                `

                SELECT

                    id,

                    title,

                    artist_name,

                    genre,
                    featured_artists,
                    album_name,

                    release_type,

                    cover_url,

                    audio_url,

                    downloads,

                    plays,

                    lyrics,

                    created_at

                FROM songs

                WHERE user_id = $1

                ORDER BY created_at DESC

                `,

                [userId]

            );


        return res.json({

            success:
                true,

            songs: result.rows.map(song => ({
    ...song,
    featured_artists:
        normalizeFeaturedArtists(
            song.featured_artists
        )
}))

        });


    } catch (error) {

        console.error(
            "GET MY SONGS ERROR:",
            error
        );


        return res.status(500).json({

            success:
                false,

            message:
                error.message

        });

    }

}


// ======================================================
// EXPORTS
// ======================================================

module.exports = {

    uploadSong,

    getMySongs

};