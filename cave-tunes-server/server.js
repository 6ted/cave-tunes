// ======================================================
// CAVE TUNES BACKEND SERVER
// server.js
// Production Ready
// React + Express + PostgreSQL
// ======================================================

require("dotenv").config();
console.log("PAYCHANGU CONFIG CHECK:", {
  callbackConfigured: !!process.env.PAYCHANGU_VERIFICATION_CALLBACK_URL,
  returnConfigured: !!process.env.PAYCHANGU_VERIFICATION_RETURN_URL,
});
const express = require("express");
const cors = require("cors");
const compression = require("compression");
const helmet = require("helmet");
const morgan = require("morgan");
const passport = require("passport");
const path = require("path");
const fs = require("fs");
const os = require("os");

// ======================================================
// DATABASE
// ======================================================

const db = require("./config/database");

// ======================================================
// PASSPORT
// ======================================================

require("./config/passport");

// ======================================================
// ROUTES
// ======================================================

const authRoutes = require("./routes/authRoutes");
const musicRoutes = require("./routes/musicRoutes");
const uploadRoutes = require("./routes/uploadRoutes");
const adminRoutes = require("./routes/adminRoutes");
const adRoutes = require("./routes/adRoutes");
const creatorRequestRoutes = require("./routes/creatorRequestRoutes");
const creatorVerificationPaymentRoutes =
    require("./routes/creatorVerificationPaymentRoutes");
const creatorRoutes = require("./routes/creatorRoutes");
const youtubeRoutes = require("./routes/youtubeRoutes");
const notificationRoutes =
    require("./routes/notificationRoutes");

const royaltySettlementRoutes =
    require("./routes/royaltySettlementRoutes");

const royaltyRoutes =
    require("./routes/royaltyRoutes");    
const walletRoutes =
    require("./routes/walletRoutes");    

const royaltySummaryRoutes =
    require("./routes/royaltySummaryRoutes"); 
    
const adminWithdrawalRoutes =
    require(
        "./routes/adminWithdrawalRoutes"
    );    
const libraryRoutes = require("./routes/libraryRoutes");

const feedRoutes = require("./routes/feedRoutes");

const subscriptionRoutes =
    require("./routes/subscriptionRoutes");   

    const radioRoutes =
    require("./routes/radioRoutes");

    const sizaroRoutes =
    require("./routes/sizaroRoutes");

    const chartRoutes = require("./routes/chartRoutes");

    const settingsRoutes = require("./routes/settingsRoutes");
// ======================================================
// MIDDLEWARE
// ======================================================

const authMiddleware = require("./middleware/authMiddleware");
const adminMiddleware = require("./middleware/adminMiddleware");

// ======================================================
// SCHEDULERS
// ======================================================
const {
    startRadioReminderScheduler
} = require("./services/radioReminderScheduler");
// ======================================================
// APP CONFIGURATION
// ======================================================

const app = express();

const PORT = Number(process.env.PORT) || 5000;
const HOST = process.env.HOST || "0.0.0.0";

app.disable("x-powered-by");

// ======================================================
// CREATE STORAGE DIRECTORIES
// ======================================================

const uploadFolders = [
    "uploads",
    "uploads/audio",
    "uploads/covers",
    "uploads/temp",
    "uploads/lyrics",
    "uploads/videos",
    "uploads/dolby",
    "uploads/processed",
    "uploads/drafts",
    "uploads/artist_images",
    "uploads/payment-proofs",
    "uploads/ads",
    "uploads/ad-images"
];

uploadFolders.forEach(folder => {

    const folderPath = path.join(__dirname, folder);

    if (!fs.existsSync(folderPath)) {

        fs.mkdirSync(folderPath, {
            recursive: true
        });

        console.log("📁 Created:", folder);
    }

});

// ======================================================
// SECURITY
// ======================================================

app.use(helmet({
    crossOriginResourcePolicy: false
}));

app.use(compression());
app.use(morgan("combined"));
// ======================================================
// CORS
// ======================================================
// ======================================================
// CORS
// ======================================================

const allowedOrigins = [
    "http://localhost:5174",
    "http://127.0.0.1:5174",
    "http://localhost:5173",
    "http://127.0.0.1:5173"
];

if (process.env.FRONTEND_URL) {
    allowedOrigins.push(process.env.FRONTEND_URL);
}

app.use(cors({
    origin(origin, callback) {

        if (!origin) {
            return callback(null, true);
        }

        const localNetwork =
            /^http:\/\/192\.168\.\d+\.\d+(:\d+)?$/.test(origin) ||
            /^http:\/\/10\.\d+\.\d+\.\d+(:\d+)?$/.test(origin) ||
            /^http:\/\/172\.(1[6-9]|2\d|3[01])\.\d+\.\d+(:\d+)?$/.test(origin);

        if (allowedOrigins.includes(origin) || localNetwork) {
            return callback(null, true);
        }

        console.log("❌ Blocked CORS:", origin);

        callback(new Error("Not allowed by CORS"));
    },

    credentials: true
}));

