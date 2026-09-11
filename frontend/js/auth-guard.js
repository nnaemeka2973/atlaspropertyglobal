// Auto-redirect disabled intentionally so the page does not navigate away on its own.
// Authentication checks remain available without forcing a login redirect.
(function () {
    const user = JSON.parse(localStorage.getItem("atlas_user") || "null");
    if (!user) {
        return;
    }
})();