
import {
    useCallback,
    useEffect,
    useRef,
    useState,
} from "react";

import {
    Image,
    Send,
    Heart,
    MessageCircle,
    Repeat2,
    MoreHorizontal,
    X,
    Loader2,
    RefreshCw,
    UserRound,
    Reply,
      Sun,
    Moon,
} from "lucide-react";



import { useNavigate } from "react-router-dom";

import { useAuth } from "../context/useAuth";

import "./Feed.css";

// ======================================================
// API CONFIGURATION
// ======================================================

const API_BASE_URL =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1"
        ? "http://localhost:5000"
        : "https://api.cavetunes.site";

// ======================================================
// AUTH TOKEN
// ======================================================

function getToken() {
    return localStorage.getItem("token") || "";
}

// ======================================================
// API REQUEST
// ======================================================

async function feedRequest(url, options = {}) {
    const token = getToken();

    const headers = {
        ...(options.headers || {}),
    };

    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    if (!(options.body instanceof FormData) && options.body) {
        headers["Content-Type"] = "application/json";
    }

    const response = await fetch(`${API_BASE_URL}${url}`, {
        ...options,
        headers,
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.message || "Something went wrong.");
    }

    return data;
}

// ======================================================
// MEDIA URL
// ======================================================

function getMediaUrl(url) {
    if (!url) return "";

    if (
        url.startsWith("http://") ||
        url.startsWith("https://")
    ) {
        return url;
    }

    return `${API_BASE_URL}${url.startsWith("/") ? "" : "/"}${url}`;
}

// ======================================================
// DATE FORMAT
// ======================================================

function formatDate(date) {
    if (!date) return "";

    const value = new Date(date);

    if (Number.isNaN(value.getTime())) {
        return "";
    }

    return value.toLocaleString();
}

// ======================================================
// BUILD COMMENT TREE
// ======================================================

function buildCommentTree(rows = []) {
    const commentMap = new Map();

    rows.forEach(comment => {
        commentMap.set(String(comment.id), {
            ...comment,
            replies: [],
        });
    });

    const roots = [];

    commentMap.forEach(comment => {
        const parentId = comment.parent_comment_id;

        const parent = parentId
            ? commentMap.get(String(parentId))
            : null;

        if (parent) {
            parent.replies.push(comment);
        } else {
            roots.push(comment);
        }
    });

    return roots;
}

// ======================================================
// MAIN FEED COMPONENT
// ======================================================