// ======================================================
// BODY PARSER
// ======================================================

app.use(express.json({
    limit: "10mb"
}));

app.use(express.urlencoded({
    extended: true,
    limit: "10mb"
}));

// ======================================================
// PASSPORT
// ======================================================

app.use(passport.initialize());

// ======================================================
// REQUEST TIMEOUTS
// ======================================================

app.use((req, res, next) => {

    req.setTimeout(30 * 60 * 1000);
    res.setTimeout(30 * 60 * 1000);

    next();

});

// ======================================================
// STATIC FILES
// ======================================================

// ------------------------------------------------------
// PROTECT AUDIO FILES
// ------------------------------------------------------

// Direct access to MP3 files is blocked.
// Users must use the music streaming or download API.

app.use("/uploads/audio", (req, res) => {

    res.setHeader("Cache-Control", "no-store");

    return res.status(403).json({

        success: false,

        message: "Direct audio access is not allowed. Use the Cave Tunes music API."

    });

});

// ======================================================
// PROTECT ADVERTISEMENT AUDIO
// ======================================================

app.use("/uploads/ads", (req, res) => {
    res.status(403).json({
        success: false,
        message: "Direct advertisement file access is not allowed."
    });
});

// ------------------------------------------------------
// PUBLIC UPLOADS
// ------------------------------------------------------

// Other uploaded files remain publicly accessible:
//
// /uploads/covers
// /uploads/artist_images
// /uploads/feed_images
// /uploads/lyrics
// /uploads/videos
// /uploads/dolby
//
// Audio is excluded by the middleware above.

app.use(

    "/uploads",

    express.static(

        path.join(__dirname, "uploads"),

        {

            maxAge: "30d",

            etag: true

        }

    )

);

// ======================================================
// NETWORK HELPERS
// ======================================================

function getLocalIPs() {

    const interfaces = os.networkInterfaces();
    const ips = [];

    for (const name of Object.keys(interfaces)) {

        for (const network of interfaces[name]) {

            if (
                network.family === "IPv4" &&
                !network.internal
            ) {
                ips.push(network.address);
            }

        }

    }

    return ips;

}

// ======================================================
// API ROUTES
// ======================================================

app.use("/api/auth", authRoutes);

app.use("/api/music", musicRoutes);

app.use("/api/upload", uploadRoutes);

app.use(
    "/api/notifications",
    notificationRoutes
);

app.use("/api/admin", adminRoutes);

// Creator verification payment routes
// Registered first so the public PayChangu callback works.

app.use(
    "/api/creator",
    creatorVerificationPaymentRoutes
);
app.use("/api/creator", creatorRequestRoutes);

app.use("/api/creator", creatorRoutes);

app.use("/api/youtube", youtubeRoutes);

app.use(
    "/api/royalties",
    royaltyRoutes
);

app.use(
    "/api/wallet",
    walletRoutes
);

app.use(
    "/api/royalty-settlements",
    royaltySettlementRoutes
);

app.use(
    "/api/royalty-summary",
    royaltySummaryRoutes
);

app.use(
    "/api/admin/withdrawals",
    adminWithdrawalRoutes
);

app.use(
    "/api/subscription",
    subscriptionRoutes
);

app.use(
    "/api/radio",
    radioRoutes
);

app.use("/api/library", libraryRoutes);

app.use("/api/feed", feedRoutes);

app.use("/api/sizaro", sizaroRoutes);

app.use("/api/ads", adRoutes);

app.use("/api/charts", chartRoutes);

app.use("/api/settings", settingsRoutes);
// ======================================================
// ROOT
// ======================================================

app.get("/", (req, res) => {

    res.status(200).json({

        success: true,
        application: "Cave Tunes",
        version: "1.0.0",
        server: "Running",
        database: "PostgreSQL",
        timestamp: new Date().toISOString()

    });

});

// ======================================================
// HEALTH CHECK
// ======================================================

app.get("/health", async (req, res) => {

    try {

        await db.query("SELECT NOW()");

        res.status(200).json({

            success: true,
            status: "healthy",
            database: "connected",
            uploads: fs.existsSync(
                path.join(__dirname, "uploads")
            ),
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            timestamp: new Date().toISOString()

        });

    } catch (error) {

        res.status(500).json({

            success: false,
            status: "unhealthy",
            message: error.message

        });

    }

});

// ======================================================
// ADMIN TEST
// ======================================================

