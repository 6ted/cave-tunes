// ======================================================
// CAVE TUNES FEED CONTROLLER
// controllers/feedController.js
// ======================================================

const pool = require("../config/database");
const fs = require("fs");

// ======================================================
// HELPER: VALIDATE ID
// ======================================================

const validId = (value) => {
    const id = Number(value);
    return Number.isSafeInteger(id) && id > 0 ? id : null;
};

// ======================================================
// HELPER: HANDLE ERRORS
// ======================================================

const handleError = (res, error, message) => {
    console.error("FEED ERROR:", error);

    if (error.code === "23503") {
        return res.status(400).json({
            success: false,
            message: "The requested Feed resource does not exist."
        });
    }

    if (error.code === "23514") {
        return res.status(400).json({
            success: false,
            message: "The submitted content is invalid."
        });
    }

    return res.status(500).json({
        success: false,
        message
    });
};

// ======================================================
// 1. CREATE POST
// ======================================================

const createPost = async (req, res) => {
    const userId = validId(req.userId);

    let content = typeof req.body.content === "string"
        ? req.body.content.trim()
        : "";

    let link_url = typeof req.body.link_url === "string"
        ? req.body.link_url.trim()
        : "";

    // Get the timestamp sent by the user's device
    const clientDate = new Date(req.body.client_created_at);

    const files = Array.isArray(req.files) ? req.files : [];

    const removeUploadedFiles = () => {
        for (const file of files) {
            try {
                fs.unlinkSync(file.path);
            } catch (_) {}
        }
    };

    if (!userId) {
        removeUploadedFiles();

        return res.status(401).json({
            success: false,
            message: "You must be logged in to publish a post."
        });
    }

    if (content.length > 5000) {
        removeUploadedFiles();

        return res.status(400).json({
            success: false,
            message: "Post text cannot exceed 5000 characters."
        });
    }

    if (link_url && !/^https?:\/\/\S+$/i.test(link_url)) {
        removeUploadedFiles();

        return res.status(400).json({
            success: false,
            message: "Please provide a valid HTTP or HTTPS link."
        });
    }

    if (!content && !link_url && files.length === 0) {
        removeUploadedFiles();

        return res.status(400).json({
            success: false,
            message: "Write something, provide a link, or attach an image."
        });
    }

    if (files.length > 10) {
        removeUploadedFiles();

        return res.status(400).json({
            success: false,
            message: "Maximum 10 images per post."
        });
    }

    // Validate the device timestamp
    if (
        !req.body.client_created_at ||
        Number.isNaN(clientDate.getTime())
    ) {
        removeUploadedFiles();

        return res.status(400).json({
            success: false,
            message: "Invalid post timestamp."
        });
    }

    let client;

    try {
        client = await pool.connect();

        await client.query("BEGIN");

        const postResult = await client.query(
            `INSERT INTO feed_posts
                (user_id, content, link_url, created_at)
             VALUES ($1, $2, $3, $4)
             RETURNING *`,
            [
                userId,
                content || null,
                link_url || null,
                clientDate.toISOString()
            ]
        );

        const post = postResult.rows[0];

        const images = [];

        for (const file of files) {
            const imageUrl = `/uploads/feed_images/${file.filename}`;

            const imageResult = await client.query(
                `INSERT INTO feed_post_images
                    (post_id, image_url)
                 VALUES ($1, $2)
                 RETURNING id, image_url`,
                [post.id, imageUrl]
            );

            images.push(imageResult.rows[0]);
        }

        await client.query("COMMIT");

        return res.status(201).json({
            success: true,
            message: "Post published successfully.",
            post: {
                ...post,
                images
            }
        });

    } catch (error) {
        if (client) {
            try {
                await client.query("ROLLBACK");
            } catch (_) {}
        }

        removeUploadedFiles();

        return handleError(
            res,
            error,
            "Unable to publish post."
        );

    } finally {
        if (client) client.release();
    }
};


// ======================================================
// 2. GET FEED POSTS INCLUDING REPOSTS
// ======================================================

