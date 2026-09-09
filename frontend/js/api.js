const API_BASE_URL = (() => {
    if (typeof window === "undefined") {
        return "http://localhost:5000/api";
    }

    const currentOrigin = window.location.origin;
    if (!currentOrigin || currentOrigin === "null") {
        return "http://localhost:5000/api";
    }

    if (currentOrigin === "file://") {
        return "http://localhost:5000/api";
    }

    // Frontend running on Live Server (5500/5501) should point to backend (5000)
    if (currentOrigin.includes("localhost") && !currentOrigin.includes(":5000")) {
        return "http://localhost:5000/api";
    }

    if (currentOrigin === "http://localhost:5000" || currentOrigin === "http://127.0.0.1:5000") {
        return `${currentOrigin}/api`;
    }

    return "http://localhost:5000/api";
})();

window.HARD_CODED_PROPERTIES = [];
window.HARDCODED_PROPERTIES = [];

function getHardcodedProperty() {
    return null;
}

function getHardcodedSimilarHomes() {
    return [];
}

function notifyDashboardRefresh() {
    if (typeof window === "undefined") return;

    window.dispatchEvent(new CustomEvent("atlas:dashboard-refresh"));

    try {
        localStorage.setItem("atlas_dashboard_refresh", String(Date.now()));
    } catch (error) {
        console.warn("Unable to notify dashboard refresh:", error);
    }
}

async function fetchWithErrorHandling(url, options = {}) {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 8000);

    try {
        const response = await fetch(url, { ...options, signal: controller.signal });

        let payload = null;

        try {
            payload = await response.json();
        } catch {
            payload = null;
        }

        if (!response.ok) {
            throw new Error(payload?.message || `Request failed (${response.status})`);
        }

        return payload;
    } finally {
        window.clearTimeout(timeoutId);
    }
}

/* ===========================================
   GET PROPERTY LIST
=========================================== */

async function getProperties(filters = {}) {
    const params = new URLSearchParams();
    Object.entries(filters || {}).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
            params.append(key, String(value));
        }
    });

    const url = `${API_BASE_URL}/properties${params.toString() ? `?${params.toString()}` : ''}`;
    const response = await fetchWithErrorHandling(url);

    return response || {
        data: {
            home_search: {
                results: []
            }
        }
    };
}

async function getPropertyDetails(propertyId) {
    const id = encodeURIComponent(String(propertyId || ''));
    const response = await fetchWithErrorHandling(`${API_BASE_URL}/properties/${id}`);
    return response || {
        data: {
            home: null,
            property: null,
            home_search: { results: [] }
        }
    };
}

async function getPropertyPhotos(propertyId) {
    const id = encodeURIComponent(String(propertyId || ''));
    const response = await fetchWithErrorHandling(`${API_BASE_URL}/properties/${id}/photos`);
    return {
        data: response?.data || response || { photos: [] },
        photos: Array.isArray(response?.data) ? response.data : Array.isArray(response?.photos) ? response.photos : []
    };
}

async function getSimilarHomes(propertyId) {
    const id = encodeURIComponent(String(propertyId || ''));
    const response = await fetchWithErrorHandling(`${API_BASE_URL}/properties/${id}/similar`);
    return {
        data: response?.data || response || { results: [] },
        results: Array.isArray(response?.results) ? response.results : Array.isArray(response?.data?.results) ? response.data.results : []
    };
}

async function getPropertyFeatures(propertyId) {
    const id = encodeURIComponent(String(propertyId || ''));
    const response = await fetchWithErrorHandling(`${API_BASE_URL}/properties/${id}/features`);
    return response || { data: { features: [] } };
}

async function getPropertyRooms(propertyId) {
    const id = encodeURIComponent(String(propertyId || ''));
    const response = await fetchWithErrorHandling(`${API_BASE_URL}/properties/${id}/rooms`);
    return response || { data: { rooms: [] }, rooms: [] };
}

async function getPropertyNearby(propertyId) {
    const id = encodeURIComponent(String(propertyId || ''));
    const response = await fetchWithErrorHandling(`${API_BASE_URL}/properties/${id}/nearby`);
    return response || { data: { nearby: [] } };
}

async function getPropertyHistory(propertyId) {
    const id = encodeURIComponent(String(propertyId || ''));
    const response = await fetchWithErrorHandling(`${API_BASE_URL}/properties/${id}/history`);
    return response || { data: { history: [] } };
}

