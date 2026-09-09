/**
 * Saved Properties Management
 * Handles saving, loading, and displaying saved properties
 */

const SAVED_PROPERTIES_KEY = 'atlasSavedProperties';

/**
 * Get all saved properties from localStorage
 */
function getSavedProperties() {
    const saved = localStorage.getItem(SAVED_PROPERTIES_KEY);
    return saved ? JSON.parse(saved) : [];
}

/**
 * Save a property to localStorage and backend (if logged in)
 */
function saveProperty(property) {
    const saved = getSavedProperties();
    const exists = saved.some(p => p.id === property.id);
    
    if (!exists) {
        saved.push({
            ...property,
            savedDate: new Date().toISOString()
        });
        localStorage.setItem(SAVED_PROPERTIES_KEY, JSON.stringify(saved));
        
        // Try to sync with backend only if user is logged in
        try {
            const user = JSON.parse(localStorage.getItem("atlas_user") || "{}");
            const userId = user?.id || user?.uid;
            if (userId && typeof addFavorite !== 'undefined') {
                addFavorite({
                    property_id: property.id,
                    ...property
                }).catch(err => console.warn('Backend sync skipped:', err.message));
            }
        } catch (err) {
            // Silent fail - localStorage save is what matters
        }
        
        notifyDashboardRefresh();
    }
}

/**
 * Remove a property from saved (localStorage and backend)
 */
function removeSavedProperty(propertyId) {
    let saved = getSavedProperties();
    saved = saved.filter(p => p.id !== propertyId);
    localStorage.setItem(SAVED_PROPERTIES_KEY, JSON.stringify(saved));
    
    // Try to sync with backend only if user is logged in
    try {
        const user = JSON.parse(localStorage.getItem("atlas_user") || "{}");
        const userId = user?.id || user?.uid;
        if (userId && typeof removeFavorite !== 'undefined') {
            removeFavorite(propertyId).catch(err => console.warn('Backend sync skipped:', err.message));
        }
    } catch (err) {
        // Silent fail - localStorage removal is what matters
    }
    
    notifyDashboardRefresh();
}

/**
 * Check if a property is saved
 */
function isPropertySaved(propertyId) {
    return getSavedProperties().some(p => p.id === propertyId);
}

/**
 * Handle favorite button clicks (set up only once)
 */
let favoriteButtonsInitialized = false;
function setupFavoriteButtons() {
    if (favoriteButtonsInitialized) return;
    favoriteButtonsInitialized = true;

    document.addEventListener('click', (e) => {
        const favoriteBtn = e.target.closest('.favorite-btn');
        if (!favoriteBtn) return;

        e.preventDefault();
        e.stopPropagation();

        const card = favoriteBtn.closest('.property-card');
        if (!card) return;

        let propertyId = favoriteBtn.dataset.propertyId;
        let propertyData;

        if (propertyId) {
            // If property ID is stored in data attribute, extract from card
            propertyData = extractPropertyData(card);
            propertyData.id = propertyId;
        } else {
            // Fallback: extract everything from card
            propertyData = extractPropertyData(card);
        }
        
        if (favoriteBtn.classList.contains('saved')) {
            // Removing from saved
            removeSavedProperty(propertyData.id);
            favoriteBtn.classList.remove('saved');
            favoriteBtn.querySelector('span').textContent = '♡';
        } else {
            // Adding to saved
            saveProperty(propertyData);
            favoriteBtn.classList.add('saved');
            favoriteBtn.querySelector('span').textContent = '♥';
        }
    });
}

/**
 * Extract property data from card element
 */