app.get(

    "/api/admin-test",

    authMiddleware,

    adminMiddleware,

    (req, res) => {

        res.json({

            success: true,
            message: "Admin authentication working.",
            userId: req.userId

        });

    }

);

// ======================================================
// MULTER ERRORS
// ======================================================

app.use((err, req, res, next) => {

    if (err.name === "MulterError") {

        switch (err.code) {

            case "LIMIT_FILE_SIZE":

                return res.status(413).json({

                    success: false,
                    message: "Maximum upload size is 2GB."

                });

            case "LIMIT_FILE_COUNT":

                return res.status(413).json({

                    success: false,
                    message: "Too many files uploaded."

                });

            case "LIMIT_UNEXPECTED_FILE":

                return res.status(400).json({

                    success: false,
                    message: "Unexpected file received."

                });

            default:

                return res.status(400).json({

                    success: false,
                    message: err.message

                });

        }

    }

    next(err);

});

// ======================================================
// CORS ERRORS
// ======================================================

app.use((err, req, res, next) => {

    if (err.message === "Not allowed by CORS") {

        return res.status(403).json({

            success: false,
            message: "CORS blocked this request."

        });

    }

    next(err);

});

// ======================================================
// GLOBAL ERROR HANDLER
// ======================================================

app.use((err, req, res, next) => {

    console.error("====================================");
    console.error("SERVER ERROR");
    console.error("URL:", req.originalUrl);
    console.error("METHOD:", req.method);
    console.error(err.stack);
    console.error("====================================");

    res.status(err.status || 500).json({

        success: false,
        message:
            process.env.NODE_ENV === "production"
                ? "Internal Server Error"
                : err.message

    });

});

// ======================================================
// 404
// ======================================================

app.use((req, res) => {

    res.status(404).json({

        success: false,
        message: "Route not found.",

        route: req.originalUrl,

        method: req.method

    });

});

// ======================================================
// START SERVER
// ======================================================

const server = app.listen(PORT, HOST, async () => {

    console.clear();

    const localIPs = getLocalIPs();

    console.log(`
========================================================
🎵               CAVE TUNES SERVER
========================================================

Status      : 🟢 Running
Environment : ${process.env.NODE_ENV || "development"}
Host        : ${HOST}
Port        : ${PORT}

--------------------------------------------------------
🌐 LOCAL ACCESS
--------------------------------------------------------

http://localhost:${PORT}
http://127.0.0.1:${PORT}
`);

    if (localIPs.length > 0) {

        console.log(`
--------------------------------------------------------
📱 NETWORK ACCESS
--------------------------------------------------------
`);

        localIPs.forEach(ip => {

            console.log(`http://${ip}:${PORT}`);

        });

    }

    console.log(`
--------------------------------------------------------
📦 API ENDPOINTS
--------------------------------------------------------

API Root        : /api
Authentication  : /api/auth
Music           : /api/music
Upload          : /api/upload
Creator         : /api/creator
Admin           : /api/admin

--------------------------------------------------------
📁 STATIC STORAGE
--------------------------------------------------------

Uploads:
http://localhost:${PORT}/uploads

Health Check:
http://localhost:${PORT}/health

========================================================
`);

    try {

        await db.query("SELECT NOW()");

        console.log("✅ PostgreSQL Connected Successfully");

    } catch (error) {

        console.error("❌ PostgreSQL Connection Failed");
        console.error(error.message);

    }

    console.log("\n🚀 Cave Tunes is ready.\n");

    startRadioReminderScheduler();

});

// ======================================================
// SERVER CONFIGURATION
// ======================================================

// Large uploads
server.timeout = 30 * 60 * 1000;

// Keep Alive
server.keepAliveTimeout = 65000;

// Headers timeout
server.headersTimeout = 70000;

// ======================================================
// GRACEFUL SHUTDOWN
// ======================================================

function shutdown(signal) {

    console.log(`
========================================================
🛑 ${signal} received
Stopping Cave Tunes...
========================================================
`);

    server.close(async () => {

        console.log("✅ HTTP Server Closed");

        try {

            if (db && typeof db.end === "function") {

                await db.end();

                console.log("✅ PostgreSQL Connection Closed");

            }

        } catch (error) {

            console.error("Database shutdown error:");
            console.error(error.message);

        }

        console.log("👋 Goodbye!");

        process.exit(0);

    });

    setTimeout(() => {

        console.error("⚠️ Force shutdown.");

        process.exit(1);

    }, 10000);

}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

// ======================================================
// UNHANDLED ERRORS
// ======================================================

process.on("unhandledRejection", error => {

    console.error("\nUNHANDLED PROMISE REJECTION");
    console.error(error);

});

process.on("uncaughtException", error => {

    console.error("\nUNCAUGHT EXCEPTION");
    console.error(error);

});

// ======================================================
// END OF SERVER
// ======================================================