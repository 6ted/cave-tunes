// ======================================================
// CAVE TUNES - PASSPORT GOOGLE OAUTH CONFIGURATION
// ======================================================

const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;

const db = require("./database");

// ======================================================
// GOOGLE STRATEGY
// ======================================================

passport.use(

    new GoogleStrategy(

        {
            clientID: process.env.GOOGLE_CLIENT_ID,

            clientSecret: process.env.GOOGLE_CLIENT_SECRET,

            callbackURL: process.env.GOOGLE_CALLBACK_URL
        },

        async (accessToken, refreshToken, profile, done) => {

            try {

                // ----------------------------------------
                // Validate Google Email
                // ----------------------------------------

                if (
                    !profile.emails ||
                    profile.emails.length === 0
                ) {

                    return done(
                        new Error("Google account has no email."),
                        null
                    );

                }

                const email =
                    profile.emails[0].value
                        .toLowerCase()
                        .trim();

                const displayName =
                    profile.displayName || "New User";

                const profileImage =
                    profile.photos &&
                    profile.photos.length > 0
                        ? profile.photos[0].value
                        : null;

                console.log("🔐 Google Login:", email);

                // ----------------------------------------
                // Check Existing User
                // ----------------------------------------

                const existingUser = await db.query(

                    `
                    SELECT
                        id,
                        username,
                        email,
                        role,
                        profile_image_url,
                        profile_completed
                    FROM users
                    WHERE email = $1
                    `,

                    [email]

                );

                // ----------------------------------------
                // Existing User
                // ----------------------------------------

                if (existingUser.rows.length > 0) {

                    const user = existingUser.rows[0];

                    console.log(
                        `✅ Existing Google user: ${user.email}`
                    );

                    return done(null, user);

                }

                // ----------------------------------------
                // Create New User
                // ----------------------------------------

                const newUser = await db.query(

                    `
                    INSERT INTO users
                    (
                        username,
                        email,
                        password,
                        role,
                        profile_image_url,
                        profile_completed
                    )

                    VALUES
                    (
                        $1,
                        $2,
                        NULL,
                        $3,
                        $4,
                        FALSE
                    )

                    RETURNING
                        id,
                        username,
                        email,
                        role,
                        profile_image_url,
                        profile_completed
                    `,

                    [
                        displayName,
                        email,
                        "listener",
                        profileImage
                    ]

                );

                const user = newUser.rows[0];

                console.log(
                    `✅ New Google user created: ${user.email}`
                );

                console.log(
                    "📝 Google user requires profile onboarding."
                );

                return done(null, user);

            }

            catch (error) {

                console.error(
                    "❌ GOOGLE PASSPORT ERROR:",
                    error
                );

                return done(error, null);

            }

        }

    )

);

// ======================================================
// EXPORT PASSPORT
// ======================================================

module.exports = passport;