function extractPropertyData(card) {
    const link = card.querySelector('.card-image');
    const image = card.querySelector('.card-image img')?.src || '';
    const badge = card.querySelector('.status-badge')?.textContent || '';
    const priceEl = card.querySelector('.price');
    const titleEl = card.querySelector('h2 a');
    const locationEl = card.querySelector('.location');
    const statsEls = card.querySelectorAll('.stats span');
    const favoriteBtn = card.querySelector('.favorite-btn');
    
    const href = link?.href || '';
    const dataId = favoriteBtn?.dataset.propertyId;
    const propertyId = dataId || href.split('/').pop() || Math.random().toString(36).substr(2, 9);

    return {
        id: propertyId,
        href: href,
        title: titleEl?.textContent?.trim() || 'Property',
        price: priceEl?.textContent?.trim() || '$0',
        location: locationEl?.textContent?.trim() || '',
        status: badge,
        image: image,
        beds: statsEls[0]?.textContent?.split(' ')[0]?.trim() || '0',
        baths: statsEls[1]?.textContent?.split(' ')[0]?.trim() || '0',
        sqft: statsEls[2]?.textContent?.trim() || '',
        type: card.querySelector('.property-type-pill')?.textContent?.trim() || 'Property'
    };
}

/**
 * Render saved properties in dashboard
 */
function renderSavedProperties() {
    const container = document.getElementById('saved-properties-body');
    if (!container) return;

    const saved = getSavedProperties();

    if (saved.length === 0) {
        container.innerHTML = `
            <div style="grid-column: 1 / -1; padding: 60px 20px; text-align: center; color: var(--muted);">
                <i class="fa-regular fa-heart" style="font-size: 48px; display: block; margin-bottom: 16px; opacity: 0.5;"></i>
                <h3>No saved properties yet</h3>
                <p>Properties you save will appear here for easy access.</p>
                <a href="properties.html" class="btn btn-primary" style="margin-top: 20px;">Browse Properties</a>
            </div>
        `;
        return;
    }

    container.innerHTML = saved.map(property => `
        <article class="property-card">
            <a class="card-image" href="${escapeHtml(property.href)}" aria-label="View ${escapeHtml(property.title)}">
                ${property.image ? `<img src="${escapeHtml(property.image)}" alt="${escapeHtml(property.title)}" loading="lazy" decoding="async">` : `<div class="no-photo">No photo</div>`}
                <span class="status-badge">${escapeHtml(property.status)}</span>
                <button class="card-icon favorite-btn saved" type="button" aria-label="Remove from saved" data-property-id="${escapeHtml(property.id)}"><span>♥</span></button>
            </a>
            <div class="card-body">
                <div class="card-topline">
                    <div class="price">${escapeHtml(property.price)}</div>
                    <span class="property-type-pill">${escapeHtml(property.type)}</span>
                </div>
                <h2><a href="${escapeHtml(property.href)}">${escapeHtml(property.title)}</a></h2>
                <p class="location">${escapeHtml(property.location)}</p>
                <div class="stats" aria-label="Property details">
                    <span><strong>${escapeHtml(property.beds)}</strong> beds</span>
                    <span><strong>${escapeHtml(property.baths)}</strong> baths</span>
                    <span><strong>${escapeHtml(property.sqft)}</strong></span>
                </div>
            </div>
        </article>
    `).join('');
}

/**
 * Handle search in saved properties
 */
function setupSavedPropertiesSearch() {
    const searchInput = document.getElementById('saved-properties-search');
    if (!searchInput) return;

    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        const saved = getSavedProperties();
        const filtered = saved.filter(p => 
            p.title.toLowerCase().includes(query) || 
            p.location.toLowerCase().includes(query)
        );

        const container = document.getElementById('saved-properties-body');
        if (!container) return;

        if (filtered.length === 0) {
            container.innerHTML = '<div style="grid-column: 1 / -1; padding: 40px 20px; text-align: center; color: var(--muted);">No properties match your search</div>';
            return;
        }

        container.innerHTML = filtered.map(property => `
            <article class="property-card">
                <a class="card-image" href="${escapeHtml(property.href)}">
                    ${property.image ? `<img src="${escapeHtml(property.image)}" alt="${escapeHtml(property.title)}" loading="lazy">` : `<div class="no-photo">No photo</div>`}
                    <span class="status-badge">${escapeHtml(property.status)}</span>
                    <button class="card-icon favorite-btn saved" type="button" data-property-id="${escapeHtml(property.id)}"><span>♥</span></button>
                </a>
                <div class="card-body">
                    <div class="card-topline">
                        <div class="price">${escapeHtml(property.price)}</div>
                        <span class="property-type-pill">${escapeHtml(property.type)}</span>
                    </div>
                    <h2><a href="${escapeHtml(property.href)}">${escapeHtml(property.title)}</a></h2>
                    <p class="location">${escapeHtml(property.location)}</p>
                    <div class="stats">
                        <span><strong>${escapeHtml(property.beds)}</strong> beds</span>
                        <span><strong>${escapeHtml(property.baths)}</strong> baths</span>
                        <span><strong>${escapeHtml(property.sqft)}</strong></span>
                    </div>
                </div>
            </article>
        `).join('');
        
        // Re-initialize favorite buttons for these new cards
        setTimeout(() => setupFavoriteButtons(), 50);
        
        // Re-initialize favorite buttons for these new cards
        setTimeout(() => setupFavoriteButtons(), 50);
    });
}

