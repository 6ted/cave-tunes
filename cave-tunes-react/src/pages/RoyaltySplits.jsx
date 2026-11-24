import {
    useMemo,
    useRef,
    useState,
} from "react";

import {
    useNavigate,
} from "react-router-dom";

import {
    DollarSign,
    Plus,
    Trash2,
    CheckCircle,
    AlertCircle,
    Users,
    Search,
    X,
    Loader2,
    UserCircle,
} from "lucide-react";

import {
    useUpload,
} from "../context/useUpload.jsx";



import "../styles/UploadStudio.css";


// ======================================================
// CAVE TUNES
// ROYALTY SPLITS
// ======================================================

const API_BASE_URL =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1"
        ? "http://localhost:5000"
        : `http://${window.location.hostname}:5000`;


// ======================================================
// ROLES
// ======================================================

const ROLES = [
    "artist",
    "producer",
    "songwriter",
    "composer",
    "performer",
    "publisher",
    "label",
    "distributor",
    "mixing_engineer",
    "mastering_engineer",
    "other",
];


// ======================================================
// CREATE PARTICIPANT
// ======================================================

function createParticipant(
    defaultName = "",
    defaultRole = "artist"
) {
    return {
        user_id: null,

        participant_name:
            defaultName,

        participant_username:
            "",

        profile_image_url:
            null,

        role:
            defaultRole,

        percentage:
            "",
    };
}


// ======================================================
// CALCULATE TOTAL
// ======================================================

function calculateTotal(
    splits = []
) {
    const total =
        splits.reduce(
            (
                sum,
                participant
            ) =>
                sum +
                (
                    Number(
                        participant?.percentage
                    ) || 0
                ),
            0
        );

    return Math.round(
        total * 100
    ) / 100;
}


// ======================================================
// VALIDATE TOTAL
// ======================================================

function isValidTotal(
    total
) {
    return Math.abs(
        total - 100
    ) < 0.001;
}


// ======================================================
// NORMALIZE SPLITS
// ======================================================

function normalizeSplits(
    splits = []
) {
    return splits.map(
        (participant) => ({
            user_id:
                participant.user_id !== null &&
                participant.user_id !== undefined &&
                participant.user_id !== ""
                    ? Number(
                        participant.user_id
                    )
                    : null,

            participant_name:
                String(
                    participant.participant_name ||
                    participant.name ||
                    participant.recipient_name ||
                    ""
                ).trim(),

            participant_username:
                String(
                    participant.participant_username ||
                    ""
                ).trim(),

            profile_image_url:
                participant.profile_image_url ||
                null,

            role:
                participant.role ||
                "participant",

            percentage:
                Number(
                    participant.percentage
                ) || 0,
        })
    );
}


// ======================================================
// FORMAT ROLE
// ======================================================

function formatRole(
    role
) {
    return String(
        role || ""
    )
        .replaceAll(
            "_",
            " "
        )
        .replace(
            /\b\w/g,
            (letter) =>
                letter.toUpperCase()
        );
}


// ======================================================
// GET AUTH TOKEN
// ======================================================

function getAuthToken() {
    return (
        localStorage.getItem(
            "token"
        ) ||

        localStorage.getItem(
            "caveTunesToken"
        ) ||

        localStorage.getItem(
            "authToken"
        ) ||

        ""
    );
}




// ======================================================
// USER AVATAR
// ======================================================

function UserAvatar({
    user,
    size = 38,
}) {
    const image =
        user?.profile_image_url;

    if (image) {
        const imageUrl =
            image.startsWith("http")
                ? image
                : `${API_BASE_URL}${image}`;

        return (
            <img
                src={imageUrl}
                alt={
                    user?.username ||
                    "User"
                }
                className="royalty-user-avatar"
                style={{
                    width: size,
                    height: size,
                }}
            />
        );
    }

    return (
        <div
            className="royalty-user-avatar royalty-user-avatar-placeholder"
            style={{
                width: size,
                height: size,
            }}
        >
            <UserCircle
                size={
                    Math.max(
                        20,
                        size - 10
                    )
                }
            />
        </div>
    );
}


// ======================================================
// USER SEARCH PICKER
// ======================================================

