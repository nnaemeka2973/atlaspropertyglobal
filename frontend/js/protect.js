/**
 * Atlas Property Group
 * Route Protection
 */

(function () {
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';

    // Do not force navigation away from the page.
    // The page should remain visible without auto-loading elsewhere.
    const user = JSON.parse(localStorage.getItem("atlas_user") || "null");
    if (!user) {
        return;
    }
})();