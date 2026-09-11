import {
    auth,
    googleProvider
} from "./firebase-config.js";

import {
    signInWithPopup,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    updateProfile,
    sendPasswordResetEmail,
    signOut,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";

const USER_KEY = "atlas_user";

let googleSignInInProgress = false;


/* =========================================================
   PAGE / REDIRECT HELPERS
   ========================================================= */

function getCurrentPagePath() {
    return `${window.location.pathname.split("/").pop() || "index.html"}${window.location.search}${window.location.hash}`;
}

function rememberLoginRedirect() {
    sessionStorage.setItem(
        "atlas_login_redirect",
        getCurrentPagePath()
    );
}

function getPostLoginRedirect() {
    const storedRedirect =
        sessionStorage.getItem("atlas_login_redirect");

    if (storedRedirect) {
        sessionStorage.removeItem("atlas_login_redirect");
        return storedRedirect;
    }

    const currentPath = getCurrentPagePath();

    if (
        currentPath &&
        currentPath !== "login.html" &&
        currentPath !== "signup.html" &&
        currentPath !== "forgot-password.html"
    ) {
        return currentPath;
    }

    return "index.html";
}


/* =========================================================
   SAVE USER
   ========================================================= */

async function saveUser(user) {
    const token = await user
        .getIdToken()
        .catch(() => null);

    window.__atlasAuthToken = token;

    const providerDisplayName = String(
        user.providerData?.[0]?.displayName || ""
    ).trim();

    const displayName = String(
        user.displayName ||
        providerDisplayName ||
        ""
    ).trim();

    localStorage.setItem(
        USER_KEY,
        JSON.stringify({
            id: user.uid,
            uid: user.uid,
            email: user.email,

            fullName:
                displayName || "",

            name:
                displayName || user.email,

            displayName:
                displayName || "",

            providerDisplayName:
                providerDisplayName || "",

            photo:
                user.photoURL || null,

            photo_url:
                user.photoURL || null
        })
    );
}


/* =========================================================
   SYNC SAVED PROPERTIES
   ========================================================= */

/**
 * Sync locally saved properties to the backend
 * when the user logs in.
 */
async function syncSavedPropertiesToBackend() {
    try {

        const saved =
            localStorage.getItem(
                "atlasSavedProperties"
            );

        if (!saved) {
            return;
        }

        const properties =
            JSON.parse(saved);

        if (
            !Array.isArray(properties) ||
            properties.length === 0
        ) {
            return;
        }

        /*
         * Only sync if addFavorite is available.
         */
        if (
            typeof addFavorite === "undefined"
        ) {
            return;
        }

        console.log(
            `Syncing ${properties.length} saved properties to backend...`
        );

        for (const property of properties) {

            try {

                await addFavorite({
                    property_id: property.id,
                    ...property
                });

            } catch (err) {

                console.warn(
                    `Failed to sync property ${property.id}:`,
                    err
                );

                /*
                 * Continue syncing the remaining properties.
                 */
            }
        }

        console.log(
            "Saved properties synced to backend successfully"
        );

    } catch (err) {

        console.error(
            "Error syncing saved properties to backend:",
            err
        );
    }
}


/* =========================================================
   CLEAR AUTH STATE
   ========================================================= */

/**
 * Clear ONLY authentication-related data.
 *
 * IMPORTANT:
 * We intentionally DO NOT clear:
 *
 * - atlasSavedProperties
 * - theme
 * - other Atlas website preferences
 * - recently viewed properties
 * - search preferences
 *
 * Logging out should not erase the user's browser data.
 */
function clearAuthState() {

    // Remove Firebase token from memory
    window.__atlasAuthToken = null;

    // Remove only the logged-in user information
    localStorage.removeItem(USER_KEY);

    // Remove temporary login redirect
    sessionStorage.removeItem(
        "atlas_login_redirect"
    );
}


/* =========================================================
   REDIRECT AFTER LOGIN
   ========================================================= */

function redirectAfterAuth() {
    const shouldSkipAutoRedirect =
        window.location.protocol === "file:" ||
        window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1";

    if (shouldSkipAutoRedirect) {
        return;
    }

    window.location.replace(
        getPostLoginRedirect()
    );
}


/* =========================================================
   FIREBASE ERROR HANDLING
   ========================================================= */

/**
 * Convert Firebase authentication errors
 * into professional user-friendly messages.
 *
 * Returns null when the error should remain silent.
 */
function getAuthErrorMessage(
    error,
    type = "general"
) {

    const code =
        error?.code || "";

    switch (code) {

        /*
         * GOOGLE POPUP
         *
         * These are normal user actions.
         * DO NOT show an alert.
         */

        case "auth/popup-closed-by-user":
            return null;

        case "auth/cancelled-popup-request":
            return null;


        /*
         * GOOGLE POPUP BLOCKED
         */

        case "auth/popup-blocked":
            return "Your browser blocked the Google sign-in window. Please allow pop-ups and try again.";


        /*
         * GOOGLE ACCOUNT
         */

        case "auth/account-exists-with-different-credential":
            return "An account already exists with this email using a different sign-in method.";


        /*
         * EMAIL LOGIN
         */

        case "auth/invalid-credential":
        case "auth/wrong-password":
        case "auth/user-not-found":
            return "Incorrect email or password.";

        case "auth/invalid-email":
            return "Please enter a valid email address.";

        case "auth/user-disabled":
            return "This account has been disabled. Please contact support.";

        case "auth/too-many-requests":
            return "Too many attempts. Please wait a little while and try again.";


        /*
         * SIGN UP
         */

        case "auth/email-already-in-use":
            return "An account already exists with this email address.";

        case "auth/weak-password":
            return "Please choose a stronger password.";


        /*
         * PASSWORD RESET
         */

        case "auth/missing-email":
            return "Please enter your email address.";


        /*
         * NETWORK
         */

        case "auth/network-request-failed":
            return "A network error occurred. Please check your internet connection and try again.";


        /*
         * DEFAULT
         *
         * Keep technical Firebase details away
         * from the customer.
         */

        default:

            console.error(
                `Unexpected Firebase authentication error (${type}):`,
                error
            );

            return "Unable to complete your request right now. Please try again.";
    }
}


/* =========================================================
   AUTHENTICATION BUTTONS
   ========================================================= */

function bindAuthButtons() {

    /* =====================================================
       GOOGLE LOGIN / GOOGLE SIGNUP
       ===================================================== */

    const googleButton =
        document.getElementById(
            "google-login-btn"
        ) ||
        document.getElementById(
            "google-signup-btn"
        );

    googleButton?.addEventListener(
        "click",
        async (event) => {

            event.preventDefault();

            /*
             * Prevent multiple popup requests.
             */
            if (
                googleSignInInProgress
            ) {
                return;
            }

            googleSignInInProgress =
                true;

            googleButton.disabled =
                true;

            googleButton.setAttribute(
                "aria-busy",
                "true"
            );

            try {

                googleProvider.setCustomParameters({
                    prompt: "select_account"
                });

                await signInWithPopup(
                    auth,
                    googleProvider
                );

            } catch (error) {

                /*
                 * IMPORTANT:
                 *
                 * The user closing the popup is NOT
                 * considered an error.
                 *
                 * Do absolutely nothing.
                 */

                if (
                    error.code ===
                        "auth/popup-closed-by-user" ||
                    error.code ===
                        "auth/cancelled-popup-request"
                ) {
                    return;
                }

                /*
                 * Handle unexpected Google errors.
                 */

                const message =
                    getAuthErrorMessage(
                        error,
                        "Google sign-in"
                    );

                if (message) {
                    alert(message);
                }

            } finally {

                googleSignInInProgress =
                    false;

                googleButton.disabled =
                    false;

                googleButton.removeAttribute(
                    "aria-busy"
                );
            }
        }
    );


    /* =====================================================
       EMAIL LOGIN
       ===================================================== */

    document
        .getElementById("login-form")
        ?.addEventListener(
            "submit",
            async (event) => {

                event.preventDefault();

                const email =
                    document
                        .getElementById(
                            "login-email"
                        )
                        ?.value
                        ?.trim();

                const password =
                    document
                        .getElementById(
                            "login-password"
                        )
                        ?.value || "";

                if (!email) {
                    alert(
                        "Please enter your email address."
                    );
                    return;
                }

                if (!password) {
                    alert(
                        "Please enter your password."
                    );
                    return;
                }

                try {

                    await signInWithEmailAndPassword(
                        auth,
                        email,
                        password
                    );

                } catch (error) {

                    const message =
                        getAuthErrorMessage(
                            error,
                            "email sign-in"
                        );

                    if (message) {
                        alert(message);
                    }
                }
            }
        );


    /* =====================================================
       SIGN UP
       ===================================================== */

    document
        .getElementById("signup-form")
        ?.addEventListener(
            "submit",
            async (event) => {

                event.preventDefault();

                const name =
                    document
                        .getElementById(
                            "reg-name"
                        )
                        ?.value
                        ?.trim();

                const email =
                    document
                        .getElementById(
                            "reg-email"
                        )
                        ?.value
                        ?.trim();

                const password =
                    document
                        .getElementById(
                            "reg-password"
                        )
                        ?.value || "";

                if (!name) {
                    alert(
                        "Please enter your name."
                    );
                    return;
                }

                if (!email) {
                    alert(
                        "Please enter your email address."
                    );
                    return;
                }

                if (!password) {
                    alert(
                        "Please enter a password."
                    );
                    return;
                }

                try {

                    const credential =
                        await createUserWithEmailAndPassword(
                            auth,
                            email,
                            password
                        );

                    await updateProfile(
                        credential.user,
                        {
                            displayName: name
                        }
                    );

                    alert(
                        "Account created successfully!"
                    );

                    window.location.href =
                        "login.html";

                } catch (error) {

                    const message =
                        getAuthErrorMessage(
                            error,
                            "account creation"
                        );

                    if (message) {
                        alert(message);
                    }
                }
            }
        );


    /* =====================================================
       FORGOT PASSWORD
       ===================================================== */

    document
        .getElementById(
            "forgot-password-form"
        )
        ?.addEventListener(
            "submit",
            async (event) => {

                event.preventDefault();

                const email =
                    document
                        .getElementById(
                            "reset-email"
                        )
                        ?.value
                        ?.trim();

                if (!email) {
                    alert(
                        "Please enter your email."
                    );
                    return;
                }

                try {

                    await sendPasswordResetEmail(
                        auth,
                        email,
                        {
                            url:
                                `${window.location.origin}/reset-password.html`,
                            handleCodeInApp:
                                true
                        }
                    );

                    alert(
                        "Password reset email sent. Check your inbox and follow the instructions."
                    );

                } catch (error) {

                    const message =
                        getAuthErrorMessage(
                            error,
                            "password reset"
                        );

                    if (message) {
                        alert(message);
                    }
                }
            }
        );


    /* =====================================================
       LOGIN REDIRECT MEMORY
       ===================================================== */

    document.addEventListener(
        "click",
        (event) => {

            const loginLink =
                event.target.closest(
                    'a[href="login.html"], ' +
                    'a[href="/login.html"], ' +
                    'a[href$="/login.html"]'
                );

            if (loginLink) {
                rememberLoginRedirect();
            }
        }
    );
}


/* =========================================================
   AUTH STATE
   ========================================================= */

function initAuthState() {

    onAuthStateChanged(
        auth,
        async (user) => {

            if (user) {

                /*
                 * Save authenticated user
                 */
                await saveUser(user);


                /*
                 * Synchronize locally saved properties
                 * with the backend.
                 */
                syncSavedPropertiesToBackend()
                    .catch((err) => {

                        console.warn(
                            "Failed to sync saved properties:",
                            err
                        );
                    });


                /*
                 * Redirect authenticated users
                 * away from login/signup pages.
                 */
                const page =
                    window.location.pathname
                        .split("/")
                        .pop();

                if (
                    page === "login.html" ||
                    page === "signup.html" ||
                    page === "forgot-password.html"
                ) {
                    const shouldSkipAutoRedirect =
                        window.location.protocol === "file:" ||
                        window.location.hostname === "localhost" ||
                        window.location.hostname === "127.0.0.1";

                    if (!shouldSkipAutoRedirect) {
                        redirectAfterAuth();
                    }
                }


                /*
                 * Tell the rest of Atlas that
                 * authentication state changed.
                 */
                window.dispatchEvent(
                    new Event(
                        "atlas-auth-state"
                    )
                );

            } else {

                /*
                 * User is logged out.
                 *
                 * This now removes ONLY authentication
                 * information.
                 *
                 * Saved properties remain.
                 */
                clearAuthState();

                window.dispatchEvent(
                    new Event(
                        "atlas-auth-state"
                    )
                );
            }
        }
    );
}


/* =========================================================
   LOGOUT
   ========================================================= */

export async function logoutUser() {

    try {

        await signOut(auth);

        /*
         * Remove authentication data only.
         *
         * atlasSavedProperties remains.
         */
        clearAuthState();

        /*
         * Keep Google account selection behavior.
         */
        googleProvider.setCustomParameters({
            prompt: "select_account"
        });

        /*
         * Return user to login page.
         */
        window.location.replace(
            "login.html"
        );

    } catch (error) {

        /*
         * Keep technical details in developer console.
         */
        console.error(
            "Logout error:",
            error
        );

        /*
         * Show professional user-facing message.
         */
        alert(
            "Unable to sign you out right now. Please try again."
        );
    }
}

window.logoutUser = logoutUser;


/* =========================================================
   INITIALIZE
   ========================================================= */

if (
    document.readyState === "loading"
) {

    window.addEventListener(
        "DOMContentLoaded",
        () => {

            bindAuthButtons();
            initAuthState();

        }
    );

} else {

    bindAuthButtons();
    initAuthState();
}