function ParticipantUserPicker({
    participant,
    onSelect,
    onClear,
}) {
    const [
        searchTerm,
        setSearchTerm,
    ] = useState(
        participant?.participant_username ||
        participant?.participant_name ||
        ""
    );

    const [
        users,
        setUsers,
    ] = useState([]);

    const [
        loading,
        setLoading,
    ] = useState(false);

    const [
        searching,
        setSearching,
    ] = useState(false);

    const [
        showResults,
        setShowResults,
    ] = useState(false);

    const timerRef =
        useRef(null);


    // ==================================================
    // SEARCH USERS
    // ==================================================

    const searchUsers = (
        value
    ) => {
        const query =
            value.trim();

        setSearchTerm(
            value
        );

        setShowResults(
            true
        );

        if (
            participant?.user_id
        ) {
            onClear();
        }

        if (
            timerRef.current
        ) {
            clearTimeout(
                timerRef.current
            );
        }

        if (!query) {
            setUsers([]);
            setLoading(false);
            setSearching(false);
            return;
        }

        setSearching(
            true
        );

        timerRef.current =
            setTimeout(
                async () => {
                    try {
                        setLoading(
                            true
                        );

                        const token =
                            getAuthToken();

                        const response =
                            await fetch(
                                `${API_BASE_URL}/api/auth/users/search?q=${encodeURIComponent(query)}`,
                                {
                                    headers:
                                        token
                                            ? {
                                                Authorization:
                                                    `Bearer ${token}`,
                                            }
                                            : {},
                                }
                            );

                        const data =
                            await response.json();

                        if (
                            !response.ok
                        ) {
                            throw new Error(
                                data?.message ||
                                "User search failed."
                            );
                        }

                        setUsers(
                            Array.isArray(
                                data?.users
                            )
                                ? data.users
                                : []
                        );
                    } catch (
                        error
                    ) {
                        console.error(
                            "ROYALTY USER SEARCH ERROR:",
                            error
                        );

                        setUsers([]);
                    } finally {
                        setLoading(
                            false
                        );

                        setSearching(
                            false
                        );
                    }
                },
                300
            );
    };


    // ==================================================
    // SELECT USER
    // ==================================================

    const handleSelect = (
        selectedUser
    ) => {
        setSearchTerm(
            selectedUser.username ||
            ""
        );

        setShowResults(
            false
        );

        onSelect(
            selectedUser
        );
    };


    // ==================================================
    // CLEAR SELECTED USER
    // ==================================================

    const handleClear = () => {
        setSearchTerm(
            ""
        );

        setUsers([]);

        setShowResults(
            false
        );

        onClear();
    };


    return (
        <div
            className="royalty-user-picker"
        >
            <div
                className="royalty-search-wrapper"
            >
                <Search
                    size={18}
                    className="royalty-search-icon"
                />

                <input
                    type="text"
                    value={
                        searchTerm
                    }
                    placeholder="Search Cave Tunes user..."
                    autoComplete="off"
                    onFocus={() => {
                        if (
                            searchTerm.trim()
                        ) {
                            setShowResults(
                                true
                            );
                        }
                    }}
                    onChange={(event) =>
                        searchUsers(
                            event.target.value
                        )
                    }
                />

                {loading && (
                    <Loader2
                        size={18}
                        className="royalty-search-loader"
                    />
                )}

                {!loading &&
                    (
                        participant?.user_id ||
                        searchTerm
                    ) && (
                        <button
                            type="button"
                            className="royalty-search-clear"
                            onClick={
                                handleClear
                            }
                        >
                            <X
                                size={16}
                            />
                        </button>
                    )}
            </div>

            {showResults &&
                searchTerm.trim() && (
                    <div
                        className="royalty-user-results"
                    >
                        {loading && (
                            <div
                                className="royalty-user-status"
                            >
                                <Loader2
                                    size={18}
                                    className="royalty-spin"
                                />

                                Searching users...
                            </div>
                        )}

                        {!loading &&
                            searching && (
                                <div
                                    className="royalty-user-status"
                                >
                                    Searching...
                                </div>
                            )}

                        {!loading &&
                            !searching &&
                            users.length === 0 && (
                                <div
                                    className="royalty-user-status royalty-no-users"
                                >
                                    <UserCircle
                                        size={22}
                                    />

                                    <div>
                                        <strong>
                                            No users found
                                        </strong>

                                        <span>
                                            Try another username.
                                        </span>
                                    </div>
                                </div>
                            )}

                        {!loading &&
                            users.length > 0 && (
                                <>
                                    {users.map(
                                        (
                                            selectedUser
                                        ) => (
                                            <button
                                                type="button"
                                                className="royalty-user-result"
                                                key={
                                                    selectedUser.id
                                                }
                                                onClick={() =>
                                                    handleSelect(
                                                        selectedUser
                                                    )
                                                }
                                            >
                                                <UserAvatar
                                                    user={
                                                        selectedUser
                                                    }
                                                    size={
                                                        38
                                                    }
                                                />

                                                <div
                                                    className="royalty-user-info"
                                                >
                                                    <div
                                                        className="royalty-user-name"
                                                    >
                                                        <strong>
                                                            {
                                                                selectedUser.username
                                                            }
                                                        </strong>

                                                        {selectedUser.verified && (
                                                            <CheckCircle
                                                                size={14}
                                                                className="royalty-verified"
                                                            />
                                                        )}
                                                    </div>

                                                    <span>
                                                        {formatRole(
                                                            selectedUser.role
                                                        )}
                                                    </span>
                                                </div>
                                            </button>
                                        )
                                    )}
                                </>
                            )}
                    </div>
                )}
        </div>
    );
}


