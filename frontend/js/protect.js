/**
 * Atlas Property Group
 * Route Protection
 */

(function () {
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    const redirectUrl = `login.html?redirect=${encodeURIComponent(currentPage)}`;

    function redirectIfUnauthorized() {
        const user = JSON.parse(localStorage.getItem("atlas_user") || "null");
        if (!user) {
            window.location.replace(redirectUrl);
        }
    }

    if (localStorage.getItem("atlas_user")) {
        return;
    }

    const authStateTimeout = setTimeout(redirectIfUnauthorized, 800);

    window.addEventListener('atlas-auth-state', () => {
        clearTimeout(authStateTimeout);
        redirectIfUnauthorized();
    });
})();