async function getPropertyTaxHistory(propertyId) {
    const id = encodeURIComponent(String(propertyId || ''));
    const response = await fetchWithErrorHandling(`${API_BASE_URL}/properties/${id}/tax-history`);
    return response || { data: { tax_history: [] } };
}

async function getPropertyAgent(propertyId) {
    const id = encodeURIComponent(String(propertyId || ''));
    const response = await fetchWithErrorHandling(`${API_BASE_URL}/properties/${id}/agent`);
    return response || { data: { agent: null } };
}

async function getPropertyMortgage(propertyId) {
    const id = encodeURIComponent(String(propertyId || ''));
    const response = await fetchWithErrorHandling(`${API_BASE_URL}/properties/${id}/mortgage`);
    return response || { data: { mortgage: null } };
}

async function getPropertyInvestment(propertyId) {
    const id = encodeURIComponent(String(propertyId || ''));
    const response = await fetchWithErrorHandling(`${API_BASE_URL}/properties/${id}/investment`);
    return response || { data: { investment: null } };
}

async function getPropertyDocuments(propertyId) {
    const id = encodeURIComponent(String(propertyId || ''));
    const response = await fetchWithErrorHandling(`${API_BASE_URL}/properties/${id}/documents`);
    return response || { data: { documents: [] } };
}

async function getPropertyFloorplans(propertyId) {
    const id = encodeURIComponent(String(propertyId || ''));
    const response = await fetchWithErrorHandling(`${API_BASE_URL}/properties/${id}/floorplans`);
    return response || { data: { floorplans: [] } };
}

async function getPropertyReviews(propertyId) {
    const id = encodeURIComponent(String(propertyId || ''));
    const response = await fetchWithErrorHandling(`${API_BASE_URL}/properties/${id}/reviews`);
    return response || { data: { reviews: [] } };
}

/* ===========================================
   FAVORITES
=========================================== */

async function getFavorites(userId) {

    return fetchWithErrorHandling(

        `${API_BASE_URL}/favorites?userId=${userId}`

    );

}

async function getDashboardStats(userId) {

    return fetchWithErrorHandling(

        `${API_BASE_URL}/dashboard/stats?userId=${userId}`

    );

}

async function syncDashboardMetrics(userId, metrics) {

    return fetchWithErrorHandling(

        `${API_BASE_URL}/dashboard/metrics`,

        {

            method: "POST",

            headers: {

                "Content-Type": "application/json"

            },

            body: JSON.stringify({ userId, metrics })

        }

    );

}

async function getCurrentAuthHeader() {
    const token = typeof window !== "undefined" ? window.__atlasAuthToken : null;
    return token ? { Authorization: `Bearer ${token}` } : {};
}

async function sendContactMessage(payload) {

    const authHeader = await getCurrentAuthHeader();

    return fetchWithErrorHandling(
        `${API_BASE_URL}/contact`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...authHeader
            },
            body: JSON.stringify(payload)
        }
    );
}

async function getContactMessages() {
    const authHeader = await getCurrentAuthHeader();

    return fetchWithErrorHandling(
        `${API_BASE_URL}/contact`,
        {
            method: "GET",
            headers: {
                ...authHeader
            }
        }
    );
}

async function addFavorite(property) {

    const user = JSON.parse(localStorage.getItem("atlas_user"));
    const userId = user?.id || user?.uid;

    if (!userId) {

        throw new Error("Please login first.");

    }

    const result = await fetchWithErrorHandling(

        `${API_BASE_URL}/favorites`,

        {

            method: "POST",

            headers: {

                "Content-Type": "application/json"

            },

            body: JSON.stringify({

                userId,
                propertyId: property.property_id,
                propertyData: property

            })

        }

    );

    notifyDashboardRefresh();

    return result;

}

async function removeFavorite(propertyId) {

    const user = JSON.parse(localStorage.getItem("atlas_user"));
    const userId = user?.id || user?.uid;

    if (!userId) {

        throw new Error("Please login first.");

    }

    return fetchWithErrorHandling(

        `${API_BASE_URL}/favorites/${propertyId}?userId=${userId}`,

        {

            method: "DELETE"

        }

    );

}

/* ===========================================
   NOTIFICATIONS
=========================================== */
/* (notifications API helpers removed) */