const getFeedPosts = async (req, res) => {
    try {
        const limit = Math.min(
            Math.max(Number.parseInt(req.query.limit, 10) || 20, 1),
            50
        );

        const offset = Math.max(
            Number.parseInt(req.query.offset, 10) || 0,
            0
        );

        const userId = validId(req.userId);

        const result = await pool.query(
            `
            WITH feed_items AS (

                -- ORIGINAL POSTS
                SELECT
                    p.id AS post_id,
                    NULL::bigint AS share_id,
                    p.user_id AS feed_user_id,
                    p.created_at AS feed_created_at,
                    NULL::text AS share_text,
                    false AS is_repost

                FROM feed_posts p

                UNION ALL

                -- REPOSTS
                SELECT
                    p.id AS post_id,
                    s.id AS share_id,
                    s.user_id AS feed_user_id,
                    s.created_at AS feed_created_at,
                    s.share_text,
                    true AS is_repost

                FROM feed_post_shares s

                JOIN feed_posts p
                    ON p.id = s.post_id
            )

            SELECT

                p.id,
                p.user_id,
                p.content,
                p.link_url,
                p.created_at,
                p.updated_at,

             -- POST AUTHOR
u.username,
u.profile_image,
u.profile_image_url,
u.verified,
u.monetized,
CASE
    WHEN COALESCE(u.verified, false)
         AND COALESCE(u.monetized, false)
        THEN 'master'
    WHEN COALESCE(u.verified, false)
        THEN 'verified'
    ELSE 'none'
END AS verification_level,
u.role,
u.bio,

                -- FEED ITEM INFORMATION
                fi.share_id,
                fi.is_repost,
                fi.feed_user_id,
                fi.feed_created_at,
                fi.share_text,

                -- PERSON WHO REPOSTED
               -- PERSON WHO REPOSTED
sharer.id AS reshared_by_user_id,
sharer.role AS reshared_by_role,
sharer.username AS reshared_by_username,
sharer.profile_image AS reshared_by_profile_image,
sharer.profile_image_url AS reshared_by_profile_image_url,

                COALESCE(l.like_count, 0)::integer AS likes_count,

                COALESCE(c.comment_count, 0)::integer AS comments_count,

                COALESCE(s.share_count, 0)::integer AS shares_count,

                COALESCE(l.liked, false) AS is_liked,

                COALESCE(s.reshared, false) AS is_reshared,

                COALESCE(i.images, '[]'::json) AS images

            FROM feed_items fi

            JOIN feed_posts p
                ON p.id = fi.post_id

            JOIN users u
                ON u.id = p.user_id

            LEFT JOIN users sharer
                ON sharer.id = fi.feed_user_id
                AND fi.is_repost = true

            LEFT JOIN LATERAL (

                SELECT
                    COUNT(*) AS like_count,
                    BOOL_OR(user_id = $1) AS liked

                FROM feed_post_likes

                WHERE post_id = p.id

            ) l ON TRUE

            LEFT JOIN LATERAL (

                SELECT COUNT(*) AS comment_count

                FROM feed_comments

                WHERE post_id = p.id

            ) c ON TRUE

            LEFT JOIN LATERAL (

                SELECT
                    COUNT(*) AS share_count,
                    BOOL_OR(user_id = $1) AS reshared

                FROM feed_post_shares

                WHERE post_id = p.id

            ) s ON TRUE

            LEFT JOIN LATERAL (

                SELECT json_agg(

                    json_build_object(
                        'id', id,
                        'image_url', image_url
                    )

                    ORDER BY id

                ) AS images

                FROM feed_post_images

                WHERE post_id = p.id

            ) i ON TRUE

            ORDER BY
                fi.feed_created_at DESC,
                fi.post_id DESC

            LIMIT $2 OFFSET $3
            `,
            [userId, limit, offset]
        );

        return res.json({
            success: true,
            count: result.rows.length,
            posts: result.rows
        });

    } catch (error) {

        return handleError(
            res,
            error,
            "Unable to retrieve Feed."
        );

    }
};

// ======================================================
// 3. GET POSTS CREATED BY A SPECIFIC USER
// ======================================================

