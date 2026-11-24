// ======================================================
// CAVE TUNES
// FEED ROUTES
// ======================================================

const express = require("express");

const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");

const uploadMiddleware = require("../middleware/uploadMiddleware");

const uploadFeedImages = uploadMiddleware.uploadFeedImages;

const {

    createPost,
    getFeedPosts,
    getPostById,
     getUserPosts,
    deletePost,
    togglePostLike,
    createComment,
    createReply,
    getPostComments,
    toggleCommentLike,
    resharePost

} = require("../controllers/feedController");


// ======================================================
// FEED POSTS
// ======================================================

// Get feed posts
router.get(
    "/",
    authMiddleware.optional,
    getFeedPosts
);

// Get posts created by a specific user
router.get(
    "/users/:userId/posts",
    authMiddleware.optional,
    getUserPosts
);

// Get one post
router.get(
    "/posts/:id",
    authMiddleware.optional,
    getPostById
);


// Create post with optional images
router.post(
    "/posts",
    authMiddleware,
    uploadFeedImages,
    createPost
);


// Delete post
router.delete(
    "/posts/:id",
    authMiddleware,
    deletePost
);


// ======================================================
// POST LIKES
// ======================================================

router.post(
    "/posts/:id/like",
    authMiddleware,
    togglePostLike
);


// ======================================================
// COMMENTS
// ======================================================

router.get(
    "/posts/:id/comments",
    authMiddleware.optional,
    getPostComments
);


router.post(
    "/posts/:id/comments",
    authMiddleware,
    createComment
);


// ======================================================
// REPLIES
// ======================================================

router.post(
    "/posts/:id/replies",
    authMiddleware,
    createReply
);


// ======================================================
// COMMENT LIKES
// ======================================================

router.post(
    "/comments/:id/like",
    authMiddleware,
    toggleCommentLike
);


// ======================================================
// RESHARE
// ======================================================

router.post(
    "/posts/:id/reshare",
    authMiddleware,
    resharePost
);


module.exports = router;