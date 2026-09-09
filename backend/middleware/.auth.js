const admin = require("firebase-admin");
const path = require("path");

let firebaseAdminApp;

function getFirebaseAdmin() {
    if (firebaseAdminApp) {
        return firebaseAdminApp;
    }

    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT || process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    const googleCredentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

    let credential;

    if (serviceAccountJson) {
        try {
            const parsed = typeof serviceAccountJson === 'string' ? JSON.parse(serviceAccountJson) : serviceAccountJson;
            credential = admin.credential.cert(parsed);
        } catch (error) {
            console.error('[firebase-admin] Invalid FIREBASE_SERVICE_ACCOUNT JSON:', error.message);
        }
    }

    if (!credential && googleCredentialsPath) {
        credential = admin.credential.cert(path.resolve(googleCredentialsPath));
    }

    if (!credential) {
        credential = admin.credential.applicationDefault();
    }

    firebaseAdminApp = admin.initializeApp({ credential });
    return firebaseAdminApp;
}

async function requireAuth(req, res, next) {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({
                success: false,
                message: "Authorization header is missing or malformed."
            });
        }

        const token = authHeader.replace("Bearer ", "").trim();
        const firebaseAdmin = getFirebaseAdmin();
        const decodedToken = await firebaseAdmin.auth().verifyIdToken(token);

        if (!decodedToken || !decodedToken.uid) {
            return res.status(401).json({
                success: false,
                message: "Invalid or expired session."
            });
        }

        req.user = {
            id: decodedToken.uid,
            email: decodedToken.email || null,
            name: decodedToken.name || decodedToken.email || null,
            picture: decodedToken.picture || null
        };

        next();
    } catch (err) {
        return res.status(401).json({
            success: false,
            message: err.message || "Unauthorized."
        });
    }
}

module.exports = requireAuth;