const getUserPosts = async (req, res) => {
    const profileUserId = validId(req.params.userId);

    if (!profileUserId) {
        return res.status(400).json({
            success: false,
            message: "Invalid user ID."
        });
    }

    try {
        // Logged-in viewer (can be null because authentication is optional)
        const viewerId = validId(req.userId);

        const limit = Math.min(
            Math.max(Number.parseInt(req.query.limit, 10) || 20, 1),
            50
        );

        const offset = Math.max(
            Number.parseInt(req.query.offset, 10) || 0,
            0
        );

        const result = await pool.query(
            `
            SELECT

                p.id,
                p.user_id,
                p.content,
                p.link_url,
                p.created_at,
                p.updated_at,

                -- POST AUTHOR
               -- POST AUTHOR
u.username,
u.profile_image,
u.profile_image_url,
u.verified,
u.monetized,
CASE
    WHEN COALESCE(u.verified, false)
         AND COALESCE(u.monetized, false)
        THEN 'master'
    WHEN COALESCE(u.verified, false)
        THEN 'verified'
    ELSE 'none'
END AS verification_level,
u.role,
u.bio,

                -- LIKE COUNT
                (
                    SELECT COUNT(*)
                    FROM feed_post_likes
                    WHERE post_id = p.id
                )::integer AS likes_count,

                -- COMMENT COUNT
                (
                    SELECT COUNT(*)
                    FROM feed_comments
                    WHERE post_id = p.id
                )::integer AS comments_count,

                -- RESHARE COUNT
                (
                    SELECT COUNT(*)
                    FROM feed_post_shares
                    WHERE post_id = p.id
                )::integer AS shares_count,

                -- VIEWER LIKE STATUS
                EXISTS (
                    SELECT 1
                    FROM feed_post_likes
                    WHERE post_id = p.id
                    AND user_id = $2
                ) AS is_liked,

                -- VIEWER RESHARE STATUS
                EXISTS (
                    SELECT 1
                    FROM feed_post_shares
                    WHERE post_id = p.id
                    AND user_id = $2
                ) AS is_reshared,

                -- POST IMAGES
                COALESCE(
                    (
                        SELECT json_agg(
                            json_build_object(
                                'id', img.id,
                                'image_url', img.image_url
                            )
                            ORDER BY img.id
                        )
                        FROM feed_post_images img
                        WHERE img.post_id = p.id
                    ),
                    '[]'::json
                ) AS images

            FROM feed_posts p

            JOIN users u
                ON u.id = p.user_id

            WHERE p.user_id = $1

            ORDER BY
                p.created_at DESC,
                p.id DESC

            LIMIT $3 OFFSET $4
            `,
            [
                profileUserId,
                viewerId,
                limit,
                offset
            ]
        );

        return res.json({
            success: true,
            count: result.rows.length,
            posts: result.rows
        });

    } catch (error) {
        return handleError(
            res,
            error,
            "Unable to retrieve user's posts."
        );
    }
};

// ======================================================
// 3. GET SINGLE POST
// ======================================================

const getPostById = async (req, res) => {
    const postId = validId(req.params.id);

    if (!postId) {
        return res.status(400).json({
            success: false,
            message: "Invalid post ID."
        });
    }

    try {
        const userId = validId(req.userId);

        const result = await pool.query(
            `SELECT
                p.*,
           u.username,
u.profile_image,
u.profile_image_url,
u.verified,
u.monetized,
CASE
    WHEN COALESCE(u.verified, false)
         AND COALESCE(u.monetized, false)
        THEN 'master'
    WHEN COALESCE(u.verified, false)
        THEN 'verified'
    ELSE 'none'
END AS verification_level,
u.role,
u.bio,

                (
                    SELECT COUNT(*)
                    FROM feed_post_likes
                    WHERE post_id = p.id
                )::integer AS likes_count,

                (
                    SELECT COUNT(*)
                    FROM feed_comments
                    WHERE post_id = p.id
                )::integer AS comments_count,

                (
                    SELECT COUNT(*)
                    FROM feed_post_shares
                    WHERE post_id = p.id
                )::integer AS shares_count,

                EXISTS (
                    SELECT 1
                    FROM feed_post_likes
                    WHERE post_id = p.id
                    AND user_id = $2
                ) AS is_liked,

                EXISTS (
                    SELECT 1
                    FROM feed_post_shares
                    WHERE post_id = p.id
                    AND user_id = $2
                ) AS is_reshared,

                COALESCE(
                    (
                        SELECT json_agg(
                            json_build_object(
                                'id', id,
                                'image_url', image_url
                            )
                            ORDER BY id
                        )
                        FROM feed_post_images
                        WHERE post_id = p.id
                    ),
                    '[]'::json
                ) AS images

            FROM feed_posts p
            JOIN users u ON u.id = p.user_id
            WHERE p.id = $1`,
            [postId, userId]
        );

        if (!result.rows.length) {
            return res.status(404).json({
                success: false,
                message: "Post not found."
            });
        }

        return res.json({
            success: true,
            post: result.rows[0]
        });
    } catch (error) {
        return handleError(res, error, "Unable to retrieve post.");
    }
};

