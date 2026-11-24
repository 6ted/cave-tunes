
import {
    useCallback,
    useEffect,
    useRef,
    useState,
} from "react";

import {
    ArrowLeft,
    Megaphone,
    Upload,
    Music2,
    Play,
    Pause,
    Trash2,
    Edit3,
    Power,
    RefreshCw,
    Volume2,
    Clock,
    CheckCircle2,
    XCircle,
    FileAudio,
    Headphones,
    X,
    Save,
    AlertCircle,
    Image as ImageIcon,
    Link as LinkIcon,
} from "lucide-react";

import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import "./AdminAds.css";

// ======================================================
// API CONFIGURATION
// ======================================================

const API_BASE_URL =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1"
        ? "http://localhost:5000"
        : "https://api.cavetunes.site";

const ADS_ENDPOINT = `${API_BASE_URL}/api/ads`;

// ======================================================
// API REQUEST
// ======================================================

async function adRequest(endpoint, options = {}) {
    const token =
        localStorage.getItem("token") ||
        localStorage.getItem("authToken") ||
        localStorage.getItem("accessToken");

    const headers = {
        ...(options.headers || {}),
    };

    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(
        `${ADS_ENDPOINT}${endpoint}`,
        {
            ...options,
            headers,
            credentials: "include",
        }
    );

    const contentType =
        response.headers.get("content-type") || "";

    let data = {};

    if (contentType.includes("application/json")) {
        data = await response.json();
    }

    if (!response.ok) {
        throw new Error(
            data.message ||
            `Request failed (${response.status}).`
        );
    }

    return data;
}

// ======================================================
// IMAGE URL
// ======================================================

function getImageUrl(imageUrl) {
    if (!imageUrl) return "";

    if (
        imageUrl.startsWith("http://") ||
        imageUrl.startsWith("https://")
    ) {
        return imageUrl;
    }

    return `${API_BASE_URL}${imageUrl.startsWith("/") ? "" : "/"}${imageUrl}`;
}

// ======================================================
// FORMAT HELPERS
// ======================================================

function formatDuration(seconds) {
    const duration = Number(seconds) || 0;
    const minutes = Math.floor(duration / 60);
    const remainingSeconds = Math.floor(duration % 60);

    return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
}

function formatDate(date) {
    if (!date) return "Unknown date";

    const parsed = new Date(date);

    if (Number.isNaN(parsed.getTime())) {
        return "Unknown date";
    }

    return parsed.toLocaleDateString();
}

// ======================================================
// COMPONENT
// ======================================================