// ======================================================
// TRACK SPLIT EDITOR
// ======================================================

function TrackSplitEditor({
    track,
    trackIndex,
    splits,
    onChange,
}) {
    const total =
        calculateTotal(
            splits
        );


        // ======================================================
// NORMALIZE TRACK FEATURED ARTISTS
// ======================================================


    // ==================================================
    // UPDATE PARTICIPANT
    // ==================================================

    const updateParticipant = (
        participantIndex,
        field,
        value
    ) => {
        const updated = [
            ...splits,
        ];

        updated[
            participantIndex
        ] = {
            ...updated[
                participantIndex
            ],

            [field]:
                value,
        };

        onChange(
            updated
        );
    };


    // ==================================================
    // SELECT USER
    // ==================================================

    const selectUser = (
        participantIndex,
        selectedUser
    ) => {
        const updated = [
            ...splits,
        ];

        updated[
            participantIndex
        ] = {
            ...updated[
                participantIndex
            ],

            user_id:
                selectedUser.id,

            participant_name:
                selectedUser.username,

            participant_username:
                selectedUser.username,

            profile_image_url:
                selectedUser.profile_image_url ||
                null,
        };

        onChange(
            updated
        );
    };


    // ==================================================
    // CLEAR USER
    // ==================================================

    const clearUser = (
        participantIndex
    ) => {
        const updated = [
            ...splits,
        ];

        updated[
            participantIndex
        ] = {
            ...updated[
                participantIndex
            ],

            user_id:
                null,

            participant_name:
                "",

            participant_username:
                "",

            profile_image_url:
                null,
        };

        onChange(
            updated
        );
    };


    // ==================================================
    // ADD PARTICIPANT
    // ==================================================

    const addParticipant =
        () => {
            onChange([
                ...splits,
                createParticipant(),
            ]);
        };


    // ==================================================
    // REMOVE PARTICIPANT
    // ==================================================

    const removeParticipant =
        (participantIndex) => {
            if (
                splits.length <= 1
            ) {
                return;
            }

            onChange(
                splits.filter(
                    (_, index) =>
                        index !==
                        participantIndex
                )
            );
        };


    return (
        <div
            className="upload-section"
        >
            <div
                className="royalty-track-header"
            >
                <div>
                    <h2>
                        Track {trackIndex + 1}
                    </h2>

                    <p>
                        {
                            track?.name ||
                            track?.title ||
                            track?.song_title ||
                            `Track ${trackIndex + 1}`
                        }
                    </p>
                </div>

                <div
                    className={
                        isValidTotal(
                            total
                        )
                            ? "royalty-total valid"
                            : "royalty-total invalid"
                    }
                >
                    {total}%
                </div>
            </div>

            {splits.map(
                (
                    participant,
                    participantIndex
                ) => (
                    <div
                        className="royalty-participant"
                        key={
                            participant.user_id
                                ? `user-${participant.user_id}-${participantIndex}`
                                : `participant-${participantIndex}`
                        }
                    >
                        <div
                            className="royalty-row"
                        >
                            <ParticipantUserPicker
                                participant={
                                    participant
                                }

                                onSelect={(
                                    selectedUser
                                ) =>
                                    selectUser(
                                        participantIndex,
                                        selectedUser
                                    )
                                }

                                onClear={() =>
                                    clearUser(
                                        participantIndex
                                    )
                                }
                            />

                            <select
                                value={
                                    participant.role ||
                                    "artist"
                                }
                                onChange={(event) =>
                                    updateParticipant(
                                        participantIndex,
                                        "role",
                                        event.target.value
                                    )
                                }
                            >
                                {ROLES.map(
                                    (role) => (
                                        <option
                                            key={
                                                role
                                            }
                                            value={
                                                role
                                            }
                                        >
                                            {formatRole(
                                                role
                                            )}
                                        </option>
                                    )
                                )}
                            </select>

                            <input
                                type="number"
                                min="0"
                                max="100"
                                step="0.01"
                                placeholder="%"
                                value={
                                    participant.percentage ?? ""
                                }
                                onChange={(event) =>
                                    updateParticipant(
                                        participantIndex,
                                        "percentage",
                                        event.target.value
                                    )
                                }
                            />

                            <button
                                type="button"
                                className="royalty-remove"
                                onClick={() =>
                                    removeParticipant(
                                        participantIndex
                                    )
                                }
                                disabled={
                                    splits.length <=
                                    1
                                }
                                title="Remove participant"
                            >
                                <Trash2
                                    size={18}
                                />
                            </button>
                        </div>
                    </div>
                )
            )}

            <button
                type="button"
                className="royalty-add-button"
                onClick={
                    addParticipant
                }
            >
                <Plus
                    size={18}
                />

                Add Participant
            </button>

            {!isValidTotal(
                total
            ) && (
                <div
                    className="royalty-warning"
                >
                    <AlertCircle
                        size={18}
                    />

                    <span>
                        This track must total
                        exactly 100%. Current
                        total: {total}%.
                    </span>
                </div>
            )}

            {isValidTotal(
                total
            ) && (
                <div
                    className="royalty-success"
                >
                    <CheckCircle
                        size={18}
                    />

                    <span>
                        Royalty split is complete.
                    </span>
                </div>
            )}
        </div>
    );
}