export default function Feed() {
    const { user } = useAuth();

    const navigate = useNavigate();

    const fileInputRef = useRef(null);

    // ==================================================
    // PROFILE NAVIGATION
    // ==================================================

    function openUserProfile(userId, role) {
        if (!userId || !role) {
            return;
        }

        navigate(`/creator/${role}/${userId}`);
    }

    // --------------------------------------------------
    // POST STATE
    // --------------------------------------------------

    const [posts, setPosts] = useState([]);

    const [content, setContent] = useState("");

    const [linkUrl, setLinkUrl] = useState("");

    const [selectedImages, setSelectedImages] = useState([]);

    const [loading, setLoading] = useState(true);

    const [publishing, setPublishing] = useState(false);

    const [screenLoading, setScreenLoading] = useState("");


// ======================================================
// PRIVATE ACCOUNT THEME PREFERENCE
// ======================================================

const [themePreference, setThemePreference] = useState({
    userId: null,
    value: "dark"
});

const [savingTheme, setSavingTheme] = useState(false);

const currentUserId = user?.id
    ? String(user.id)
    : null;

// Only use a preference belonging to the current account.
const theme =
    currentUserId &&
    themePreference.userId === currentUserId
        ? themePreference.value
        : "dark";

// ======================================================
// LOAD ACCOUNT THEME
// ======================================================

useEffect(() => {
    if (!currentUserId) return;

    let cancelled = false;

    async function loadThemePreference() {
        try {
            const data = await feedRequest(
                "/api/settings/preferences"
            );

            if (!cancelled) {
                setThemePreference({
                    userId: currentUserId,
                    value:
                        data.theme_preference === "light"
                            ? "light"
                            : "dark"
                });
            }

        } catch (error) {
            console.error(
                "THEME PREFERENCE ERROR:",
                error
            );

        }
    }

    loadThemePreference();

    return () => {
        cancelled = true;
    };

}, [currentUserId]);

// ======================================================
// SAVE ACCOUNT THEME
// ======================================================

async function toggleTheme() {
    if (!currentUserId || savingTheme) {
        if (!currentUserId) {
            setError("Please log in to change your theme.");
        }

        return;
    }

    const nextTheme =
        theme === "dark" ? "light" : "dark";

    try {
        setSavingTheme(true);

        const data = await feedRequest(
            "/api/settings/preferences",
            {
                method: "PUT",
                body: JSON.stringify({
                    theme_preference: nextTheme
                })
            }
        );

        setThemePreference({
            userId: currentUserId,
            value: data.theme_preference
        });

    } catch (error) {
        setError(error.message);

    } finally {
        setSavingTheme(false);
    }
}


function VerifiedBadge({ creator }) {
    const isMaster =
        creator?.verification_level === "master" ||
        (
            Boolean(creator?.verified) &&
            Boolean(creator?.monetized)
        );

    const isVerified =
        creator?.verification_level === "verified" ||
        Boolean(creator?.verified);

    if (!isVerified) return null;

    const badgeTitle = isMaster
        ? "Master Verified by Cave Tunes"
        : "Verified by Cave Tunes";

    return (
        <span
            className={`creator-verification-badge ${
                isMaster ? "master" : "verified"
            }`}
            title={badgeTitle}
            aria-label={badgeTitle}
        >
            <svg
                viewBox="0 0 24 24"
                width="20"
                height="20"
                fill="none"
            >
                <path
                    d="M12 2L14.7 4.1L18 4.3L19.7 7L22 9L21 12L22 15L19.7 17L18 19.7L14.7 19.9L12 22L9.3 19.9L6 19.7L4.3 17L3 12L2 9L4.3 7L6 4.3L9.3 4.1L12 2Z"
                    fill={isMaster ? "#21aa2c" : "#bbb29b"}
                />
                <path
                    d="M8 12.2L10.5 14.5L16 9"
                    stroke="white"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            </svg>
        </span>
    );
}


    // IMAGE VIEWER STATE

    const [imageViewer, setImageViewer] = useState({
        images: [],
        currentIndex: 0,
    });

    const [error, setError] = useState("");

    const [activeMenu, setActiveMenu] = useState(null);

    // --------------------------------------------------
    // COMMENT STATE
    // --------------------------------------------------

    const [expandedComments, setExpandedComments] = useState({});

    const [comments, setComments] = useState({});

    const [commentInputs, setCommentInputs] = useState({});

    const [loadingComments, setLoadingComments] = useState({});

    const [replyInputs, setReplyInputs] = useState({});

    const [replyingTo, setReplyingTo] = useState({});

    // ==================================================
    // FETCH POSTS
    // ==================================================

    const fetchPosts = useCallback(async () => {
        try {
            setError("");

            const data = await feedRequest(
                "/api/feed?limit=20&offset=0"
            );

            setPosts(data.posts || []);

        } catch (err) {
            console.error("FEED FETCH ERROR:", err);
            setError(err.message);

        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
    let cancelled = false;

    async function loadFeed() {
        try {
            setError("");

            const data = await feedRequest(
                "/api/feed?limit=20&offset=0"
            );

            if (!cancelled) {
                setPosts(data.posts || []);
            }

        } catch (err) {
            if (!cancelled) {
                console.error("FEED FETCH ERROR:", err);
                setError(err.message);
            }

        } finally {
            if (!cancelled) {
                setLoading(false);
            }
        }
    }

    loadFeed();

    return () => {
        cancelled = true;
    };
}, []);

    // ==================================================
    // SELECT IMAGES
    // ==================================================

    function handleImageSelect(event) {
        const files = Array.from(event.target.files || []);

        if (files.length + selectedImages.length > 10) {
            setError("You can upload a maximum of 10 images.");
            event.target.value = "";
            return;
        }

        const validFiles = [];

        for (const file of files) {
            if (!file.type.startsWith("image/")) {
                setError("Please select image files only.");
                continue;
            }

            if (file.size > 10 * 1024 * 1024) {
                setError(`${file.name} exceeds the 10 MB limit.`);
                continue;
            }

            validFiles.push({
                file,
                preview: URL.createObjectURL(file),
            });
        }

        setSelectedImages(previous => [
            ...previous,
            ...validFiles,
        ]);

        event.target.value = "";
    }

    // ==================================================
    // REMOVE SELECTED IMAGE
    // ==================================================

    function removeSelectedImage(index) {
        setSelectedImages(previous => {
            const updated = [...previous];

            URL.revokeObjectURL(updated[index].preview);

            updated.splice(index, 1);

            return updated;
        });
    }

    // ==================================================
    // CREATE POST
    // ==================================================

    async function createPost(event) {
        event.preventDefault();

        if (
            !content.trim() &&
            !linkUrl.trim() &&
            !selectedImages.length
        ) {
            setError("Write something or attach an image.");
            return;
        }

        try {
            setPublishing(true);

            setScreenLoading("Publishing your post...");

            setError("");

            const formData = new FormData();

            formData.append(
                "client_created_at",
                new Date().toISOString()
            );

            formData.append("content", content.trim());

            formData.append("link_url", linkUrl.trim());

            selectedImages.forEach(image => {
                formData.append("feed_images", image.file);
            });

            const data = await feedRequest(
                "/api/feed/posts",
                {
                    method: "POST",
                    body: formData,
                }
            );

            if (data.success) {
                selectedImages.forEach(image => {
                    URL.revokeObjectURL(image.preview);
                });

                setContent("");

                setLinkUrl("");

                setSelectedImages([]);

                await fetchPosts();
            }

        } catch (err) {
            console.error("CREATE POST ERROR:", err);

            setError(err.message);

        } finally {
            setPublishing(false);

            setScreenLoading("");
        }
    }

    // ==================================================
    // LIKE / UNLIKE POST
    // ==================================================

    async function toggleLike(postId) {
        if (!getToken()) {
            setError("Please log in to like posts.");
            return;
        }

        try {
            const data = await feedRequest(
                `/api/feed/posts/${postId}/like`,
                {
                    method: "POST",
                }
            );

            setPosts(previous =>
                previous.map(post =>
                    String(post.id) === String(postId)
                        ? {
                            ...post,
                            is_liked: data.liked,
                            likes_count: data.likes_count,
                        }
                        : post
                )
            );

        } catch (err) {
            setError(err.message);
        }
    }

    // ==================================================
    // LOAD COMMENTS
    // ==================================================

    async function loadComments(postId) {
        setLoadingComments(previous => ({
            ...previous,
            [postId]: true,
        }));

        try {
            const data = await feedRequest(
                `/api/feed/posts/${postId}/comments`
            );

            setComments(previous => ({
                ...previous,
                [postId]: data.comments || [],
            }));

        } catch (err) {
            setError(err.message);

        } finally {
            setLoadingComments(previous => ({
                ...previous,
                [postId]: false,
            }));
        }
    }

    // ==================================================
    // TOGGLE COMMENTS
    // ==================================================

    async function toggleComments(postId) {
        const isExpanded = expandedComments[postId];

        setExpandedComments(previous => ({
            ...previous,
            [postId]: !isExpanded,
        }));

        if (!isExpanded && !comments[postId]) {
            await loadComments(postId);
        }
    }

    // ==================================================
    // ADD COMMENT
    // ==================================================

    async function addComment(postId) {
        if (!getToken()) {
            setError("Please log in to comment.");
            return;
        }

        const text = commentInputs[postId]?.trim();

        if (!text) return;

        try {
            await feedRequest(
                `/api/feed/posts/${postId}/comments`,
                {
                    method: "POST",
                    body: JSON.stringify({
                        content: text,
                    }),
                }
            );

            setCommentInputs(previous => ({
                ...previous,
                [postId]: "",
            }));

            await loadComments(postId);

            setPosts(previous =>
                previous.map(post =>
                    String(post.id) === String(postId)
                        ? {
                            ...post,
                            comments_count:
                                Number(post.comments_count || 0) + 1,
                        }
                        : post
                )
            );

        } catch (err) {
            setError(err.message);
        }
    }

    // ==================================================
    // LIKE / UNLIKE COMMENT OR REPLY
    // ==================================================

    async function toggleCommentLike(commentId, postId) {
        if (!getToken()) {
            setError("Please log in to like comments.");
            return;
        }

        try {
            const data = await feedRequest(
                `/api/feed/comments/${commentId}/like`,
                {
                    method: "POST",
                }
            );

            setComments(previous => ({
                ...previous,
                [postId]: (previous[postId] || []).map(comment =>
                    String(comment.id) === String(commentId)
                        ? {
                            ...comment,
                            is_liked: data.liked,
                            likes_count: data.likes_count,
                        }
                        : comment
                ),
            }));

        } catch (err) {
            setError(err.message);
        }
    }

    // ==================================================
    // ADD REPLY
    // ==================================================

    async function addReply(postId, parentCommentId) {
        if (!getToken()) {
            setError("Please log in to reply.");
            return;
        }

        const text = replyInputs[parentCommentId]?.trim();

        if (!text) return;

        try {
            await feedRequest(
                `/api/feed/posts/${postId}/replies`,
                {
                    method: "POST",
                    body: JSON.stringify({
                        parent_comment_id: parentCommentId,
                        content: text,
                    }),
                }
            );

            setReplyInputs(previous => ({
                ...previous,
                [parentCommentId]: "",
            }));

            setReplyingTo(previous => ({
                ...previous,
                [parentCommentId]: false,
            }));

            await loadComments(postId);

            setPosts(previous =>
                previous.map(post =>
                    String(post.id) === String(postId)
                        ? {
                            ...post,
                            comments_count:
                                Number(post.comments_count || 0) + 1,
                        }
                        : post
                )
            );

        } catch (err) {
            setError(err.message);
        }
    }

    // ==================================================
    // RESHARE POST
    // ==================================================

    async function resharePost(postId) {
        if (!getToken()) {
            setError("Please log in to reshare posts.");
            return;
        }

        try {
            const data = await feedRequest(
                `/api/feed/posts/${postId}/reshare`,
                {
                    method: "POST",
                    body: JSON.stringify({
                        share_text: "",
                    }),
                }
            );

            await fetchPosts();

            if (data.reshared) {
                setError("");
            }

        } catch (err) {
            setError(err.message);
        }
    }

    // ==================================================
    // DELETE POST
    // ==================================================

    async function deletePost(postId) {
        const confirmed = window.confirm(
            "Are you sure you want to delete this post?"
        );

        if (!confirmed) return;

        try {
            setScreenLoading("Deleting your post...");

            setError("");

            await feedRequest(
                `/api/feed/posts/${postId}`,
                {
                    method: "DELETE",
                }
            );

            setPosts(previous =>
                previous.filter(post =>
                    String(post.id) !== String(postId)
                )
            );

            setActiveMenu(null);

        } catch (err) {
            setError(err.message);

        } finally {
            setScreenLoading("");
        }
    }

    // ==================================================
    // IMAGE VIEWER
    // ==================================================

    function openImageViewer(images, index) {
        setImageViewer({
            images,
            currentIndex: index,
        });
    }

    function closeImageViewer() {
        setImageViewer({
            images: [],
            currentIndex: 0,
        });
    }

    function showPreviousImage(event) {
        event?.stopPropagation();

        setImageViewer(previous => ({
            ...previous,
            currentIndex:
                (previous.currentIndex - 1 + previous.images.length) %
                previous.images.length,
        }));
    }

    function showNextImage(event) {
        event?.stopPropagation();

        setImageViewer(previous => ({
            ...previous,
            currentIndex:
                (previous.currentIndex + 1) %
                previous.images.length,
        }));
    }

    // ==================================================
    // IMAGE VIEWER KEYBOARD CONTROLS
    // ==================================================

    useEffect(() => {
        if (!imageViewer.images.length) return;

        function handleKeyDown(event) {
            if (event.key === "Escape") {
                closeImageViewer();
            }

            if (event.key === "ArrowLeft") {
                showPreviousImage();
            }

            if (event.key === "ArrowRight") {
                showNextImage();
            }
        }

        document.addEventListener("keydown", handleKeyDown);

        const previousOverflow = document.body.style.overflow;

        document.body.style.overflow = "hidden";

        return () => {
            document.removeEventListener("keydown", handleKeyDown);

            document.body.style.overflow = previousOverflow;
        };
    }, [imageViewer.images.length]);

    // ==================================================
    // RENDER COMMENT AND REPLIES
    // ==================================================

    function renderComment(comment, postId, depth = 0) {
        return (
            <div
                className="ct-comment-thread"
                key={comment.id}
                style={{
                    marginLeft: depth > 0 ? "22px" : "0",
                }}
            >
                <div className="ct-comment">

                    {/* COMMENT PROFILE IMAGE */}

                    <div
                        className="ct-comment-avatar ct-profile-clickable"
                        onClick={() =>
                            openUserProfile(
                                comment.user_id,
                                comment.role
                            )
                        }
                        title="View profile"
                    >
                        {comment.profile_image_url ||
                        comment.profile_image ? (
                            <img
                                src={getMediaUrl(
                                    comment.profile_image_url ||
                                    comment.profile_image
                                )}
                                alt=""
                            />
                        ) : (
                            <UserRound size={17} />
                        )}
                    </div>

                    <div className="ct-comment-body">

                        {/* COMMENT USERNAME */}

                        <strong
                            className="ct-profile-clickable"
                            onClick={() =>
                                openUserProfile(
                                    comment.user_id,
                                    comment.role
                                )
                            }
                            title="View profile"
                        >
                            {comment.username || "Cave Tunes User"}
<VerifiedBadge creator={comment} />
                        </strong>

                        <p>{comment.content}</p>

                        <div className="ct-comment-actions">

                            <button
                                type="button"
                                className={
                                    comment.is_liked
                                        ? "ct-action-liked"
                                        : ""
                                }
                                onClick={() =>
                                    toggleCommentLike(
                                        comment.id,
                                        postId
                                    )
                                }
                            >
                                <Heart
                                    size={14}
                                    fill={
                                        comment.is_liked
                                            ? "currentColor"
                                            : "none"
                                    }
                                />

                                {Number(comment.likes_count || 0)}
                            </button>

                            <button
                                type="button"
                                onClick={() =>
                                    setReplyingTo(previous => ({
                                        ...previous,
                                        [comment.id]:
                                            !previous[comment.id],
                                    }))
                                }
                            >
                                <Reply size={14} />

                                Reply
                            </button>

                            <small>
                                {formatDate(comment.created_at)}
                            </small>
                        </div>

                        {/* REPLY INPUT */}

                        {replyingTo[comment.id] && (
                            <div className="ct-reply-input">
                                <input
                                    type="text"
                                    placeholder={`Reply to ${comment.username || "user"}...`}
                                    value={
                                        replyInputs[comment.id] || ""
                                    }
                                    onChange={event =>
                                        setReplyInputs(previous => ({
                                            ...previous,
                                            [comment.id]: event.target.value,
                                        }))
                                    }
                                    onKeyDown={event => {
                                        if (event.key === "Enter") {
                                            event.preventDefault();

                                            addReply(postId, comment.id);
                                        }
                                    }}
                                />

                                <button
                                    type="button"
                                    onClick={() =>
                                        addReply(postId, comment.id)
                                    }
                                >
                                    <Send size={15} />
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* NESTED REPLIES */}

                {comment.replies?.length > 0 && (
                    <div className="ct-comment-replies">
                        {comment.replies.map(reply =>
                            renderComment(
                                reply,
                                postId,
                                depth + 1
                            )
                        )}
                    </div>
                )}
            </div>
        );
    }

    // ==================================================
    // CLEANUP IMAGE PREVIEWS
    // ==================================================

    useEffect(() => {
        return () => {
            selectedImages.forEach(image => {
                URL.revokeObjectURL(image.preview);
            });
        };
    }, [selectedImages]);

    // ==================================================
    // RENDER
    // ==================================================

    return (
       <div className={`ct-feed ct-theme-${theme}`}>

            {/* ==================================================
                FULL SCREEN IMAGE VIEWER
            ================================================== */}

            {imageViewer.images.length > 0 && (
                <div
                    className="ct-image-viewer"
                    onClick={closeImageViewer}
                >
                    <button
                        type="button"
                        className="ct-viewer-close"
                        onClick={closeImageViewer}
                        aria-label="Close image viewer"
                    >
                        <X size={28} />
                    </button>

                    {imageViewer.images.length > 1 && (
                        <div className="ct-viewer-counter">
                            {imageViewer.currentIndex + 1}
                            {" / "}
                            {imageViewer.images.length}
                        </div>
                    )}

                    {imageViewer.images.length > 1 && (
                        <button
                            type="button"
                            className="ct-viewer-prev"
                            onClick={showPreviousImage}
                            aria-label="Previous image"
                        >
                            &#10094;
                        </button>
                    )}

                    <img
                        src={getMediaUrl(
                            imageViewer.images[
                                imageViewer.currentIndex
                            ].image_url
                        )}
                        alt="Expanded post"
                        className="ct-viewer-image"
                        onClick={event => event.stopPropagation()}
                    />

                    {imageViewer.images.length > 1 && (
                        <button
                            type="button"
                            className="ct-viewer-next"
                            onClick={showNextImage}
                            aria-label="Next image"
                        >
                            &#10095;
                        </button>
                    )}
                </div>
            )}

            {/* ==================================================
                FULL SCREEN LOADING OVERLAY
            ================================================== */}

            {screenLoading && (
                <div className="ct-screen-loading">
                    <div className="ct-loading-glass">

                        <div className="ct-loading-icon">
                            <Loader2
                                className="ct-spin"
                                size={38}
                            />
                        </div>

                        <h2>{screenLoading}</h2>

                        <p>
                            Please wait while Cave Tunes processes your request.
                        </p>

                        <div className="ct-progress-track">
                            <div className="ct-progress-bar"></div>
                        </div>

                        <span className="ct-loading-status">
                            Processing...
                        </span>
                    </div>
                </div>
            )}

            {/* ==================================================
                FEED HEADER
            ================================================== */}

            <div className="ct-feed-header">
                <div>
                    <h1>Community Feed</h1>

                    <p>
                        Connect with the Cave Tunes community.
                    </p>
                </div>

                <div className="ct-feed-header-actions">

    <button
        type="button"
        className="ct-theme-toggle"
        onClick={toggleTheme}
        disabled={savingTheme}
        title={
            theme === "dark"
                ? "Switch to light mode"
                : "Switch to dark mode"
        }
    >
        {theme === "dark" ? (
            <>
                <Sun size={18} />
                <span>Light Mode</span>
            </>
        ) : (
            <>
                <Moon size={18} />
                <span>Dark Mode</span>
            </>
        )}
    </button>

    <button
        className="ct-feed-refresh"
        onClick={fetchPosts}
        title="Refresh feed"
    >
        <RefreshCw size={18} />
    </button>

</div>
            </div>

            {/* ==================================================
                ERROR MESSAGE
            ================================================== */}

            {error && (
                <div className="ct-feed-error">
                    {error}

                    <button onClick={() => setError("")}>
                        <X size={16} />
                    </button>
                </div>
            )}

            {/* ==================================================
                CREATE POST
            ================================================== */}

            <form
                className="ct-create-post"
                onSubmit={createPost}
            >
                <div className="ct-create-top">

                    <div className="ct-avatar">
                        {user?.profile_image_url ||
                        user?.profile_image ? (
                            <img
                                src={getMediaUrl(
                                    user.profile_image_url ||
                                    user.profile_image
                                )}
                                alt=""
                            />
                        ) : (
                            <UserRound size={22} />
                        )}
                    </div>

                    <textarea
                        value={content}
                        onChange={event =>
                            setContent(event.target.value)
                        }
                        placeholder="What's happening in music today?"
                        maxLength={5000}
                    />
                </div>

                {/* IMAGE PREVIEWS */}

                {selectedImages.length > 0 && (
                    <div className="ct-selected-images">
                        {selectedImages.map((image, index) => (
                            <div
                                className="ct-selected-image"
                                key={image.preview}
                            >
                                <img
                                    src={image.preview}
                                    alt=""
                                />

                                <button
                                    type="button"
                                    onClick={() =>
                                        removeSelectedImage(index)
                                    }
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                {/* LINK INPUT */}

                <input
                    className="ct-feed-link"
                    type="url"
                    placeholder="Add a link (optional)"
                    value={linkUrl}
                    onChange={event =>
                        setLinkUrl(event.target.value)
                    }
                />

                {/* CREATE ACTIONS */}

                <div className="ct-create-actions">
                    <div className="ct-create-tools">
                        <button
                            type="button"
                            onClick={() =>
                                fileInputRef.current?.click()
                            }
                        >
                            <Image size={19} />

                            <span>Photos</span>
                        </button>

                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            multiple
                            hidden
                            onChange={handleImageSelect}
                        />
                    </div>

                    <button
                        type="submit"
                        className="ct-publish-button"
                        disabled={publishing}
                    >
                        {publishing ? (
                            <Loader2
                                size={18}
                                className="ct-spin"
                            />
                        ) : (
                            <Send size={17} />
                        )}

                        {publishing ? "Publishing..." : "Publish"}
                    </button>
                </div>
            </form>

            {/* ==================================================
                FEED POSTS
            ================================================== */}

            <div className="ct-feed-posts">

                {loading ? (
                    <div className="ct-feed-loading">
                        <Loader2
                            className="ct-spin"
                            size={28}
                        />

                        Loading posts...
                    </div>

                ) : posts.length === 0 ? (
                    <div className="ct-feed-empty">
                        <MessageCircle size={35} />

                        <h3>No posts yet</h3>

                        <p>
                            Be the first to share something with the community.
                        </p>
                    </div>

                ) : (
                    posts.map(post => {

                        const isRepost =
                            post.is_repost === true ||
                            post.is_repost === "true";

                        const feedItemKey = isRepost
                            ? `share-${post.share_id}`
                            : `post-${post.id}`;

                        const authorName = isRepost
                            ? post.reshared_by_username
                            : post.username;

                        const authorImage = isRepost
                            ? (
                                post.reshared_by_profile_image_url ||
                                post.reshared_by_profile_image
                            )
                            : (
                                post.profile_image_url ||
                                post.profile_image
                            );

                        const authorId = isRepost
                            ? post.reshared_by_user_id
                            : post.user_id;

                        const authorRole = isRepost
                            ? post.reshared_by_role
                            : post.role;

                        const displayDate = isRepost
                            ? post.feed_created_at
                            : post.created_at;

                        const commentTree = buildCommentTree(
                            comments[post.id] || []
                        );

                        return (
                            <article
                                className="ct-feed-post"
                                key={feedItemKey}
                            >

                                {/* REPOST LABEL */}

                              {isRepost && (
    <div className="ct-repost-label">
        <Repeat2 size={16} />

        <strong
            className="ct-profile-clickable"
            onClick={() =>
                openUserProfile(
                    post.reshared_by_user_id,
                    post.reshared_by_role
                )
            }
            title="View reposter's profile"
        >
            {authorName || "A user"}

            <VerifiedBadge
                creator={{
                    verified: post.reshared_by_verified,
                    monetized: post.reshared_by_monetized,
                    verification_level:
                        post.reshared_by_verification_level,
                }}
            />
        </strong>

        <span>reposted</span>
    </div>
)}

                                {/* POST HEADER */}

                                <div className="ct-post-header">

                                    <div className="ct-post-author">

                                        {/* AUTHOR AVATAR */}

                                        <div
                                            className="ct-avatar ct-profile-clickable"
                                            onClick={() =>
                                                openUserProfile(
                                                    authorId,
                                                    authorRole
                                                )
                                            }
                                            title="View profile"
                                        >
                                            {authorImage ? (
                                                <img
                                                    src={getMediaUrl(authorImage)}
                                                    alt=""
                                                />
                                            ) : (
                                                <UserRound size={22} />
                                            )}
                                        </div>

                                        {/* AUTHOR NAME */}

                                        <div>
                                            <strong
                                                className="ct-profile-clickable"
                                                onClick={() =>
                                                    openUserProfile(
                                                        authorId,
                                                        authorRole
                                                    )
                                                }
                                                title="View profile"
                                            >
                                                {authorName || "Cave Tunes User"}

<VerifiedBadge
    creator={
        isRepost
            ? {
                verified: post.reshared_by_verified,
                monetized: post.reshared_by_monetized,
                verification_level:
                    post.reshared_by_verification_level,
            }
            : post
    }
/>

                                            </strong>

                                            <small>
                                                {formatDate(displayDate)}
                                            </small>
                                        </div>
                                    </div>

                                    {/* POST MENU */}

                                    <div className="ct-post-menu">
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setActiveMenu(
                                                    activeMenu === feedItemKey
                                                        ? null
                                                        : feedItemKey
                                                )
                                            }
                                        >
                                            <MoreHorizontal size={22} />
                                        </button>

                                        {activeMenu === feedItemKey && (
                                            <div className="ct-post-menu-dropdown">

                                                {!isRepost &&
                                                Number(user?.id) ===
                                                Number(post.user_id) && (
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            deletePost(post.id)
                                                        }
                                                    >
                                                        Delete post
                                                    </button>
                                                )}

                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* ORIGINAL AUTHOR ATTRIBUTION */}

                                {isRepost && (
                                    <div className="ct-original-author">
                                        Originally posted by{" "}

                                        <strong
                                            className="ct-profile-clickable"
                                            onClick={() =>
                                                openUserProfile(
                                                    post.user_id,
                                                    post.role
                                                )
                                            }
                                            title="View original author's profile"
                                        >
                                            {post.username || "Cave Tunes User"}
                                        </strong>
                                       <VerifiedBadge creator={post} />
                                    </div>
                                )}

                                {/* POST CONTENT */}

                                {post.content && (
                                    <div className="ct-post-content">
                                        {post.content}
                                    </div>
                                )}

                                {/* POST LINK */}

                                {post.link_url && (
                                    <a
                                        className="ct-post-link"
                                        href={post.link_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        {post.link_url}
                                    </a>
                                )}

                                {/* POST IMAGES */}

                                {post.images?.length > 0 && (
                                    <div
                                        className={`ct-post-images ${
                                            post.images.length === 1
                                                ? "ct-single-image"
                                                : ""
                                        }`}
                                    >
                                        {post.images.map((image, index) => (
                                            <img
                                                key={image.id}
                                                src={getMediaUrl(image.image_url)}
                                                alt="Feed post"
                                                loading="lazy"
                                                onClick={() =>
                                                    openImageViewer(
                                                        post.images,
                                                        index
                                                    )
                                                }
                                                className="ct-clickable-image"
                                            />
                                        ))}
                                    </div>
                                )}

                                {/* POST COUNTS */}

                                <div className="ct-post-stats">
                                    <span>
                                        {Number(post.likes_count || 0)} likes
                                    </span>

                                    <span>
                                        {Number(post.comments_count || 0)} comments
                                    </span>

                                    <span>
                                        {Number(post.shares_count || 0)} shares
                                    </span>
                                </div>

                                {/* POST ACTIONS */}

                                <div className="ct-post-actions">

                                    <button
                                        type="button"
                                        className={
                                            post.is_liked
                                                ? "ct-action-liked"
                                                : ""
                                        }
                                        onClick={() =>
                                            toggleLike(post.id)
                                        }
                                    >
                                        <Heart
                                            size={19}
                                            fill={
                                                post.is_liked
                                                    ? "currentColor"
                                                    : "none"
                                            }
                                        />

                                        Like
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() =>
                                            toggleComments(post.id)
                                        }
                                    >
                                        <MessageCircle size={19} />

                                        Comment
                                    </button>

                                    <button
                                        type="button"
                                        className={
                                            post.is_reshared
                                                ? "ct-action-reshared"
                                                : ""
                                        }
                                        onClick={() =>
                                            resharePost(post.id)
                                        }
                                    >
                                        <Repeat2 size={19} />

                                        {post.is_reshared
                                            ? "Undo reshare"
                                            : "Reshare"}
                                    </button>
                                </div>

                                {/* COMMENTS */}

                                {expandedComments[post.id] && (
                                    <div className="ct-comments">

                                        {loadingComments[post.id] ? (
                                            <div className="ct-comments-loading">
                                                <Loader2
                                                    size={18}
                                                    className="ct-spin"
                                                />

                                                Loading comments...
                                            </div>

                                        ) : (
                                            <>
                                                {commentTree.map(comment =>
                                                    renderComment(
                                                        comment,
                                                        post.id
                                                    )
                                                )}

                                                {commentTree.length === 0 && (
                                                    <p className="ct-no-comments">
                                                        No comments yet. Start the conversation.
                                                    </p>
                                                )}
                                            </>
                                        )}

                                        {/* ADD COMMENT */}

                                        <div className="ct-comment-input">
                                            <input
                                                type="text"
                                                placeholder="Write a comment..."
                                                value={
                                                    commentInputs[post.id] || ""
                                                }
                                                onChange={event =>
                                                    setCommentInputs(previous => ({
                                                        ...previous,
                                                        [post.id]: event.target.value,
                                                    }))
                                                }
                                                onKeyDown={event => {
                                                    if (event.key === "Enter") {
                                                        event.preventDefault();

                                                        addComment(post.id);
                                                    }
                                                }}
                                            />

                                            <button
                                                type="button"
                                                onClick={() =>
                                                    addComment(post.id)
                                                }
                                            >
                                                <Send size={17} />
                                            </button>
                                        </div>
                                    </div>
                                )}

                            </article>
                        );
                    })
                )}
            </div>
        </div>
    );
}

