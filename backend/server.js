
/**
 * Atlas Property Group
 * Main Express Server
 */

const path = require("path");

require("dotenv").config({
    path: path.join(__dirname, ".env")
});

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");

const supabase = require("./config/supabase");

const propertyRoutes = require("./routes/propertyRoutes");
const favoriteRoutes = require("./routes/favoriteRoutes");
const contactRoutes = require("./routes/contactRoutes");
const aiRoutes = require("./routes/aiRoutes");

const app = express();

// ============================================================
// ENVIRONMENT
// ============================================================

const isProduction = process.env.NODE_ENV === "production";
const isDevelopment = !isProduction;
const PORT = process.env.PORT || 5000;

// ============================================================
// CORS CONFIGURATION
// ============================================================

const allowedOrigins = [
    // Local development
    "http://127.0.0.1:5501",
    "http://localhost:5501",

    // Vercel
    "https://atlaspropertyglobal.vercel.app",

    // Custom domain
    "https://atlaspropertyglobal.com",
    "https://www.atlaspropertyglobal.com"
];

const corsOptions = {
    origin: function (origin, callback) {

        // Allow Postman, curl, server-to-server requests
        if (!origin) {
            return callback(null, true);
        }

        // Allow file:// during development
        if (isDevelopment && origin === "null") {
            return callback(null, true);
        }

        // Allow localhost during development
        if (
            isDevelopment &&
            (
                origin.includes("localhost") ||
                origin.includes("127.0.0.1")
            )
        ) {
            return callback(null, true);
        }

        // Allow production domains
        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }

        console.log(`CORS blocked origin: ${origin}`);

        return callback(new Error("Not allowed by CORS"));
    },

    methods: [
        "GET",
        "POST",
        "PUT",
        "PATCH",
        "DELETE",
        "OPTIONS"
    ],

    allowedHeaders: [
        "Content-Type",
        "Authorization"
    ],

    credentials: true,

    optionsSuccessStatus: 204
};

// ============================================================
// MIDDLEWARE
// ============================================================

app.use(cors(corsOptions));
app.use(express.json());
app.use(helmet());
app.use(compression());
app.use(morgan("dev"));

// ============================================================
// RATE LIMIT
// ============================================================

const apiRateLimit =
    Number(process.env.API_RATE_LIMIT) ||
    (isProduction ? 100 : 1000);

app.use(
    rateLimit({
        windowMs: 15 * 60 * 1000,
        max: apiRateLimit,
        standardHeaders: true,
        legacyHeaders: false,
        skip: (req) =>
            isDevelopment &&
            ["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(req.ip)
    })
);

// ============================================================
// ROOT
// ============================================================

app.get("/", (req, res) => {
    res.json({
        success: true,
        data: null,
        message: "Atlas Property Group API is running 🚀"
    });
});

// ============================================================
// DATABASE TEST
// ============================================================

app.get("/api/test-db", async (req, res) => {
    try {
        const { data, error } = await supabase
            .from("properties")
            .select("*")
            .limit(5);

        if (error) throw error;

        res.json({
            success: true,
            data
        });

    } catch (err) {
        console.error("Database test failed:", err);

        res.status(500).json({
            success: false,
            message: err.message
        });
    }
});

// ============================================================
// ROUTES
// ============================================================

app.use("/api/properties", propertyRoutes);
app.use("/api/favorites", favoriteRoutes);
app.use("/api/contact", contactRoutes);
app.use("/api/ai", aiRoutes);

// ============================================================
// DASHBOARD HELPER
// ============================================================

async function getUserCount(userId, tables, column = "user_id") {

    if (!userId) return 0;

    for (const table of tables) {

        try {

            let query = supabase
                .from(table)
                .select("*", {
                    count: "exact",
                    head: true
                });

            if (column) {
                query = query.eq(column, userId);
            }

            const { count, error } = await query;

            if (!error && typeof count === "number") {
                return count;
            }

        } catch {
            continue;
        }
    }

    return 0;
}

// ============================================================
// DASHBOARD STATS
// ============================================================

app.get("/api/dashboard/stats", async (req, res) => {

    const { userId } = req.query;

    if (!userId) {
        return res.status(400).json({
            success: false,
            message: "User ID is required."
        });
    }

    try {

        const [
            savedProperties,
            recentlyViewed,
            scheduledTours,
            savedSearches,
            messages
        ] = await Promise.all([

            getUserCount(
                userId,
                [
                    "favorites",
                    "saved_properties",
                    "property_favorites"
                ]
            ),

            getUserCount(
                userId,
                [
                    "recently_viewed",
                    "recently_viewed_properties",
                    "property_views"
                ]
            ),

            getUserCount(
                userId,
                [
                    "tours",
                    "tour_requests",
                    "appointments",
                    "scheduled_tours"
                ]
            ),

            getUserCount(
                userId,
                [
                    "saved_searches",
                    "search_filters"
                ]
            ),

            getUserCount(
                userId,
                [
                    "messages",
                    "user_messages"
                ]
            )

        ]);

        res.json({
            success: true,
            data: {
                savedProperties,
                recentlyViewed,
                scheduledTours,
                savedSearches,
                messages,
                notifications: 0
            }
        });

    } catch (error) {

        console.error("Dashboard stats failed:", error);

        res.status(500).json({
            success: false,
            message: error.message
        });

    }

});

// ============================================================
// ERROR HANDLER
// ============================================================

app.use((err, req, res, next) => {

    console.error("Global server error:", err.stack || err);

    if (err.message === "Not allowed by CORS") {
        return res.status(403).json({
            success: false,
            message: "CORS policy blocked this origin."
        });
    }

    res.status(500).json({
        success: false,
        message: err.message || "Internal Server Error"
    });

});

// ============================================================
// PROCESS HANDLERS
// ============================================================

function logErrorSafe(error) {

    if (!error) return;

    const message = error?.message || String(error);

    const stack = error?.stack
        ? error.stack.split("\n").slice(0, 5).join("\n")
        : null;

    console.error("[FATAL]", message);

    if (stack) {
        console.error(stack);
    }

}

process.on("unhandledRejection", (reason) => {

    console.error(
        "[unhandledRejection]",
        reason?.message || reason
    );

    if (reason?.stack) {
        console.error(reason.stack);
    }

});

process.on("uncaughtException", (error) => {

    console.error("[uncaughtException]");

    logErrorSafe(error);

    if (isProduction) {
        process.exit(1);
    }

});

// ============================================================
// START SERVER
// ============================================================

console.log(`Starting Atlas Property Group API on port ${PORT}...`);

const server = app.listen(PORT, () => {

    console.log("");
    console.log("==========================================");
    console.log(`🚀 Atlas Property Group API running on port ${PORT}`);
    console.log("==========================================");

    console.log("🌐 Allowed frontend origins:");

    allowedOrigins.forEach((origin) => {
        console.log(`   ✓ ${origin}`);
    });

    console.log("");

    console.log(
        `📧 COMPANY_EMAIL configured: ${
            process.env.COMPANY_EMAIL ? "YES" : "NO"
        }`
    );

    console.log(
        `🔑 RESEND_API_KEY configured: ${
            process.env.RESEND_API_KEY ? "YES" : "NO"
        }`
    );

    console.log("");

});

server.on("error", (error) => {

    console.error("[SERVER ERROR] Failed to start server:");

    logErrorSafe(error);

    process.exit(1);

});