// ======================================================
// 4. DELETE POST
// ======================================================

const deletePost = async (req, res) => {
    const postId = validId(req.params.id);
    const userId = validId(req.userId);

    if (!postId) {
        return res.status(400).json({
            success: false,
            message: "Invalid post ID."
        });
    }

    if (!userId) {
        return res.status(401).json({
            success: false,
            message: "You must be logged in."
        });
    }

    let client;

    try {
        client = await pool.connect();
        await client.query("BEGIN");

        const postResult = await client.query(
            `SELECT id, user_id
             FROM feed_posts
             WHERE id = $1
             FOR UPDATE`,
            [postId]
        );

        if (!postResult.rows.length) {
            await client.query("ROLLBACK");
            return res.status(404).json({
                success: false,
                message: "Post not found."
            });
        }

        if (Number(postResult.rows[0].user_id) !== userId) {
            await client.query("ROLLBACK");
            return res.status(403).json({
                success: false,
                message: "You cannot delete another user's post."
            });
        }

        const commentsResult = await client.query(
            `WITH RECURSIVE comment_tree AS (
                SELECT id, parent_comment_id, 0 AS depth
                FROM feed_comments
                WHERE post_id = $1

                UNION ALL

                SELECT c.id, c.parent_comment_id, ct.depth + 1
                FROM feed_comments c
                JOIN comment_tree ct
                    ON c.parent_comment_id = ct.id
            )
            SELECT id, depth
            FROM comment_tree
            ORDER BY depth DESC`,
            [postId]
        );

        for (const comment of commentsResult.rows) {
            await client.query(
                `DELETE FROM feed_comment_likes WHERE comment_id = $1`,
                [comment.id]
            );

            await client.query(
                `DELETE FROM feed_comments WHERE id = $1`,
                [comment.id]
            );
        }

        await client.query(
            `DELETE FROM feed_post_likes WHERE post_id = $1`,
            [postId]
        );

        await client.query(
            `DELETE FROM feed_post_shares WHERE post_id = $1`,
            [postId]
        );

        await client.query(
            `DELETE FROM feed_post_images WHERE post_id = $1`,
            [postId]
        );

        await client.query(
            `DELETE FROM feed_posts WHERE id = $1`,
            [postId]
        );

        await client.query("COMMIT");

        return res.json({
            success: true,
            message: "Post deleted successfully."
        });
    } catch (error) {
        if (client) {
            try {
                await client.query("ROLLBACK");
            } catch (_) {}
        }

        return handleError(res, error, "Unable to delete post.");
    } finally {
        if (client) client.release();
    }
};

// ======================================================
// 5. LIKE / UNLIKE POST
// ======================================================

const togglePostLike = async (req, res) => {
    const postId = validId(req.params.id);
    const userId = validId(req.userId);

    if (!postId) {
        return res.status(400).json({
            success: false,
            message: "Invalid post ID."
        });
    }

    if (!userId) {
        return res.status(401).json({
            success: false,
            message: "You must be logged in."
        });
    }

    let client;

    try {
        client = await pool.connect();
        await client.query("BEGIN");

        const post = await client.query(
            `SELECT id FROM feed_posts WHERE id = $1`,
            [postId]
        );

        if (!post.rows.length) {
            await client.query("ROLLBACK");
            return res.status(404).json({
                success: false,
                message: "Post not found."
            });
        }

        const inserted = await client.query(
            `INSERT INTO feed_post_likes (post_id, user_id)
             VALUES ($1, $2)
             ON CONFLICT (post_id, user_id) DO NOTHING
             RETURNING id`,
            [postId, userId]
        );

        let liked;

        if (inserted.rowCount > 0) {
            liked = true;
        } else {
            await client.query(
                `DELETE FROM feed_post_likes
                 WHERE post_id = $1 AND user_id = $2`,
                [postId, userId]
            );

            liked = false;
        }

        const count = await client.query(
            `SELECT COUNT(*)::integer AS likes_count
             FROM feed_post_likes
             WHERE post_id = $1`,
            [postId]
        );

        await client.query("COMMIT");

        return res.json({
            success: true,
            liked,
            likes_count: count.rows[0].likes_count
        });
    } catch (error) {
        if (client) {
            try {
                await client.query("ROLLBACK");
            } catch (_) {}
        }

        return handleError(res, error, "Unable to update post like.");
    } finally {
        if (client) client.release();
    }
};