function AdminAds() {
    const navigate = useNavigate();

    const {
        user,
        loading: authLoading,
    } = useAuth();

    // ==================================================
    // AUDIO ADVERTISEMENT STATE
    // ==================================================

    const [ads, setAds] = useState([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [playingAd, setPlayingAd] = useState(null);

    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [audioFile, setAudioFile] = useState(null);

    const [editingAd, setEditingAd] = useState(null);
    const [editTitle, setEditTitle] = useState("");
    const [editDescription, setEditDescription] = useState("");
    const [editPriority, setEditPriority] = useState(1);

    const audioRef = useRef(null);
    const fileInputRef = useRef(null);

    // ==================================================
    // IMAGE ADVERTISEMENT STATE
    // ==================================================

    const [imageAds, setImageAds] = useState([]);
    const [imageLoading, setImageLoading] = useState(true);
    const [imageUploading, setImageUploading] = useState(false);

    const [imageTitle, setImageTitle] = useState("");
    const [imageDescription, setImageDescription] = useState("");
    const [imageClickUrl, setImageClickUrl] = useState("");
    const [imageAltText, setImageAltText] = useState("");
    const [imagePriority, setImagePriority] = useState(1);
    const [imageFile, setImageFile] = useState(null);

    const imageFileInputRef = useRef(null);

    const [editingImageAd, setEditingImageAd] = useState(null);
    const [editImageTitle, setEditImageTitle] = useState("");
    const [editImageDescription, setEditImageDescription] = useState("");
    const [editImageClickUrl, setEditImageClickUrl] = useState("");
    const [editImageAltText, setEditImageAltText] = useState("");
    const [editImagePriority, setEditImagePriority] = useState(1);

    // ==================================================
    // SHARED STATE
    // ==================================================

    const [actionLoading, setActionLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const isAdmin =
        user?.is_admin === true ||
        user?.is_admin === "true";

    // ==================================================
    // NOTIFICATIONS
    // ==================================================

    const showSuccess = (message) => {
        setSuccess(message);
        setError("");

        setTimeout(() => {
            setSuccess("");
        }, 4000);
    };

    // ==================================================
    // LOAD AUDIO ADVERTISEMENTS
    // ==================================================

    const loadAds = useCallback(async () => {
        try {
            setError("");

            const response = await adRequest("/admin");

            setAds(
                Array.isArray(response?.ads)
                    ? response.ads
                    : []
            );
        } catch (loadError) {
            console.error(
                "LOAD AUDIO ADS ERROR:",
                loadError
            );

            setError(
                loadError.message ||
                "Unable to load audio advertisements."
            );
        } finally {
            setLoading(false);
        }
    }, []);

    // ==================================================
    // LOAD IMAGE ADVERTISEMENTS
    // ==================================================

    const loadImageAds = useCallback(async () => {
        try {
            const response = await adRequest("/images/admin");

            setImageAds(
                Array.isArray(response?.ads)
                    ? response.ads
                    : []
            );
        } catch (loadError) {
            console.error(
                "LOAD IMAGE ADS ERROR:",
                loadError
            );

            setError(
                loadError.message ||
                "Unable to load image advertisements."
            );
        } finally {
            setImageLoading(false);
        }
    }, []);

    // ==================================================
    // AUTHENTICATION
    // ==================================================

    useEffect(() => {
        if (authLoading) return;

        if (!user) {
            navigate("/login", { replace: true });
            return;
        }

        if (!isAdmin) {
            navigate("/profile", { replace: true });
            return;
        }

        const timer = setTimeout(() => {
            void loadAds();
            void loadImageAds();
        }, 0);

        return () => clearTimeout(timer);
    }, [
        authLoading,
        user,
        isAdmin,
        navigate,
        loadAds,
        loadImageAds,
    ]);

    // ==================================================
    // AUDIO FILE SELECTION
    // ==================================================

    const handleFileChange = (event) => {
        const file = event.target.files?.[0];

        if (!file) return;

        if (!file.type.startsWith("audio/")) {
            setError("Please select a valid audio file.");
            event.target.value = "";
            return;
        }

        setAudioFile(file);
        setError("");
    };

    // ==================================================
    // UPLOAD AUDIO ADVERTISEMENT
    // ==================================================

    const handleUpload = async (event) => {
        event.preventDefault();

        if (!title.trim()) {
            setError("Advertisement title is required.");
            return;
        }

        if (!audioFile) {
            setError("Please select an audio file.");
            return;
        }

        const formData = new FormData();

        formData.append("ad_audio", audioFile);
        formData.append("title", title.trim());
        formData.append("description", description.trim());

        try {
            setUploading(true);
            setError("");

            await adRequest("/admin/upload", {
                method: "POST",
                body: formData,
            });

            setTitle("");
            setDescription("");
            setAudioFile(null);

            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }

            showSuccess("Audio advertisement uploaded successfully!");

            await loadAds();
        } catch (uploadError) {
            console.error("AUDIO UPLOAD ERROR:", uploadError);

            setError(
                uploadError.message ||
                "Audio advertisement upload failed."
            );
        } finally {
            setUploading(false);
        }
    };

    // ==================================================
    // PLAY / PAUSE AUDIO ADVERTISEMENT
    // ==================================================

    const handlePlay = (ad) => {
        const audio = audioRef.current;

        if (!audio) return;

        const adId = String(ad.id);

        if (playingAd === adId) {
            audio.pause();
            setPlayingAd(null);
            return;
        }

        audio.pause();

        audio.src = `${ADS_ENDPOINT}/${ad.id}/stream`;
        audio.load();

        setPlayingAd(adId);

        audio.play().catch((playError) => {
            console.error("AUDIO PREVIEW ERROR:", playError);

            setPlayingAd(null);
            setError("Unable to play this advertisement.");
        });
    };

    const handleAudioEnded = () => {
        setPlayingAd(null);
    };

    const handleAudioError = () => {
        setPlayingAd(null);
    };

    // ==================================================
    // TOGGLE AUDIO AD STATUS
    // ==================================================

    const handleToggleStatus = async (ad) => {
        const currentlyActive =
            ad.is_active === true ||
            ad.is_active === "true";

        try {
            setActionLoading(true);
            setError("");

            await adRequest(
                `/admin/${ad.id}/status`,
                {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        is_active: !currentlyActive,
                    }),
                }
            );

            showSuccess(
                currentlyActive
                    ? "Audio advertisement deactivated."
                    : "Audio advertisement activated."
            );

            await loadAds();
        } catch (statusError) {
            setError(
                statusError.message ||
                "Unable to update audio advertisement."
            );
        } finally {
            setActionLoading(false);
        }
    };

    // ==================================================
    // EDIT AUDIO ADVERTISEMENT
    // ==================================================

    const handleEdit = (ad) => {
        setEditingAd(ad);
        setEditTitle(ad.title || "");
        setEditDescription(ad.description || "");
        setEditPriority(Number(ad.priority) || 1);
    };

    const handleSaveEdit = async (event) => {
        event.preventDefault();

        if (!editTitle.trim()) {
            setError("Advertisement title is required.");
            return;
        }

        try {
            setActionLoading(true);
            setError("");

            await adRequest(
                `/admin/${editingAd.id}`,
                {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        title: editTitle.trim(),
                        description: editDescription.trim(),
                        priority: Number(editPriority),
                    }),
                }
            );

            setEditingAd(null);

            showSuccess("Audio advertisement updated successfully.");

            await loadAds();
        } catch (editError) {
            setError(
                editError.message ||
                "Unable to update audio advertisement."
            );
        } finally {
            setActionLoading(false);
        }
    };

    // ==================================================
    // DELETE AUDIO ADVERTISEMENT
    // ==================================================

    const handleDelete = async (ad) => {
        const confirmed = window.confirm(
            `Delete "${ad.title}"? This action cannot be undone.`
        );

        if (!confirmed) return;

        try {
            setActionLoading(true);
            setError("");

            if (playingAd === String(ad.id)) {
                audioRef.current?.pause();
                setPlayingAd(null);
            }

            await adRequest(
                `/admin/${ad.id}`,
                { method: "DELETE" }
            );

            showSuccess("Audio advertisement deleted successfully.");

            await loadAds();
        } catch (deleteError) {
            setError(
                deleteError.message ||
                "Unable to delete audio advertisement."
            );
        } finally {
            setActionLoading(false);
        }
    };

    // ==================================================
    // IMAGE FILE SELECTION
    // ==================================================

    const handleImageFileChange = (event) => {
        const file = event.target.files?.[0];

        if (!file) return;

        const allowedTypes = [
            "image/jpeg",
            "image/png",
            "image/webp",
            "image/gif",
        ];

        if (!allowedTypes.includes(file.type)) {
            setError(
                "Only JPG, PNG, WEBP and GIF images are allowed."
            );

            event.target.value = "";
            return;
        }

        if (file.size > 10 * 1024 * 1024) {
            setError("Image size cannot exceed 10 MB.");
            event.target.value = "";
            return;
        }

        setImageFile(file);
        setError("");
    };

    // ==================================================
    // UPLOAD IMAGE ADVERTISEMENT
    // ==================================================

    const handleImageUpload = async (event) => {
        event.preventDefault();

        if (!imageTitle.trim()) {
            setError("Image advertisement title is required.");
            return;
        }

        if (!imageFile) {
            setError("Please select an advertisement image.");
            return;
        }

        const formData = new FormData();

        formData.append("ad_image", imageFile);
        formData.append("title", imageTitle.trim());
        formData.append("description", imageDescription.trim());
        formData.append("click_url", imageClickUrl.trim());
        formData.append("alt_text", imageAltText.trim());
        formData.append("priority", String(imagePriority));

        try {
            setImageUploading(true);
            setError("");

            await adRequest("/images/admin/upload", {
                method: "POST",
                body: formData,
            });

            setImageTitle("");
            setImageDescription("");
            setImageClickUrl("");
            setImageAltText("");
            setImagePriority(1);
            setImageFile(null);

            if (imageFileInputRef.current) {
                imageFileInputRef.current.value = "";
            }

            showSuccess(
                "Image advertisement uploaded successfully. It is currently inactive."
            );

            await loadImageAds();
        } catch (uploadError) {
            console.error("IMAGE UPLOAD ERROR:", uploadError);

            setError(
                uploadError.message ||
                "Image advertisement upload failed."
            );
        } finally {
            setImageUploading(false);
        }
    };

    // ==================================================
    // TOGGLE IMAGE ADVERTISEMENT STATUS
    // ==================================================

    const handleToggleImageStatus = async (ad) => {
        const currentlyActive =
            ad.is_active === true ||
            ad.is_active === "true";

        try {
            setActionLoading(true);
            setError("");

            await adRequest(
                `/images/admin/${ad.id}/status`,
                {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        is_active: !currentlyActive,
                    }),
                }
            );

            showSuccess(
                currentlyActive
                    ? "Image advertisement deactivated."
                    : "Image advertisement activated."
            );

            await loadImageAds();
        } catch (statusError) {
            setError(
                statusError.message ||
                "Unable to update image advertisement status."
            );
        } finally {
            setActionLoading(false);
        }
    };

    // ==================================================
    // EDIT IMAGE ADVERTISEMENT
    // ==================================================

    const handleEditImage = (ad) => {
        setEditingImageAd(ad);

        setEditImageTitle(ad.title || "");
        setEditImageDescription(ad.description || "");
        setEditImageClickUrl(ad.click_url || "");
        setEditImageAltText(ad.alt_text || "");
        setEditImagePriority(Number(ad.priority) || 1);
    };

    const handleSaveImageEdit = async (event) => {
        event.preventDefault();

        if (!editImageTitle.trim()) {
            setError("Image advertisement title is required.");
            return;
        }

        try {
            setActionLoading(true);
            setError("");

            await adRequest(
                `/images/admin/${editingImageAd.id}`,
                {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        title: editImageTitle.trim(),
                        description: editImageDescription.trim(),
                        click_url: editImageClickUrl.trim(),
                        alt_text: editImageAltText.trim(),
                        priority: Number(editImagePriority),
                    }),
                }
            );

            setEditingImageAd(null);

            showSuccess("Image advertisement updated successfully.");

            await loadImageAds();
        } catch (editError) {
            setError(
                editError.message ||
                "Unable to update image advertisement."
            );
        } finally {
            setActionLoading(false);
        }
    };

    // ==================================================
    // DELETE IMAGE ADVERTISEMENT
    // ==================================================

    const handleDeleteImage = async (ad) => {
        const confirmed = window.confirm(
            `Delete image advertisement "${ad.title}"? This cannot be undone.`
        );

        if (!confirmed) return;

        try {
            setActionLoading(true);
            setError("");

            await adRequest(
                `/images/admin/${ad.id}`,
                { method: "DELETE" }
            );

            showSuccess("Image advertisement deleted successfully.");

            await loadImageAds();
        } catch (deleteError) {
            setError(
                deleteError.message ||
                "Unable to delete image advertisement."
            );
        } finally {
            setActionLoading(false);
        }
    };

    // ==================================================
    // AUTH LOADING
    // ==================================================

    if (authLoading) {
        return (
            <main className="admin-ads-page">
                <div className="admin-ads-loading">
                    <RefreshCw
                        size={28}
                        className="admin-ads-spin"
                    />
                    Checking administrator access...
                </div>
            </main>
        );
    }

    if (!user || !isAdmin) {
        return null;
    }

    // ==================================================
    // AUDIO STATISTICS
    // ==================================================

    const totalAds = ads.length;

    const activeAds = ads.filter(
        (ad) =>
            ad.is_active === true ||
            ad.is_active === "true"
    ).length;

    const inactiveAds = totalAds - activeAds;

    const totalDuration = ads.reduce(
        (total, ad) =>
            total + Number(ad.duration_seconds || 0),
        0
    );

    // ==================================================
    // IMAGE STATISTICS
    // ==================================================

    const totalImageAds = imageAds.length;

    const activeImageAds = imageAds.filter(
        (ad) =>
            ad.is_active === true ||
            ad.is_active === "true"
    ).length;

    const inactiveImageAds =
        totalImageAds - activeImageAds;

    // ==================================================
    // PAGE
    // ==================================================

    return (
        <main className="admin-ads-page">

            <audio
                ref={audioRef}
                onEnded={handleAudioEnded}
                onError={handleAudioError}
                preload="none"
            />

            {/* ==========================================
                HEADER
            ========================================== */}

            <header className="admin-ads-header">

                <button
                    type="button"
                    className="admin-ads-back"
                    onClick={() => navigate("/admin")}
                >
                    <ArrowLeft size={19} />
                    Back to Dashboard
                </button>

                <div className="admin-ads-brand">
                    <div className="admin-ads-brand-icon">
                        <Megaphone size={23} />
                    </div>

                    <div>
                        <strong>CAVE TUNES</strong>
                        <span>Advertisement Manager</span>
                    </div>
                </div>

                <button
                    type="button"
                    className="admin-ads-refresh"
                    onClick={() => {
                        void loadAds();
                        void loadImageAds();
                    }}
                    disabled={loading || imageLoading}
                >
                    <RefreshCw
                        size={17}
                        className={
                            loading || imageLoading
                                ? "admin-ads-spin"
                                : ""
                        }
                    />
                    Refresh
                </button>

            </header>

            {/* ==========================================
                MAIN CONTENT
            ========================================== */}

            <section className="admin-ads-content">

                {/* PAGE TITLE */}

                <div className="admin-ads-heading">
                    <div>
                        <div className="admin-ads-title">
                            <Megaphone size={27} />
                            <h1>Advertisement Manager</h1>
                        </div>

                        <p>
                            Upload and manage Cave Tunes audio and image advertisements.
                        </p>
                    </div>

                    <div className="admin-ads-admin-badge">
                        <CheckCircle2 size={16} />
                        Administrator
                    </div>
                </div>

                {/* NOTIFICATIONS */}

                {error && (
                    <div className="admin-ads-alert error">
                        <AlertCircle size={18} />
                        {error}

                        <button
                            type="button"
                            onClick={() => setError("")}
                        >
                            <X size={17} />
                        </button>
                    </div>
                )}

                {success && (
                    <div className="admin-ads-alert success">
                        <CheckCircle2 size={18} />
                        {success}
                    </div>
                )}

                {/* ======================================
                    AUDIO ADVERTISEMENT STATISTICS
                ====================================== */}

                <div className="admin-ads-section-label">
                    <Music2 size={19} />
                    Audio Advertisement Statistics
                </div>

                <div className="admin-ads-stats">

                    <div className="admin-ads-stat-card">
                        <div className="admin-ads-stat-icon">
                            <Megaphone size={23} />
                        </div>

                        <div>
                            <span>Total Audio Ads</span>
                            <strong>{totalAds}</strong>
                        </div>
                    </div>

                    <div className="admin-ads-stat-card">
                        <div className="admin-ads-stat-icon active">
                            <CheckCircle2 size={23} />
                        </div>

                        <div>
                            <span>Active Audio Ads</span>
                            <strong>{activeAds}</strong>
                        </div>
                    </div>

                    <div className="admin-ads-stat-card">
                        <div className="admin-ads-stat-icon inactive">
                            <XCircle size={23} />
                        </div>

                        <div>
                            <span>Inactive Audio Ads</span>
                            <strong>{inactiveAds}</strong>
                        </div>
                    </div>

                    <div className="admin-ads-stat-card">
                        <div className="admin-ads-stat-icon duration">
                            <Clock size={23} />
                        </div>

                        <div>
                            <span>Total Audio Duration</span>
                            <strong>{formatDuration(totalDuration)}</strong>
                        </div>
                    </div>

                </div>

                {/* ======================================
                    AUDIO UPLOAD
                ====================================== */}

                <section className="admin-ads-panel">

                    <div className="admin-ads-panel-heading">
                        <div>
                            <h2>Upload Audio Advertisement</h2>
                            <p>
                                Add a new audio advertisement to Cave Tunes.
                            </p>
                        </div>

                        <Upload size={22} />
                    </div>

                    <form
                        className="admin-ads-upload-form"
                        onSubmit={handleUpload}
                    >

                        <div className="admin-ads-form-group">
                            <label htmlFor="ad-title">
                                Advertisement Title
                            </label>

                            <input
                                id="ad-title"
                                type="text"
                                placeholder="e.g. Cave Tunes Official Advertisement"
                                value={title}
                                onChange={(event) =>
                                    setTitle(event.target.value)
                                }
                                maxLength={150}
                                required
                            />
                        </div>

                        <div className="admin-ads-form-group">
                            <label htmlFor="ad-description">
                                Description
                            </label>

                            <textarea
                                id="ad-description"
                                placeholder="Enter advertisement description..."
                                value={description}
                                onChange={(event) =>
                                    setDescription(event.target.value)
                                }
                                rows={3}
                            />
                        </div>

                        <div className="admin-ads-form-group">
                            <label>Advertisement Audio</label>

                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="audio/*"
                                onChange={handleFileChange}
                                className="admin-ads-file-input"
                                required
                            />

                            <div className="admin-ads-file-info">
                                <FileAudio size={17} />

                                {audioFile
                                    ? audioFile.name
                                    : "Select an audio file"}
                            </div>
                        </div>

                        <button
                            type="submit"
                            className="admin-ads-upload-button"
                            disabled={uploading}
                        >
                            {uploading ? (
                                <>
                                    <RefreshCw
                                        size={18}
                                        className="admin-ads-spin"
                                    />
                                    Uploading Audio...
                                </>
                            ) : (
                                <>
                                    <Upload size={18} />
                                    Upload Audio Advertisement
                                </>
                            )}
                        </button>

                    </form>

                </section>

                {/* ======================================
                    AUDIO ADVERTISEMENT LIST
                ====================================== */}

                <section className="admin-ads-panel">

                    <div className="admin-ads-panel-heading">
                        <div>
                            <h2>Your Audio Advertisements</h2>
                            <p>
                                Manage your uploaded audio advertisements.
                            </p>
                        </div>

                        <Headphones size={22} />
                    </div>

                    {loading ? (
                        <div className="admin-ads-loading">
                            <RefreshCw
                                size={25}
                                className="admin-ads-spin"
                            />
                            Loading audio advertisements...
                        </div>
                    ) : ads.length === 0 ? (
                        <div className="admin-ads-empty">
                            <Megaphone size={42} />
                            <h3>No Audio Advertisements Yet</h3>
                            <p>
                                Upload your first audio advertisement to get started.
                            </p>
                        </div>
                    ) : (
                        <div className="admin-ads-list">

                            {ads.map((ad) => {
                                const isActive =
                                    ad.is_active === true ||
                                    ad.is_active === "true";

                                const isPlaying =
                                    playingAd === String(ad.id);

                                return (
                                    <article
                                        className="admin-ads-item"
                                        key={ad.id}
                                    >

                                        <div className="admin-ads-item-icon">
                                            <Music2 size={25} />
                                        </div>

                                        <div className="admin-ads-item-info">

                                            <div className="admin-ads-item-title">
                                                <h3>
                                                    {ad.title || "Untitled Advertisement"}
                                                </h3>

                                                <span
                                                    className={
                                                        isActive
                                                            ? "admin-ads-status active"
                                                            : "admin-ads-status inactive"
                                                    }
                                                >
                                                    {isActive ? "Active" : "Inactive"}
                                                </span>
                                            </div>

                                            <p>
                                                {ad.description ||
                                                    "No description provided."}
                                            </p>

                                            <div className="admin-ads-item-meta">
                                                <span>
                                                    <Clock size={14} />
                                                    {formatDuration(ad.duration_seconds)}
                                                </span>

                                                <span>
                                                    Priority: {ad.priority ?? 1}
                                                </span>

                                                <span>
                                                    {formatDate(ad.created_at)}
                                                </span>
                                            </div>

                                        </div>

                                        <div className="admin-ads-item-actions">

                                            <button
                                                type="button"
                                                className="admin-ads-play"
                                                onClick={() => handlePlay(ad)}
                                                title={isPlaying ? "Pause preview" : "Play preview"}
                                            >
                                                {isPlaying ? (
                                                    <Pause size={18} />
                                                ) : (
                                                    <Play size={18} />
                                                )}
                                            </button>

                                            <button
                                                type="button"
                                                className={
                                                    isActive
                                                        ? "admin-ads-toggle deactivate"
                                                        : "admin-ads-toggle activate"
                                                }
                                                onClick={() => handleToggleStatus(ad)}
                                                disabled={actionLoading}
                                                title={isActive ? "Deactivate" : "Activate"}
                                            >
                                                <Power size={17} />
                                            </button>

                                            <button
                                                type="button"
                                                className="admin-ads-edit"
                                                onClick={() => handleEdit(ad)}
                                                disabled={actionLoading}
                                                title="Edit advertisement"
                                            >
                                                <Edit3 size={17} />
                                            </button>

                                            <button
                                                type="button"
                                                className="admin-ads-delete"
                                                onClick={() => handleDelete(ad)}
                                                disabled={actionLoading}
                                                title="Delete advertisement"
                                            >
                                                <Trash2 size={17} />
                                            </button>

                                        </div>

                                    </article>
                                );
                            })}

                        </div>
                    )}

                </section>

                {/* ======================================
                    IMAGE ADVERTISEMENT STATISTICS
                ====================================== */}

                <div className="admin-ads-section-label image">
                    <ImageIcon size={19} />
                    Image Advertisement Statistics
                </div>

                <div className="admin-ads-stats">

                    <div className="admin-ads-stat-card">
                        <div className="admin-ads-stat-icon">
                            <ImageIcon size={23} />
                        </div>

                        <div>
                            <span>Total Image Ads</span>
                            <strong>{totalImageAds}</strong>
                        </div>
                    </div>

                    <div className="admin-ads-stat-card">
                        <div className="admin-ads-stat-icon active">
                            <CheckCircle2 size={23} />
                        </div>

                        <div>
                            <span>Active Image Ads</span>
                            <strong>{activeImageAds}</strong>
                        </div>
                    </div>

                    <div className="admin-ads-stat-card">
                        <div className="admin-ads-stat-icon inactive">
                            <XCircle size={23} />
                        </div>

                        <div>
                            <span>Inactive Image Ads</span>
                            <strong>{inactiveImageAds}</strong>
                        </div>
                    </div>

                </div>

                {/* ======================================
                    IMAGE ADVERTISEMENT UPLOAD
                ====================================== */}

                <section className="admin-ads-panel image-ads-panel">

                    <div className="admin-ads-panel-heading">
                        <div>
                            <h2>Upload Image Advertisement</h2>
                            <p>
                                Upload promotional banners and image advertisements for the Home page.
                            </p>
                        </div>

                        <ImageIcon size={23} />
                    </div>

                    <form
                        className="admin-ads-upload-form"
                        onSubmit={handleImageUpload}
                    >

                        <div className="admin-ads-form-group">
                            <label htmlFor="image-ad-title">
                                Advertisement Title
                            </label>

                            <input
                                id="image-ad-title"
                                type="text"
                                placeholder="e.g. Cave Tunes Premium"
                                value={imageTitle}
                                onChange={(event) =>
                                    setImageTitle(event.target.value)
                                }
                                maxLength={255}
                                required
                            />
                        </div>

                        <div className="admin-ads-form-group">
                            <label htmlFor="image-ad-description">
                                Description
                            </label>

                            <textarea
                                id="image-ad-description"
                                placeholder="Describe this image advertisement..."
                                value={imageDescription}
                                onChange={(event) =>
                                    setImageDescription(event.target.value)
                                }
                                rows={3}
                            />
                        </div>

                        <div className="admin-ads-form-group">
                            <label htmlFor="image-ad-click-url">
                                Destination Link (Optional)
                            </label>

                            <input
                                id="image-ad-click-url"
                                type="url"
                                placeholder="https://example.com"
                                value={imageClickUrl}
                                onChange={(event) =>
                                    setImageClickUrl(event.target.value)
                                }
                            />
                        </div>

                        <div className="admin-ads-form-group">
                            <label htmlFor="image-ad-alt">
                                Image Description (Accessibility)
                            </label>

                            <input
                                id="image-ad-alt"
                                type="text"
                                placeholder="Describe what appears in the image"
                                value={imageAltText}
                                onChange={(event) =>
                                    setImageAltText(event.target.value)
                                }
                                maxLength={255}
                            />
                        </div>

                        <div className="admin-ads-form-group">
                            <label htmlFor="image-ad-priority">
                                Display Priority
                            </label>

                            <input
                                id="image-ad-priority"
                                type="number"
                                min="1"
                                value={imagePriority}
                                onChange={(event) =>
                                    setImagePriority(event.target.value)
                                }
                                required
                            />

                            <small>
                                Lower numbers appear first.
                            </small>
                        </div>

                        <div className="admin-ads-form-group">
                            <label>Advertisement Image</label>

                            <input
                                ref={imageFileInputRef}
                                type="file"
                                accept="image/jpeg,image/png,image/webp,image/gif"
                                onChange={handleImageFileChange}
                                className="admin-ads-file-input"
                                required
                            />

                            <div className="admin-ads-file-info">
                                <ImageIcon size={17} />

                                {imageFile
                                    ? imageFile.name
                                    : "Select JPG, PNG, WEBP or GIF (maximum 10 MB)"}
                            </div>
                        </div>

                        {imageFile && (
                            <div className="admin-image-upload-preview">
                                <img
                                    src={URL.createObjectURL(imageFile)}
                                    alt="Selected advertisement preview"
                                />
                            </div>
                        )}

                        <button
                            type="submit"
                            className="admin-ads-upload-button"
                            disabled={imageUploading}
                        >
                            {imageUploading ? (
                                <>
                                    <RefreshCw
                                        size={18}
                                        className="admin-ads-spin"
                                    />
                                    Uploading Image...
                                </>
                            ) : (
                                <>
                                    <Upload size={18} />
                                    Upload Image Advertisement
                                </>
                            )}
                        </button>

                        <p className="admin-image-upload-note">
                            New image advertisements are uploaded as inactive.
                            Activate them when you are ready to display them on Home.
                        </p>

                    </form>

                </section>

                {/* ======================================
                    IMAGE ADVERTISEMENT LIST
                ====================================== */}

                <section className="admin-ads-panel image-ads-panel">

                    <div className="admin-ads-panel-heading">
                        <div>
                            <h2>Your Image Advertisements</h2>
                            <p>
                                Manage the promotional images displayed on the Home page.
                            </p>
                        </div>

                        <ImageIcon size={23} />
                    </div>

                    {imageLoading ? (
                        <div className="admin-ads-loading">
                            <RefreshCw
                                size={25}
                                className="admin-ads-spin"
                            />
                            Loading image advertisements...
                        </div>
                    ) : imageAds.length === 0 ? (
                        <div className="admin-ads-empty">
                            <ImageIcon size={42} />
                            <h3>No Image Advertisements Yet</h3>
                            <p>
                                Upload your first image advertisement to get started.
                            </p>
                        </div>
                    ) : (
                        <div className="admin-image-ads-list">

                            {imageAds.map((ad) => {
                                const isActive =
                                    ad.is_active === true ||
                                    ad.is_active === "true";

                                return (
                                    <article
                                        className="admin-image-ad-item"
                                        key={ad.id}
                                    >

                                        <div className="admin-image-ad-preview">
                                            <img
                                                src={getImageUrl(ad.image_url)}
                                                alt={ad.alt_text || ad.title}
                                                loading="lazy"
                                            />
                                        </div>

                                        <div className="admin-image-ad-info">

                                            <div className="admin-ads-item-title">
                                                <h3>
                                                    {ad.title || "Untitled Image Advertisement"}
                                                </h3>

                                                <span
                                                    className={
                                                        isActive
                                                            ? "admin-ads-status active"
                                                            : "admin-ads-status inactive"
                                                    }
                                                >
                                                    {isActive ? "Active" : "Inactive"}
                                                </span>
                                            </div>

                                            <p>
                                                {ad.description ||
                                                    "No description provided."}
                                            </p>

                                            {ad.click_url && (
                                                <div className="admin-image-ad-link">
                                                    <LinkIcon size={14} />
                                                    <span>{ad.click_url}</span>
                                                </div>
                                            )}

                                            <div className="admin-ads-item-meta">
                                                <span>
                                                    Priority: {ad.priority ?? 1}
                                                </span>

                                                <span>
                                                    {formatDate(ad.created_at)}
                                                </span>
                                            </div>

                                        </div>

                                        <div className="admin-ads-item-actions">

                                            <button
                                                type="button"
                                                className={
                                                    isActive
                                                        ? "admin-ads-toggle deactivate"
                                                        : "admin-ads-toggle activate"
                                                }
                                                onClick={() =>
                                                    handleToggleImageStatus(ad)
                                                }
                                                disabled={actionLoading}
                                                title={isActive ? "Deactivate" : "Activate"}
                                            >
                                                <Power size={17} />
                                            </button>

                                            <button
                                                type="button"
                                                className="admin-ads-edit"
                                                onClick={() =>
                                                    handleEditImage(ad)
                                                }
                                                disabled={actionLoading}
                                                title="Edit image advertisement"
                                            >
                                                <Edit3 size={17} />
                                            </button>

                                            <button
                                                type="button"
                                                className="admin-ads-delete"
                                                onClick={() =>
                                                    handleDeleteImage(ad)
                                                }
                                                disabled={actionLoading}
                                                title="Delete image advertisement"
                                            >
                                                <Trash2 size={17} />
                                            </button>

                                        </div>

                                    </article>
                                );
                            })}

                        </div>
                    )}

                </section>

                {/* FOOTER */}

                <footer className="admin-ads-footer">
                    <Volume2 size={17} />
                    Cave Tunes Advertisement Management
                </footer>

            </section>

            {/* ==========================================
                EDIT AUDIO ADVERTISEMENT MODAL
            ========================================== */}

            {editingAd && (
                <div
                    className="admin-ads-modal-overlay"
                    onClick={(event) => {
                        if (
                            event.target === event.currentTarget &&
                            !actionLoading
                        ) {
                            setEditingAd(null);
                        }
                    }}
                >

                    <div className="admin-ads-modal">

                        <div className="admin-ads-modal-header">
                            <div>
                                <h2>Edit Audio Advertisement</h2>
                                <p>Update advertisement information.</p>
                            </div>

                            <button
                                type="button"
                                onClick={() => setEditingAd(null)}
                                disabled={actionLoading}
                            >
                                <X size={21} />
                            </button>
                        </div>

                        <form onSubmit={handleSaveEdit}>

                            <div className="admin-ads-form-group">
                                <label>Advertisement Title</label>

                                <input
                                    type="text"
                                    value={editTitle}
                                    onChange={(event) =>
                                        setEditTitle(event.target.value)
                                    }
                                    maxLength={150}
                                    required
                                />
                            </div>

                            <div className="admin-ads-form-group">
                                <label>Description</label>

                                <textarea
                                    value={editDescription}
                                    onChange={(event) =>
                                        setEditDescription(event.target.value)
                                    }
                                    rows={4}
                                />
                            </div>

                            <div className="admin-ads-form-group">
                                <label>Priority</label>

                                <input
                                    type="number"
                                    min="1"
                                    value={editPriority}
                                    onChange={(event) =>
                                        setEditPriority(event.target.value)
                                    }
                                />
                            </div>

                            <div className="admin-ads-modal-actions">
                                <button
                                    type="button"
                                    className="admin-ads-cancel"
                                    onClick={() => setEditingAd(null)}
                                    disabled={actionLoading}
                                >
                                    Cancel
                                </button>

                                <button
                                    type="submit"
                                    className="admin-ads-save"
                                    disabled={actionLoading}
                                >
                                    {actionLoading ? (
                                        <RefreshCw
                                            size={17}
                                            className="admin-ads-spin"
                                        />
                                    ) : (
                                        <Save size={17} />
                                    )}

                                    Save Changes
                                </button>
                            </div>

                        </form>

                    </div>

                </div>
            )}

            {/* ==========================================
                EDIT IMAGE ADVERTISEMENT MODAL
            ========================================== */}

            {editingImageAd && (
                <div
                    className="admin-ads-modal-overlay"
                    onClick={(event) => {
                        if (
                            event.target === event.currentTarget &&
                            !actionLoading
                        ) {
                            setEditingImageAd(null);
                        }
                    }}
                >

                    <div className="admin-ads-modal">

                        <div className="admin-ads-modal-header">
                            <div>
                                <h2>Edit Image Advertisement</h2>
                                <p>Update image advertisement information.</p>
                            </div>

                            <button
                                type="button"
                                onClick={() => setEditingImageAd(null)}
                                disabled={actionLoading}
                            >
                                <X size={21} />
                            </button>
                        </div>

                        <form onSubmit={handleSaveImageEdit}>

                            <div className="admin-ads-form-group">
                                <label>Advertisement Title</label>

                                <input
                                    type="text"
                                    value={editImageTitle}
                                    onChange={(event) =>
                                        setEditImageTitle(event.target.value)
                                    }
                                    maxLength={255}
                                    required
                                />
                            </div>

                            <div className="admin-ads-form-group">
                                <label>Description</label>

                                <textarea
                                    value={editImageDescription}
                                    onChange={(event) =>
                                        setEditImageDescription(event.target.value)
                                    }
                                    rows={3}
                                />
                            </div>

                            <div className="admin-ads-form-group">
                                <label>Destination Link</label>

                                <input
                                    type="url"
                                    value={editImageClickUrl}
                                    onChange={(event) =>
                                        setEditImageClickUrl(event.target.value)
                                    }
                                    placeholder="https://example.com"
                                />
                            </div>

                            <div className="admin-ads-form-group">
                                <label>Image Description</label>

                                <input
                                    type="text"
                                    value={editImageAltText}
                                    onChange={(event) =>
                                        setEditImageAltText(event.target.value)
                                    }
                                    maxLength={255}
                                />
                            </div>

                            <div className="admin-ads-form-group">
                                <label>Priority</label>

                                <input
                                    type="number"
                                    min="1"
                                    value={editImagePriority}
                                    onChange={(event) =>
                                        setEditImagePriority(event.target.value)
                                    }
                                    required
                                />
                            </div>

                            <div className="admin-image-edit-preview">
                                <img
                                    src={getImageUrl(editingImageAd.image_url)}
                                    alt={editingImageAd.alt_text || editingImageAd.title}
                                />
                            </div>

                            <div className="admin-ads-modal-actions">
                                <button
                                    type="button"
                                    className="admin-ads-cancel"
                                    onClick={() => setEditingImageAd(null)}
                                    disabled={actionLoading}
                                >
                                    Cancel
                                </button>

                                <button
                                    type="submit"
                                    className="admin-ads-save"
                                    disabled={actionLoading}
                                >
                                    {actionLoading ? (
                                        <RefreshCw
                                            size={17}
                                            className="admin-ads-spin"
                                        />
                                    ) : (
                                        <Save size={17} />
                                    )}

                                    Save Changes
                                </button>
                            </div>

                        </form>

                    </div>

                </div>
            )}

        </main>
    );
}

export default AdminAds;