// ======================================================
// MAIN COMPONENT
// ======================================================

function RoyaltySplits() {
    const navigate =
        useNavigate();

    const {
        releaseData,
        updateReleaseData,
    } = useUpload();




    // ==================================================
    // MONETIZATION STATUS
    // ==================================================

;


    // ==================================================
    // TRACKS
    // ==================================================

    const tracks =
        Array.isArray(
            releaseData?.tracks
        )
            ? releaseData.tracks
            : [];


    // ==================================================
    // DEFAULT PARTICIPANT
    // ==================================================

    const defaultParticipant =
        useMemo(
            () =>
                createParticipant(
                    releaseData?.artist_name ||
                    releaseData?.artistName ||
                    "",
                    "artist"
                ),
            [
                releaseData?.artist_name,
                releaseData?.artistName,
            ]
        );


    // ==================================================
    // SAVED ROYALTY
    // ==================================================

    const savedRoyalty =
        releaseData?.royalty_splits;


    // ==================================================
    // APPLY TO ALL
    // ==================================================

    const [
        applyToAll,
        setApplyToAll,
    ] = useState(
        savedRoyalty?.apply_to_all ??
        true
    );


    // ==================================================
    // SHARED SPLITS
    // ==================================================

    const [
        sharedSplits,
        setSharedSplits,
    ] = useState(() => {
        if (
            savedRoyalty?.apply_to_all &&
            Array.isArray(
                savedRoyalty.splits
            ) &&
            savedRoyalty.splits.length
        ) {
            return savedRoyalty.splits;
        }

        return [
            {
                ...defaultParticipant,
                percentage: 100,
            },
        ];
    });


    // ==================================================
    // INDIVIDUAL TRACK SPLITS
    // ==================================================

    const [
        trackSplits,
        setTrackSplits,
    ] = useState(() => {
        if (
            savedRoyalty &&
            savedRoyalty.apply_to_all === false &&
            Array.isArray(
                savedRoyalty.tracks
            )
        ) {
            return tracks.map(
                (
                    track,
                    index
                ) => {
                    const savedTrack =
                        savedRoyalty.tracks.find(
                            (entry) =>
                                Number(
                                    entry?.track_index
                                ) === index
                        );

                    if (
                        savedTrack &&
                        Array.isArray(
                            savedTrack.splits
                        ) &&
                        savedTrack.splits.length
                    ) {
                        return savedTrack.splits;
                    }

                    return [
                        {
                            ...defaultParticipant,
                            percentage: 100,
                        },
                    ];
                }
            );
        }

        return tracks.map(
            () => [
                {
                    ...defaultParticipant,
                    percentage: 100,
                },
            ]
        );
    });


    // ==================================================
    // SHARED TOTAL
    // ==================================================

    const sharedTotal =
        calculateTotal(
            sharedSplits
        );


    // ==================================================
    // INDIVIDUAL TOTALS
    // ==================================================

    const individualTotals =
        trackSplits.map(
            (splits) =>
                calculateTotal(
                    splits
                )
        );


    // ==================================================
    // VALIDATION
    // ==================================================

    const allIndividualValid =
        tracks.length > 0 &&
        tracks.every(
            (_, index) =>
                isValidTotal(
                    individualTotals[
                        index
                    ] ?? 0
                )
        );


    // ==================================================
    // UPDATE SHARED PARTICIPANT
    // ==================================================

    const updateSharedParticipant = (
        index,
        field,
        value
    ) => {
        setSharedSplits(
            (current) => {
                const updated = [
                    ...current,
                ];

                updated[index] = {
                    ...updated[index],

                    [field]:
                        value,
                };

                return updated;
            }
        );
    };


    // ==================================================
    // SELECT SHARED USER
    // ==================================================

    const selectSharedUser = (
        index,
        selectedUser
    ) => {
        setSharedSplits(
            (current) => {
                const updated = [
                    ...current,
                ];

                updated[index] = {
                    ...updated[index],

                    user_id:
                        selectedUser.id,

                    participant_name:
                        selectedUser.username,

                    participant_username:
                        selectedUser.username,

                    profile_image_url:
                        selectedUser.profile_image_url ||
                        null,
                };

                return updated;
            }
        );
    };


    // ==================================================
    // CLEAR SHARED USER
    // ==================================================

    const clearSharedUser = (
        index
    ) => {
        setSharedSplits(
            (current) => {
                const updated = [
                    ...current,
                ];

                updated[index] = {
                    ...updated[index],

                    user_id:
                        null,

                    participant_name:
                        "",

                    participant_username:
                        "",

                    profile_image_url:
                        null,
                };

                return updated;
            }
        );
    };


    // ==================================================
    // ADD SHARED PARTICIPANT
    // ==================================================

    const addSharedParticipant =
        () => {
            setSharedSplits(
                (current) => [
                    ...current,
                    createParticipant(),
                ]
            );
        };


    // ==================================================
    // REMOVE SHARED PARTICIPANT
    // ==================================================

    const removeSharedParticipant =
        (index) => {
            setSharedSplits(
                (current) => {
                    if (
                        current.length <= 1
                    ) {
                        return current;
                    }

                    return current.filter(
                        (
                            _,
                            participantIndex
                        ) =>
                            participantIndex !==
                            index
                    );
                }
            );
        };


    // ==================================================
    // UPDATE TRACK SPLITS
    // ==================================================

    const updateTrackSplits = (
        trackIndex,
        updatedSplits
    ) => {
        setTrackSplits(
            (current) => {
                const next = [
                    ...current,
                ];

                next[
                    trackIndex
                ] =
                    updatedSplits;

                return next;
            }
        );
    };


    // ==================================================
    // CONTINUE
    // ==================================================


const continueNext = () => {
    // Check monetization
  

    // Check tracks
    if (!tracks.length) {
        alert(
            "No tracks were found. Please go back and add your tracks."
        );
        return;
    }

    // Preserve each track's own featured artists
  const updatedTracks = tracks.map(track => {
    let featuredArtists = [];

    if (Array.isArray(track.featured_artists)) {
        featuredArtists = track.featured_artists;
    } else if (
        typeof track.featured_artists === "string"
    ) {
        featuredArtists = track.featured_artists
            .split(",")
            .map(name => name.trim())
            .filter(Boolean);
    }

    return {
        ...track,
        featured_artists: [...featuredArtists]
    };
});

    let finalRoyaltySplits;

    // ==========================================
    // SAME SPLIT FOR ALL TRACKS
    // ==========================================

    if (applyToAll) {
        if (!isValidTotal(sharedTotal)) {
            alert(
                `The royalty split must equal exactly 100%. Current total: ${sharedTotal}%.`
            );
            return;
        }

        const invalidParticipant = sharedSplits.find(
            participant =>
                !participant.user_id ||
                !String(
                    participant.participant_username || ""
                ).trim()
        );

        if (invalidParticipant) {
            alert(
                "Please select every royalty participant from the Cave Tunes user list."
            );
            return;
        }

        finalRoyaltySplits = {
            apply_to_all: true,
            splits: normalizeSplits(sharedSplits)
        };
    }

    // ==========================================
    // INDIVIDUAL TRACK SPLITS
    // ==========================================

    else {
        if (!allIndividualValid) {
            const invalidTrack = individualTotals.findIndex(
                total => !isValidTotal(total)
            );

            alert(
                `Track ${invalidTrack + 1} must total exactly 100%.`
            );
            return;
        }

        for (
            let index = 0;
            index < trackSplits.length;
            index++
        ) {
            const invalidParticipant = trackSplits[index].find(
                participant =>
                    !participant.user_id ||
                    !String(
                        participant.participant_username || ""
                    ).trim()
            );

            if (invalidParticipant) {
                alert(
                    `Please select every royalty participant on Track ${index + 1} from the Cave Tunes user list.`
                );
                return;
            }
        }

        finalRoyaltySplits = {
            apply_to_all: false,

            tracks: trackSplits.map((splits, index) => ({
                track_index: index,
                splits: normalizeSplits(splits)
            }))
        };
    }

    // ==========================================
    // SAVE COMPLETE RELEASE DATA
    // ==========================================

    updateReleaseData({
        ...releaseData,

        // Keep each track's individual featured artists
        tracks: updatedTracks,

        // Save royalty information
        royalty_splits: finalRoyaltySplits
    });

    console.log(
        "FINAL ROYALTY SPLITS:",
        finalRoyaltySplits
    );

    console.log(
        "TRACK-SPECIFIC FEATURED ARTISTS:",
        updatedTracks.map((track, index) => ({
            track: track.name || track.title || `Track ${index + 1}`,
            featured_artists: track.featured_artists
        }))
    );

    navigate("/upload-review");
};


    // ==================================================
    // RENDER
    // ==================================================

    return (
        <div
            className="upload-studio"
        >

            {/* ==========================================
                TITLE
            ========================================== */}

            <div
                className="upload-title"
            >
                <DollarSign
                    size={42}
                />

                <div>
                    <h1>
                        Royalty Splits
                    </h1>

                    <p>
                        Decide how royalties from
                        this release will be shared.
                    </p>
                </div>
            </div>



            {/* ==========================================
                INFORMATION
            ========================================== */}

            <div
                className="upload-section"
            >
                <h2>
                    <Users
                        size={22}
                    />

                    Royalty Ownership
                </h2>

                <p>
                    Every track must have royalty
                    ownership totaling exactly{" "}
                    <strong>
                        100%
                    </strong>.
                </p>

                <p>
                    Search for existing Cave Tunes
                    users and assign their royalty
                    percentage.
                </p>
            </div>


            {/* ==========================================
                SPLIT METHOD
            ========================================== */}

            <div
                className="upload-section"
            >
                <h2>
                    Split Method
                </h2>

                <div
                    className="release-options"
                >
                    <button
                        type="button"
                        className={
                            applyToAll
                                ? "selected"
                                : ""
                        }
                        onClick={() =>
                            setApplyToAll(
                                true
                            )
                        }
                    >
                        Same Split For All Tracks
                    </button>

                    <button
                        type="button"
                        className={
                            !applyToAll
                                ? "selected"
                                : ""
                        }
                        onClick={() =>
                            setApplyToAll(
                                false
                            )
                        }
                    >
                        Individual Track Splits
                    </button>
                </div>
            </div>


            {/* ==========================================
                SHARED SPLIT
            ========================================== */}

            {applyToAll && (
                <div
                    className="upload-section"
                >
                    <div
                        className="royalty-track-header"
                    >
                        <div>
                            <h2>
                                All Tracks
                            </h2>

                            <p>
                                This royalty split will
                                be applied to every track
                                in this release.
                            </p>

                            <p>First, Refresh yourself by researching your profile account and select it, then you can 
                                proceed to add other participants and their respective royalty percentages. Make sure the total equals 100% before continuing.
                            </p>
                        </div>

                        <div
                            className={
                                isValidTotal(
                                    sharedTotal
                                )
                                    ? "royalty-total valid"
                                    : "royalty-total invalid"
                            }
                        >
                            {sharedTotal}%
                        </div>
                    </div>


                    {sharedSplits.map(
                        (
                            participant,
                            index
                        ) => (
                            <div
                                className="royalty-participant"
                                key={
                                    participant.user_id
                                        ? `shared-user-${participant.user_id}-${index}`
                                        : `shared-${index}`
                                }
                            >
                                <div
                                    className="royalty-row"
                                >
                                    <ParticipantUserPicker
                                        participant={
                                            participant
                                        }

                                        onSelect={(
                                            selectedUser
                                        ) =>
                                            selectSharedUser(
                                                index,
                                                selectedUser
                                            )
                                        }

                                        onClear={() =>
                                            clearSharedUser(
                                                index
                                            )
                                        }
                                    />

                                    <select
                                        value={
                                            participant.role ||
                                            "artist"
                                        }
                                        onChange={(event) =>
                                            updateSharedParticipant(
                                                index,
                                                "role",
                                                event.target.value
                                            )
                                        }
                                    >
                                        {ROLES.map(
                                            (role) => (
                                                <option
                                                    key={
                                                        role
                                                    }
                                                    value={
                                                        role
                                                    }
                                                >
                                                    {formatRole(
                                                        role
                                                    )}
                                                </option>
                                            )
                                        )}
                                    </select>

                                    <input
                                        type="number"
                                        min="0"
                                        max="100"
                                        step="0.01"
                                        placeholder="%"
                                        value={
                                            participant.percentage ?? ""
                                        }
                                        onChange={(event) =>
                                            updateSharedParticipant(
                                                index,
                                                "percentage",
                                                event.target.value
                                            )
                                        }
                                    />

                                    <button
                                        type="button"
                                        className="royalty-remove"
                                        onClick={() =>
                                            removeSharedParticipant(
                                                index
                                            )
                                        }
                                        disabled={
                                            sharedSplits.length <=
                                            1
                                        }
                                        title="Remove participant"
                                    >
                                        <Trash2
                                            size={18}
                                        />
                                    </button>
                                </div>
                            </div>
                        )
                    )}


                    <button
                        type="button"
                        className="royalty-add-button"
                        onClick={
                            addSharedParticipant
                        }
                    >
                        <Plus
                            size={18}
                        />

                        Add Participant
                    </button>


                    {!isValidTotal(
                        sharedTotal
                    ) && (
                        <div
                            className="royalty-warning"
                        >
                            <AlertCircle
                                size={18}
                            />

                            <span>
                                Royalty split must
                                equal exactly
                                100%.
                            </span>
                        </div>
                    )}


                    {isValidTotal(
                        sharedTotal
                    ) && (
                        <div
                            className="royalty-success"
                        >
                            <CheckCircle
                                size={18}
                            />

                            <span>
                                Royalty split
                                equals 100%.
                            </span>
                        </div>
                    )}
                </div>
            )}


            {/* ==========================================
                INDIVIDUAL TRACK SPLITS
            ========================================== */}

            {!applyToAll && (
                <>
                    {tracks.map(
                        (
                            track,
                            index
                        ) => (
                            <TrackSplitEditor
                                key={
                                    track?.id ||
                                    `track-${index}`
                                }

                                track={
                                    track
                                }

                                trackIndex={
                                    index
                                }

                                splits={
                                    trackSplits[
                                        index
                                    ] ||
                                    [
                                        {
                                            ...defaultParticipant,
                                            percentage: 100,
                                        },
                                    ]
                                }

                                onChange={(
                                    updated
                                ) =>
                                    updateTrackSplits(
                                        index,
                                        updated
                                    )
                                }
                            />
                        )
                    )}
                </>
            )}


            {/* ==========================================
                CONTINUE
            ========================================== */}

            {/* ==========================================
    CONTINUE
========================================== */}

<button
    type="button"
    className="next-button"
    onClick={continueNext}
>
    <CheckCircle size={22} />

    Continue To Review →
</button>

        </div>
    );
}


export default RoyaltySplits;