// ======================================================
// 6. CREATE COMMENT
// ======================================================

const createComment = async (req, res) => {
    const postId = validId(req.params.id);
    const userId = validId(req.userId);

    const content = typeof req.body.content === "string"
        ? req.body.content.trim()
        : "";

    if (!postId || !content) {
        return res.status(400).json({
            success: false,
            message: "A valid post ID and comment are required."
        });
    }

    if (!userId) {
        return res.status(401).json({
            success: false,
            message: "You must be logged in."
        });
    }

    try {
        const result = await pool.query(
            `INSERT INTO feed_comments
                (post_id, user_id, content)
             VALUES ($1, $2, $3)
             RETURNING *`,
            [postId, userId, content]
        );

        return res.status(201).json({
            success: true,
            message: "Comment added successfully.",
            comment: result.rows[0]
        });
    } catch (error) {
        return handleError(res, error, "Unable to add comment.");
    }
};

// ======================================================
// 7. CREATE REPLY
// ======================================================

const createReply = async (req, res) => {
    const postId = validId(req.params.id);
    const parentCommentId = validId(req.body.parent_comment_id);
    const userId = validId(req.userId);

    const content = typeof req.body.content === "string"
        ? req.body.content.trim()
        : "";

    if (!postId || !parentCommentId || !content) {
        return res.status(400).json({
            success: false,
            message: "Post, parent comment and reply are required."
        });
    }

    if (!userId) {
        return res.status(401).json({
            success: false,
            message: "You must be logged in."
        });
    }

    try {
        const parent = await pool.query(
            `SELECT id
             FROM feed_comments
             WHERE id = $1 AND post_id = $2`,
            [parentCommentId, postId]
        );

        if (!parent.rows.length) {
            return res.status(404).json({
                success: false,
                message: "Parent comment not found."
            });
        }

        const result = await pool.query(
            `INSERT INTO feed_comments
                (post_id, user_id, parent_comment_id, content)
             VALUES ($1, $2, $3, $4)
             RETURNING *`,
            [postId, userId, parentCommentId, content]
        );

        return res.status(201).json({
            success: true,
            message: "Reply added successfully.",
            reply: result.rows[0]
        });
    } catch (error) {
        return handleError(res, error, "Unable to add reply.");
    }
};

// ======================================================
// 8. GET POST COMMENTS AND REPLIES
// ======================================================

const getPostComments = async (req, res) => {
    const postId = validId(req.params.id);

    if (!postId) {
        return res.status(400).json({
            success: false,
            message: "Invalid post ID."
        });
    }

    try {
        const userId = validId(req.userId);

        const result = await pool.query(
            `SELECT
                c.id,
                c.post_id,
                c.user_id,
                c.parent_comment_id,
                c.content,
                c.created_at,
                c.updated_at,

              u.username,
u.profile_image,
u.profile_image_url,
u.verified,
u.monetized,
CASE
    WHEN COALESCE(u.verified, false)
         AND COALESCE(u.monetized, false)
        THEN 'master'
    WHEN COALESCE(u.verified, false)
        THEN 'verified'
    ELSE 'none'
END AS verification_level,
u.role,
                (
                    SELECT COUNT(*)
                    FROM feed_comment_likes
                    WHERE comment_id = c.id
                )::integer AS likes_count,

                EXISTS (
                    SELECT 1
                    FROM feed_comment_likes
                    WHERE comment_id = c.id
                    AND user_id = $2
                ) AS is_liked

            FROM feed_comments c
            JOIN users u ON u.id = c.user_id
            WHERE c.post_id = $1
            ORDER BY c.created_at ASC, c.id ASC`,
            [postId, userId]
        );

        return res.json({
            success: true,
            count: result.rows.length,
            comments: result.rows
        });
    } catch (error) {
        return handleError(res, error, "Unable to retrieve comments.");
    }
};

