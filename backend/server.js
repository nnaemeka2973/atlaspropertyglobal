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

const isProduction =
    process.env.NODE_ENV === "production";

const isDevelopment = !isProduction;

const PORT =
    process.env.PORT || 5000;


// ============================================================
// CORS CONFIGURATION
// ============================================================

const allowedOrigins = [
    "http://127.0.0.1:5501",
    "http://localhost:5501"
];

const corsOptions = {
    origin: function (origin, callback) {

        // Allow requests without an Origin header.
        // Useful for Postman, curl, server-to-server requests, etc.
        if (!origin) {
            return callback(null, true);
        }

        // Allow file:// and null origins in development.
        if (isDevelopment && origin === 'null') {
            return callback(null, true);
        }

        if (isDevelopment) {
            return callback(null, true);
        }

        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }

        console.log(
            `CORS blocked origin: ${origin}`
        );

        return callback(
            new Error("Not allowed by CORS")
        );
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
// CORS MIDDLEWARE
// ============================================================

// IMPORTANT:
// Do NOT use app.options("*", ...)
// because the current Express/router version
// does not support "*" as a route pattern.

app.use(cors(corsOptions));


// ============================================================
// BODY PARSER
// ============================================================

app.use(express.json());


// ============================================================
// SECURITY / PERFORMANCE / LOGGING
// ============================================================

app.use(helmet());

app.use(compression());

app.use(morgan("dev"));


// ============================================================
// RATE LIMITING
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
            [
                "127.0.0.1",
                "::1",
                "::ffff:127.0.0.1"
            ].includes(req.ip)
    })
);


// ============================================================
// ROOT API TEST
// ============================================================

app.get("/", (req, res) => {

    res.json({
        success: true,
        data: null,
        message:
            "Atlas Property Group API is running 🚀"
    });

});


// ============================================================
// DATABASE TEST
// ============================================================

app.get("/api/test-db", async (req, res) => {

    try {

        const {
            data,
            error
        } = await supabase
            .from("properties")
            .select("*")
            .limit(5);

        if (error) {
            throw error;
        }

        res.json({
            success: true,
            data
        });

    } catch (err) {

        console.error(
            "Database test failed:",
            err
        );

        res.status(500).json({
            success: false,
            message: err.message
        });

    }

});


// ============================================================
// API ROUTES
// ============================================================

// Properties
app.use(
    "/api/properties",
    propertyRoutes
);


// Favorites
app.use(
    "/api/favorites",
    favoriteRoutes
);


// Contact
//
// POST /api/contact
// POST /api/contact/inquiry
// GET  /api/contact
//
app.use(
    "/api/contact",
    contactRoutes
);


// AI
app.use(
    "/api/ai",
    aiRoutes
);


// ============================================================
// DASHBOARD COUNT HELPER
// ============================================================

async function getUserCount(
    userId,
    tables,
    column = "user_id"
) {

    if (!userId) {
        return 0;
    }

    for (const table of tables) {

        try {

            let query = supabase
                .from(table)
                .select("*", {
                    count: "exact",
                    head: true
                });

            if (column) {

                query = query.eq(
                    column,
                    userId
                );

            }

            const {
                count,
                error
            } = await query;

            if (
                !error &&
                typeof count === "number"
            ) {

                return count;

            }

        } catch (error) {

            // Try the next table
            continue;

        }

    }

    return 0;
}


// ============================================================
// DASHBOARD STATISTICS
// ============================================================

app.get(
    "/api/dashboard/stats",
    async (req, res) => {

        const {
            userId
        } = req.query;

        if (!userId) {

            return res.status(400).json({
                success: false,
                message:
                    "User ID is required."
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

                // Saved properties
                getUserCount(
                    userId,
                    [
                        "favorites",
                        "saved_properties",
                        "property_favorites"
                    ]
                ),

                // Recently viewed
                getUserCount(
                    userId,
                    [
                        "recently_viewed",
                        "recently_viewed_properties",
                        "property_views"
                    ],
                    "user_id"
                ),

                // Scheduled tours
                getUserCount(
                    userId,
                    [
                        "tours",
                        "tour_requests",
                        "appointments",
                        "scheduled_tours"
                    ],
                    "user_id"
                ),

                // Saved searches
                getUserCount(
                    userId,
                    [
                        "saved_searches",
                        "search_filters"
                    ],
                    "user_id"
                ),

                // Messages
                getUserCount(
                    userId,
                    [
                        "messages",
                        "user_messages"
                    ],
                    "user_id"
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

            console.error(
                "Dashboard stats failed:",
                error
            );

            res.status(500).json({

                success: false,

                message:
                    error.message

            });

        }

    }
);


// ============================================================
// GLOBAL ERROR HANDLER
// ============================================================

app.use(
    (err, req, res, next) => {

        console.error(
            "Global server error:",
            err.stack || err
        );

        // Handle CORS errors
        if (
            err.message ===
            "Not allowed by CORS"
        ) {

            return res.status(403).json({

                success: false,

                message:
                    "CORS policy blocked this origin."

            });

        }

        res.status(500).json({

            success: false,

            message:
                err.message ||
                "Internal Server Error"

        });

    }
);


// ============================================================
// GLOBAL PROCESS HANDLERS
// ============================================================

function logErrorSafe(error) {
    if (!error) return;
    const message = error?.message || String(error);
    const stack = error?.stack ? error.stack.split('\n').slice(0, 5).join('\n') : null;
    console.error("[FATAL]", message);
    if (stack) {
        console.error(stack);
    }
}

process.on('unhandledRejection', (reason, promise) => {
    console.error('[unhandledRejection] Promise rejected:', reason && reason.message ? reason.message : reason);
    if (reason && reason.stack) {
        console.error(reason.stack);
    }
});

process.on('uncaughtException', (error) => {
    console.error('[uncaughtException] Unhandled exception:');
    logErrorSafe(error);
    // Keep the process alive for debugging in development,
    // but exit with failure in production to avoid unknown state.
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
    console.log("🚀 Atlas Property Group API running on http://localhost:" + PORT);
    console.log("==========================================");
    console.log("🌐 Allowed frontend origins:");

    allowedOrigins.forEach((origin) => {
        console.log(`   ✓ ${origin}`);
    });

    console.log("");
    console.log(`📧 COMPANY_EMAIL configured: ${process.env.COMPANY_EMAIL ? "YES" : "NO"}`);
    console.log(`🔑 RESEND_API_KEY configured: ${process.env.RESEND_API_KEY ? "YES" : "NO"}`);
    console.log("");
});

server.on('error', (error) => {
    console.error('[SERVER ERROR] Failed to start server:');
    logErrorSafe(error);
    process.exit(1);
});