/**
 * Handle sort in saved properties
 */
function setupSavedPropertiesSort() {
    const sortSelect = document.getElementById('saved-properties-sort');
    if (!sortSelect) return;

    sortSelect.addEventListener('change', (e) => {
        const sortBy = e.target.value;
        let saved = getSavedProperties();

        if (sortBy === 'recent') {
            saved.sort((a, b) => new Date(b.savedDate) - new Date(a.savedDate));
        } else if (sortBy === 'price-low') {
            saved.sort((a, b) => {
                const priceA = parseInt(a.price.replace(/\D/g, '')) || 0;
                const priceB = parseInt(b.price.replace(/\D/g, '')) || 0;
                return priceA - priceB;
            });
        } else if (sortBy === 'price-high') {
            saved.sort((a, b) => {
                const priceA = parseInt(a.price.replace(/\D/g, '')) || 0;
                const priceB = parseInt(b.price.replace(/\D/g, '')) || 0;
                return priceB - priceA;
            });
        }

        const container = document.getElementById('saved-properties-body');
        if (!container) return;

        container.innerHTML = saved.map(property => `
            <article class="property-card">
                <a class="card-image" href="${escapeHtml(property.href)}">
                    ${property.image ? `<img src="${escapeHtml(property.image)}" alt="${escapeHtml(property.title)}" loading="lazy">` : `<div class="no-photo">No photo</div>`}
                    <span class="status-badge">${escapeHtml(property.status)}</span>
                    <button class="card-icon favorite-btn saved" type="button" data-property-id="${escapeHtml(property.id)}"><span>♥</span></button>
                </a>
                <div class="card-body">
                    <div class="card-topline">
                        <div class="price">${escapeHtml(property.price)}</div>
                        <span class="property-type-pill">${escapeHtml(property.type)}</span>
                    </div>
                    <h2><a href="${escapeHtml(property.href)}">${escapeHtml(property.title)}</a></h2>
                    <p class="location">${escapeHtml(property.location)}</p>
                    <div class="stats">
                        <span><strong>${escapeHtml(property.beds)}</strong> beds</span>
                        <span><strong>${escapeHtml(property.baths)}</strong> baths</span>
                        <span><strong>${escapeHtml(property.sqft)}</strong></span>
                    </div>
                </div>
            </article>
        `).join('');
    });
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return String(text || '').replace(/[&<>"']/g, m => map[m]);
}

/**
 * Initialize on page load
 */
document.addEventListener('DOMContentLoaded', () => {
    // Set up favorite button listener (only once)
    setupFavoriteButtons();
    
    // Only set up search and sort if not on dashboard (dashboard.js handles these)
    if (!document.getElementById('dashboard-sidebar')) {
        setupSavedPropertiesSearch();
        setupSavedPropertiesSort();
        
        // Render any saved properties on landing/properties pages
        setTimeout(() => {
            renderSavedProperties();
        }, 100);
    }
});

// Re-render when dashboard refresh event occurs (dashboard.js will handle this on dashboard)
window.addEventListener('atlas:dashboard-refresh', () => {
    // Only re-render if not on dashboard page
    if (!document.getElementById('dashboard-sidebar')) {
        renderSavedProperties();
    }
});