// ======================================================
// 9. LIKE / UNLIKE COMMENT
// ======================================================

const toggleCommentLike = async (req, res) => {
    const commentId = validId(req.params.id);
    const userId = validId(req.userId);

    if (!commentId) {
        return res.status(400).json({
            success: false,
            message: "Invalid comment ID."
        });
    }

    if (!userId) {
        return res.status(401).json({
            success: false,
            message: "You must be logged in."
        });
    }

    let client;

    try {
        client = await pool.connect();
        await client.query("BEGIN");

        const comment = await client.query(
            `SELECT id FROM feed_comments WHERE id = $1`,
            [commentId]
        );

        if (!comment.rows.length) {
            await client.query("ROLLBACK");
            return res.status(404).json({
                success: false,
                message: "Comment not found."
            });
        }

        const inserted = await client.query(
            `INSERT INTO feed_comment_likes (comment_id, user_id)
             VALUES ($1, $2)
             ON CONFLICT (comment_id, user_id) DO NOTHING
             RETURNING id`,
            [commentId, userId]
        );

        let liked;

        if (inserted.rowCount > 0) {
            liked = true;
        } else {
            await client.query(
                `DELETE FROM feed_comment_likes
                 WHERE comment_id = $1 AND user_id = $2`,
                [commentId, userId]
            );

            liked = false;
        }

        const count = await client.query(
            `SELECT COUNT(*)::integer AS likes_count
             FROM feed_comment_likes
             WHERE comment_id = $1`,
            [commentId]
        );

        await client.query("COMMIT");

        return res.json({
            success: true,
            liked,
            likes_count: count.rows[0].likes_count
        });
    } catch (error) {
        if (client) {
            try {
                await client.query("ROLLBACK");
            } catch (_) {}
        }

        return handleError(res, error, "Unable to update comment like.");
    } finally {
        if (client) client.release();
    }
};

// ======================================================
// 10. RESHARE POST
// ======================================================

const resharePost = async (req, res) => {
    const postId = validId(req.params.id);
    const userId = validId(req.userId);

    const shareText = typeof req.body.share_text === "string"
        ? req.body.share_text.trim()
        : null;

    if (!postId) {
        return res.status(400).json({
            success: false,
            message: "Invalid post ID."
        });
    }

    if (!userId) {
        return res.status(401).json({
            success: false,
            message: "You must be logged in."
        });
    }

    if (shareText && shareText.length > 2000) {
        return res.status(400).json({
            success: false,
            message: "Share text cannot exceed 2000 characters."
        });
    }

    let client;

    try {
        client = await pool.connect();
        await client.query("BEGIN");

        const post = await client.query(
            `SELECT id FROM feed_posts WHERE id = $1`,
            [postId]
        );

        if (!post.rows.length) {
            await client.query("ROLLBACK");
            return res.status(404).json({
                success: false,
                message: "Post not found."
            });
        }

        const inserted = await client.query(
            `INSERT INTO feed_post_shares
                (post_id, user_id, share_text)
             VALUES ($1, $2, $3)
             ON CONFLICT (post_id, user_id) DO NOTHING
             RETURNING id`,
            [postId, userId, shareText || null]
        );

        let reshared;

        if (inserted.rowCount > 0) {
            reshared = true;
        } else {
            await client.query(
                `DELETE FROM feed_post_shares
                 WHERE post_id = $1 AND user_id = $2`,
                [postId, userId]
            );

            reshared = false;
        }

        const count = await client.query(
            `SELECT COUNT(*)::integer AS shares_count
             FROM feed_post_shares
             WHERE post_id = $1`,
            [postId]
        );

        await client.query("COMMIT");

        return res.json({
            success: true,
            reshared,
            shares_count: count.rows[0].shares_count
        });
    } catch (error) {
        if (client) {
            try {
                await client.query("ROLLBACK");
            } catch (_) {}
        }

        return handleError(res, error, "Unable to reshare post.");
    } finally {
        if (client) client.release();
    }
};



// ======================================================
// EXPORT CONTROLLERS
// ======================================================

module.exports = {
    createPost,
    getFeedPosts,
    getUserPosts,
    getPostById,
    deletePost,
    togglePostLike,
    createComment,
    createReply,
    getPostComments,
    toggleCommentLike,
    resharePost
};