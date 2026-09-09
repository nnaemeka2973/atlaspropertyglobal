/**
 * Atlas Property Group
 * Favorites Page
 */

async function loadFavorites() {

    const user = JSON.parse(localStorage.getItem("atlas_user"));

    if (!user) {
        window.location.href = "login.html";
        return;
    }

    const container = document.getElementById("favorites-list");

    if (!container) return;

    container.innerHTML = `
        <div class="empty">
            <h3>Loading favorites...</h3>
        </div>
    `;

    try {

        const userId = user?.id || user?.uid;

        if (!userId) {
            window.location.href = "login.html";
            return;
        }

        const result = await getFavorites(userId);

        if (!result.success) {
            throw new Error(result.message || "Unable to load favorites.");
        }

        const favorites = result.data || [];

        if (favorites.length === 0) {

            container.innerHTML = `
                <div class="empty">
                    <h2>No Favorites Yet</h2>
                    <p>Save properties from the listings page and they will appear here.</p>
                </div>
            `;

            return;
        }

        container.innerHTML = favorites.map(item => {

            const property = item.property_data || {};

            const image = getPropertyImage(property);

            const address =
                property.location?.address?.line ||
                property.address ||
                "Property";

            const city =
                property.location?.address?.city || "";

            const state =
                property.location?.address?.state_code || "";

            const beds =
                property.description?.beds ?? "-";

            const baths =
                property.description?.baths ?? "-";

            const sqft =
                property.description?.sqft
                    ? Number(property.description.sqft).toLocaleString()
                    : "-";

            const price = property.list_price || property.price;

            return `

                <div class="card">

                    <img
                        src="${image}"
                        alt="${address}"
                        loading="lazy"
                        onerror="handleImageError(this)"
                    >

                    <div class="info">

                        <div class="price">
                            ${
                                price
                                    ? "$" + Number(price).toLocaleString()
                                    : "Price Unavailable"
                            }
                        </div>

                        <div class="address">
                            ${address}<br>
                            ${city}${city && state ? "," : ""} ${state}
                        </div>

                        <div class="features">
                            🛏 ${beds} Beds &nbsp;&nbsp;
                            🛁 ${baths} Baths &nbsp;&nbsp;
                            📐 ${sqft} sqft
                        </div>

                        <div class="buttons">

                            <button
                                class="view"
                                onclick="viewProperty('${item.property_id}')">
                                View Details
                            </button>

                            <button
                                class="remove"
                                onclick="removeFavoriteFromList(this,'${item.property_id}')">
                                Remove
                            </button>

                        </div>

                    </div>

                </div>

            `;

        }).join("");

    }

    catch (err) {

        console.error(err);

        container.innerHTML = `
            <div class="empty">
                <h2>Unable to load favorites</h2>
                <p>${err.message}</p>
            </div>
        `;

    }

}

function viewProperty(propertyId) {

    window.location.href =
        `property-details.html?id=${propertyId}`;

}

async function removeFavoriteFromList(button, propertyId) {

    if (!confirm("Remove this property from favorites?")) {
        return;
    }

    button.disabled = true;
    button.textContent = "Removing...";

    try {

        const result = await removeFavorite(propertyId);

        if (!result.success) {
            throw new Error(result.message);
        }

        await loadFavorites();

    }

    catch (err) {

        console.error(err);

        button.disabled = false;
        button.textContent = "Remove";

        alert(err.message);

    }

}

document.addEventListener("DOMContentLoaded", loadFavorites);