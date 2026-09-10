const DASHBOARD_KEYS = {
    SAVED_SEARCHES: 'atlasSavedSearches',
    NOTIFICATIONS: 'atlasNotifications',
    MESSAGES: 'atlasMessages',
    SETTINGS: 'atlasSettings'
};

function esc(value) {
    return String(value ?? '').replace(/[&<>'"]/g, (character) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',        '"': '&quot;'
    }[character]));
}

const state = {
    user: null,
    favorites: [],
    recentlyViewed: [],
    recentlyViewedDetails: [],
    savedSearches: [],
    compareProperties: [],
    compareDetails: [],
    notifications: [],
    messages: [],
    tours: {
        upcoming: [],
        past: []
    },
    settings: {
        emailNotifications: true,
        smsNotifications: false,
        privacy: 'private',
        language: 'en'
    },
    metrics: {
        savedProperties: 0,
        recentlyViewed: 0,
        scheduledTours: 0,
        savedSearches: 0,
        messages: 0,
        notifications: 0
    },
    loadingMetrics: false,
    refreshTimer: null
};

function readLocalState() {
    state.user = JSON.parse(localStorage.getItem('atlas_user')) || null;

    if (state.user && !state.user.id && state.user.uid) {
        state.user.id = state.user.uid;
    }

    normalizeDashboardUserName();

    state.recentlyViewed = JSON.parse(localStorage.getItem('recentlyViewed')) || [];
    state.compareProperties = JSON.parse(localStorage.getItem('atlasCompareProperties') || '[]').map(String);
    state.savedSearches = JSON.parse(localStorage.getItem(DASHBOARD_KEYS.SAVED_SEARCHES) || '[]');
    state.notifications = JSON.parse(localStorage.getItem(DASHBOARD_KEYS.NOTIFICATIONS) || '[]');
    state.messages = JSON.parse(localStorage.getItem(DASHBOARD_KEYS.MESSAGES) || '[]');
    state.settings = JSON.parse(localStorage.getItem(DASHBOARD_KEYS.SETTINGS) || '{}');

    if (typeof state.settings.emailNotifications !== 'boolean') {
        state.settings.emailNotifications = true;
    }

    if (typeof state.settings.smsNotifications !== 'boolean') {
        state.settings.smsNotifications = false;
    }

    if (!state.settings.privacy) {
        state.settings.privacy = 'private';
    }

    if (!state.settings.language) {
        state.settings.language = 'en';
    }
}

function saveDashboardState() {
    localStorage.setItem(DASHBOARD_KEYS.SAVED_SEARCHES, JSON.stringify(state.savedSearches));
    localStorage.setItem(DASHBOARD_KEYS.NOTIFICATIONS, JSON.stringify(state.notifications));
    localStorage.setItem(DASHBOARD_KEYS.MESSAGES, JSON.stringify(state.messages));
    localStorage.setItem(DASHBOARD_KEYS.SETTINGS, JSON.stringify(state.settings));
}

function normalizeDashboardUserName() {
    if (!state.user) return;

    const user = state.user;
    const normalize = (value) => String(value || '').trim();
    const isEmail = (value) => value.includes('@');

    const rawName = [
        normalize(user.full_name),
        normalize(user.fullName),
        normalize(user.displayName),
        normalize(user.providerDisplayName),
        normalize(user.name)
    ].find((value) => value && !isEmail(value)) || '';

    const email = normalize(user.email);
    const fallbackName = email ? formatNameFromEmail(email) : '';
    const preferredName = rawName || fallbackName || '';

    if (preferredName) {
        if (!user.fullName || isEmail(normalize(user.fullName))) {
            user.fullName = preferredName;
        }
        if (!user.displayName || isEmail(normalize(user.displayName))) {
            user.displayName = preferredName;
        }
        if (!user.name || isEmail(normalize(user.name))) {
            user.name = preferredName;
        }
    }

    localStorage.setItem('atlas_user', JSON.stringify(user));
}

function getComparePropertyCards(properties) {
    if (!properties.length) {
        return `
            <div class="empty-state">
                <p>No properties are currently selected for comparison.</p>
            </div>
        `;
    }

    return properties.map((property) => {
        const image = getPropertyImage(property) || 'assets/images/no-image.jpg';
        const title = property.title || property.address || 'Property';
        const price = property.list_price || property.price || 'Price unavailable';
        const address = property.location?.address?.line || property.address || 'Address unavailable';

        return `
            <article class="property-card">
                <img src="${image}" alt="${address}" loading="lazy" onerror="handleImageError(this)">
                <div class="property-info">
                    <h3>${title}</h3>
                    <p>${address}</p>
                    <div class="property-meta">${formatPrice(price)}</div>
                    <div class="property-actions">
                        <button type="button" class="btn btn-outline" data-action="remove-compare" data-property-id="${getPropertyId(property)}">Remove</button>
                    </div>
                </div>
            </article>
        `;
    }).join('');
}

function getSavedSearchCards() {
    if (!state.savedSearches.length) {
        return `
            <div class="empty-state">
                <p>No saved searches yet. Save search filters to return to them quickly.</p>
            </div>
        `;
    }

    return state.savedSearches.map((search, index) => `
        <article class="notification-item">
            <div>
                <h3>${search.name || `Saved search ${index + 1}`}</h3>
                <p><strong>Location:</strong> ${search.location || 'Any'}</p>
                <p><strong>Price:</strong> ${search.priceRange || 'Any'} • <strong>Beds:</strong> ${search.beds || 'Any'} • <strong>Baths:</strong> ${search.baths || 'Any'}</p>
                <p class="notification-subtext">Saved on ${new Date(search.dateSaved).toLocaleDateString()}</p>
            </div>
            <div class="property-actions">
                <button type="button" class="btn btn-secondary" data-action="run-search" data-search-index="${index}">Run Search</button>
                <button type="button" class="btn btn-outline" data-action="delete-search" data-search-index="${index}">Delete</button>
            </div>
        </article>
    `).join('');
}

function getRecentlyViewedCards(properties) {
    if (!properties.length) {
        return `
            <div class="empty-state">
                <p>No recently viewed properties yet. View a property to save it here.</p>
            </div>
        `;
    }

    return properties.map((property) => {
        const id = getPropertyId(property);
        const image = getPropertyImage(property);
        const title = property.title || property.address || 'Property';
        const price = property.list_price || property.price || null;
        const address = property.location?.address?.line || property.address || 'Address unavailable';

        return `
            <article class="property-card">
                <img src="${image}" alt="${address}" loading="lazy" onerror="handleImageError(this)">
                <div class="property-info">
                    <h3>${title}</h3>
                    <p>${address}</p>
                    <div class="property-meta">${price ? formatPrice(price) : 'Price unavailable'}</div>
                    <div class="property-actions">
                        <button type="button" class="btn btn-secondary" data-action="view-property" data-property-id="${id}">View Details</button>
                    </div>
                </div>
            </article>
        `;
    }).join('');
}

function getSavedPropertyCards(items = state.favorites) {
    const favorites = Array.isArray(items) ? items : state.favorites;

    if (!favorites.length) {
        return `
            <div class="empty-state">
                <p>No saved properties yet. Add a favorite from any listing.</p>
            </div>
        `;
    }

    return favorites.map((item) => {
        const property = item.property_data || item;
        const id = item.property_id || getPropertyId(property);
        const image = getPropertyImage(property);
        const title = property.title || property.address || 'Property';
        const price = property.list_price || property.price;
        const address = property.location?.address?.line || property.address || 'Address unavailable';

        return `
            <article class="property-card">
                <img src="${image}" alt="${address}" loading="lazy" onerror="handleImageError(this)">
                <div class="property-info">
                    <h3>${title}</h3>
                    <p>${address}</p>
                    <div class="property-meta">${price ? formatPrice(price) : 'Price unavailable'}</div>
                    <div class="property-actions">
                        <button type="button" class="btn btn-secondary" data-action="view-property" data-property-id="${id}">View</button>
                        <button type="button" class="btn btn-outline" data-action="remove-favorite" data-property-id="${id}">Remove</button>
                    </div>
                </div>
            </article>
        `;
    }).join('');
}

function getMessageCards() {
    if (!state.messages.length) {
        return `
            <div class="empty-state">
                <p>Your inbox is empty. Start a conversation to stay connected.</p>
            </div>
        `;
    }

    return state.messages.map((message, index) => {
        const unreadClass = message.unread ? 'unread' : '';
        const statusLabel = message.status ? `<span class="message-status">${message.status}</span>` : '';
        const previewText = message.preview || message.body?.slice(0, 80) || message.message?.slice(0, 80) || 'No message preview available.';
        const timestamp = message.createdAt ? new Date(message.createdAt).toLocaleDateString() : (message.date ? new Date(message.date).toLocaleDateString() : 'Unknown date');

        return `
            <button type="button" class="message-item ${unreadClass}" data-action="select-message" data-message-index="${index}">
                <div>
                    <h3>${message.subject || 'New message'}</h3>
                    <p>${previewText}</p>
                    ${statusLabel}
                </div>
                <span>${timestamp}</span>
            </button>
        `;
    }).join('');
}

function getNotificationCards() {
    if (!state.notifications.length) {
        return `
            <div class="empty-state">
                <p>No notifications yet. You will see updates here when something changes.</p>
            </div>
        `;
    }

    return state.notifications.map((notification, index) => `
        <article class="notification-item ${notification.unread ? 'unread' : ''}">
            <div>
                <h3>${notification.title}</h3>
                <p>${notification.message}</p>
                <span>${new Date(notification.date).toLocaleDateString()}</span>
            </div>
            <div class="notification-actions">
                <button type="button" class="btn btn-secondary" data-action="mark-notification-read" data-notification-index="${index}">Mark read</button>
            </div>
        </article>
    `).join('');
}

async function loadFavoritesForDashboard() {
    // For now, prioritize localStorage since backend sync is unreliable
    // TODO: Once Supabase is properly configured, sync backend data
    
    const saved = localStorage.getItem('atlasSavedProperties');
    const localFavorites = saved ? JSON.parse(saved) : [];
    
    console.log('[loadFavoritesForDashboard] Retrieved from localStorage:', localFavorites.length);
    
    return localFavorites;
}

/**
 * Get saved properties from localStorage as fallback for dashboard
 */
function getLocalStorageFavorites() {
    try {
        const saved = localStorage.getItem('atlasSavedProperties');
        if (!saved) return [];
        
        const properties = JSON.parse(saved);
        // Convert localStorage format to dashboard format if needed
        return Array.isArray(properties) ? properties : [];
    } catch (err) {
        console.warn('Failed to read localStorage favorites:', err);
        return [];
    }
}

async function loadPropertyDetailsForIds(ids = []) {
    const loaded = [];
    for (const id of ids.slice(-6).reverse()) {
        try {
            const result = await getPropertyDetails(id);
            if (result.success && result.data) {
                loaded.push(result.data);
            }
        } catch (error) {
            console.warn('Failed to load property details for', id, error);
        }
    }
    return loaded;
}

async function loadDashboardPropertyLists() {
    state.recentlyViewedDetails = await loadPropertyDetailsForIds(state.recentlyViewed);
    state.compareDetails = await loadPropertyDetailsForIds(state.compareProperties.slice(0, 4));
}

async function loadDashboardMessages() {
    if (!state.user) return state.messages;

    try {
        const result = await getContactMessages();
        if (result.success && Array.isArray(result.data)) {
            return result.data.map((message) => ({
                ...message,
                unread: message.status && message.status !== 'Read' && message.status !== 'Closed',
                preview: message.message ? message.message.slice(0, 80) : ''
            }));
        }
    } catch (error) {
        console.error('Dashboard contact messages load failed:', error);
    }

    return state.messages;
}


function formatNameFromEmail(email) {
    const localPart = email.split('@')[0] || '';
    const cleaned = localPart
        .replace(/[._-]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    if (!cleaned) {
        return email;
    }

    return cleaned
        .split(' ')
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
        .join(' ');
}

function addDashboardNotification(title, message) {
    const notification = {
        title: String(title || 'Notification'),
        message: String(message || 'You have a new update.'),
        date: new Date().toISOString(),
        unread: true
    };

    state.notifications.unshift(notification);
    state.notifications = state.notifications.slice(0, 24);
    saveDashboardState();
    renderDashboardSummary();
    renderDashboardPanels();
}

function getDashboardDisplayName() {
    const user = state.user || {};
    const rawName = (user.full_name || user.fullName || user.displayName || user.providerDisplayName || user.name || '').trim();
    const email = (user.email || '').trim();
    const isRawNameEmail = rawName.includes('@');
    const fullName = isRawNameEmail ? '' : rawName;
    const firstName = (user.first_name || user.firstName || fullName.split(' ')[0] || '').trim();

    if (fullName) {
        return fullName;
    }

    if (firstName) {
        return firstName;
    }

    if (email) {
        return formatNameFromEmail(email);
    }

    return 'Guest';
}

function renderDashboardSummary() {
    const loadingLabel = 'Loading...';
    const metricIds = [
        ['card-saved-properties-count', state.metrics.savedProperties],
        ['card-recently-viewed-count', state.metrics.recentlyViewed],
        ['card-scheduled-tours-count', state.metrics.scheduledTours],
        ['card-saved-searches-count', state.metrics.savedSearches],
        ['card-messages-count', state.metrics.messages],
        ['card-notifications-count', state.metrics.notifications],
        ['snapshot-favorites', state.metrics.savedProperties],
        ['snapshot-searches', state.metrics.savedSearches],
        ['snapshot-messages', state.metrics.messages],
        ['snapshot-notifications', state.metrics.notifications]
    ];

    metricIds.forEach(([elementId, value]) => {
        const element = document.getElementById(elementId);
        if (!element) return;

        const displayValue = state.loadingMetrics ? loadingLabel : (Number.isFinite(Number(value)) ? Number(value) : 0);
        element.textContent = displayValue;
    });

    const badgeValue = state.loadingMetrics ? '' : (Number(state.metrics.notifications ?? 0) || '');
    document.getElementById('top-notification-count').textContent = badgeValue;
}

function renderMortgageScenarios() {
    const container = document.getElementById('saved-mortgage-scenarios');
    if (!container) return;

    const scenarios = JSON.parse(localStorage.getItem('atlasMortgageCalculations') || '[]');
    if (!Array.isArray(scenarios) || !scenarios.length) {
        container.innerHTML = `
            <div class="empty-state">
                <p>No saved mortgage scenarios yet. Save one from the mortgage calculator page.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = scenarios.map((scenario) => `
        <article class="notification-item">
            <div>
                <h3>${scenario.label || 'Mortgage scenario'}</h3>
                <p>${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(Number(scenario.totalMonthlyPayment || 0))} monthly payment • ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(Number(scenario.loanAmount || 0))} loan amount</p>
            </div>
            <span>${scenario.createdAt || ''}</span>
        </article>
    `).join('');
}

function renderDashboardPanels() {
    const recentlyViewedBody = document.getElementById('recently-viewed-body');
    const savedPropertiesBody = document.getElementById('saved-properties-body');
    const savedSearchesBody = document.getElementById('saved-searches-body');
    const compareBody = document.getElementById('compare-properties-body');
    const messagesList = document.getElementById('messages-list');
    const notificationsBody = document.getElementById('notifications-body');

    recentlyViewedBody.innerHTML = getRecentlyViewedCards(state.recentlyViewedDetails);
    savedPropertiesBody.innerHTML = getSavedPropertyCards();
    savedSearchesBody.innerHTML = getSavedSearchCards();
    compareBody.innerHTML = getComparePropertyCards(state.compareDetails);
    messagesList.innerHTML = getMessageCards();
    notificationsBody.innerHTML = getNotificationCards();
    renderMortgageScenarios();

    document.getElementById('top-notification-count').textContent = state.loadingMetrics ? '' : (Number(state.metrics.notifications ?? 0) || '');
}

function getMatchedRecentlyViewed() {
    return state.recentlyViewedDetails;
}

function getCompareMatchedProperties() {
    return state.compareDetails;
}

function updateSavedSearchForm() {
    const form = document.getElementById('save-search-form');
    if (!form) return;

    form.addEventListener('submit', (event) => {
        event.preventDefault();

        const formData = new FormData(form);
        const search = {
            name: formData.get('name')?.trim() || 'Saved search',
            location: formData.get('location')?.trim() || 'Any',
            priceRange: formData.get('priceRange') || 'Any',
            beds: formData.get('beds') || 'Any',
            baths: formData.get('baths') || 'Any',
            keyword: formData.get('keyword')?.trim() || '',
            dateSaved: new Date().toISOString()
        };

        state.savedSearches.unshift(search);
        state.savedSearches = state.savedSearches.slice(0, 12);
        saveDashboardState();
        renderDashboardSummary();
        renderDashboardPanels();
        addDashboardNotification('Saved search created', `Your search "${search.name}" was saved successfully.`);
        showToast('Saved search created successfully.');
        form.reset();
    });
}

function switchDashboardPanel(panelId) {
    if (!panelId) return;

    document.querySelectorAll('[data-panel-link]').forEach((item) => {
        item.classList.toggle('active', item.dataset.panel === panelId);
    });

    document.querySelectorAll('.dashboard-panel').forEach((panel) => {
        panel.classList.toggle('active', panel.id === panelId);
    });
}

function attachGlobalEventHandlers() {
    document.addEventListener('click', (event) => {
        const panelLink = event.target.closest('[data-panel-link]');
        if (panelLink) {
            event.preventDefault();
            switchDashboardPanel(panelLink.dataset.panel);
            const sidebar = document.getElementById('dashboard-sidebar');
            if (window.innerWidth <= 980 && sidebar?.classList.contains('sidebar-open')) {
                sidebar.classList.remove('sidebar-open');
            }
            return;
        }

        const statCard = event.target.closest('.stat-card[data-dashboard-panel]');
        if (statCard) {
            event.preventDefault();
            switchDashboardPanel(statCard.dataset.dashboardPanel);
            return;
        }

        const actionButton = event.target.closest('button[data-action]');
        if (actionButton) {
            handleDashboardAction(event);
        }
    });

    document.addEventListener('keydown', (event) => {
        const statCard = event.target.closest('.stat-card[data-dashboard-panel]');
        if (!statCard) return;

        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            switchDashboardPanel(statCard.dataset.dashboardPanel);
        }
    });

    document.getElementById('dashboard-search-form')?.addEventListener('submit', (event) => {
        event.preventDefault();
        const query = document.getElementById('dashboard-search-input')?.value.trim();
        if (!query) return;
        window.location.href = `properties.html?keyword=${encodeURIComponent(query)}`;
    });

    document.getElementById('logout-btn')?.addEventListener('click', () => window.logoutUser?.());

    document.getElementById('theme-toggle')?.addEventListener('click', toggleTheme);
    document.getElementById('settings-theme-toggle')?.addEventListener('click', toggleTheme);

    document.getElementById('compare-clear-all')?.addEventListener('click', () => {
        state.compareProperties = [];
        localStorage.removeItem('atlasCompareProperties');
        renderDashboardSummary();
        renderDashboardPanels();
        addDashboardNotification('Compare cleared', 'Your property comparison list has been cleared.');
        showToast('Compare list cleared.');
    });

    document.getElementById('top-notifications-toggle')?.addEventListener('click', (event) => {
        event.preventDefault();
        switchDashboardPanel('panel-notifications');
    });

    document.getElementById('mark-all-read')?.addEventListener('click', () => {
        if (!state.notifications.length) {
            showToast('No notifications to mark read.');
            return;
        }

        state.notifications = state.notifications.map((notification) => ({
            ...notification,
            unread: false
        }));
        saveDashboardState();
        renderDashboardSummary();
        renderDashboardPanels();
        showToast('All notifications marked read.');
    });

    document.getElementById('saved-properties-search')?.addEventListener('input', (event) => {
        const value = event.target.value.trim().toLowerCase();
        const cards = state.favorites.filter((item) => {
            const property = item.property_data || item;
            const title = (property.title || property.address || '').toLowerCase();
            const address = (property.location?.address?.line || property.address || '').toLowerCase();
            return title.includes(value) || address.includes(value);
        });
        document.getElementById('saved-properties-body').innerHTML = cards.length ? getSavedPropertyCards(cards) : `
            <div class="empty-state">
                <p>No saved properties match that search.</p>
            </div>
        `;
    });

    document.getElementById('saved-properties-sort')?.addEventListener('change', (event) => {
        const sortValue = event.target.value;
        let sorted = [...state.favorites];

        if (sortValue === 'price-low') {
            sorted.sort((a, b) => Number((a.property_data || a).price || (a.property_data || a).list_price || 0) - Number((b.property_data || b).price || (b.property_data || b).list_price || 0));
        } else if (sortValue === 'price-high') {
            sorted.sort((a, b) => Number((b.property_data || b).price || (b.property_data || b).list_price || 0) - Number((a.property_data || a).price || (a.property_data || a).list_price || 0));
        }

        if (sortValue === 'recent') {
            sorted = [...state.favorites];
        }

        document.getElementById('saved-properties-body').innerHTML = sorted.length ? getSavedPropertyCards(sorted) : `
            <div class="empty-state">
                <p>No saved properties match the current sort.</p>
            </div>
        `;
    });

    // mark-all-read button removed (notifications feature undone)

    document.getElementById('save-search-form')?.addEventListener('submit', (event) => event.preventDefault());

    document.getElementById('profile-form')?.addEventListener('submit', saveProfile);
    document.getElementById('password-form')?.addEventListener('submit', changePassword);
}

function handleDashboardAction(event) {
    const button = event.target.closest('button');
    if (!button) return;

    event.preventDefault();
    event.stopPropagation();

    const action = button.dataset.action;
    const propertyId = button.dataset.propertyId;
    const searchIndex = Number(button.dataset.searchIndex);
    const notificationIndex = Number(button.dataset.notificationIndex);
    const messageIndex = Number(button.dataset.messageIndex);

    switch (action) {
        case 'view-property':
            window.location.href = `property-details.html?id=${encodeURIComponent(propertyId)}`;
            break;
        case 'remove-favorite':
            removeFavoriteFromDashboard(propertyId);
            break;
        case 'remove-compare':
            state.compareProperties = state.compareProperties.filter((id) => String(id) !== String(propertyId));
            localStorage.setItem('atlasCompareProperties', JSON.stringify(state.compareProperties));
            renderDashboardSummary();
            renderDashboardPanels();
            showToast('Property removed from compare list.');
            break;
        case 'run-search':
            runSavedSearch(searchIndex);
            break;
        case 'delete-search':
            deleteSavedSearch(searchIndex);
            break;
        case 'mark-notification-read':
            if (Number.isFinite(notificationIndex) && state.notifications[notificationIndex]) {
                state.notifications[notificationIndex].unread = false;
                saveDashboardState();
                renderDashboardSummary();
                renderDashboardPanels();
                showToast('Notification marked read.');
            }
            break;
        case 'select-message':
            openMessage(messageIndex);
            break;
        default:
            break;
    }
}

async function removeFavoriteFromDashboard(propertyId) {
    const button = document.querySelector(`button[data-action="remove-favorite"][data-property-id="${propertyId}"]`);
    if (button) {
        button.disabled = true;
        button.textContent = 'Removing...';
    }

    try {
        await removeFavorite(propertyId);
    } catch (error) {
        console.error(error);
        showToast('Unable to remove favorite. Please try again.', true);
    } finally {
        if (button) {
            button.disabled = false;
            button.textContent = 'Remove';
        }
    }

    await refreshDashboardData();
}

function runSavedSearch(index) {
    const search = state.savedSearches[index];
    if (!search) return;

    const params = new URLSearchParams();
    if (search.location) params.set('location', search.location);
    if (search.priceRange) params.set('price', search.priceRange);
    if (search.beds) params.set('beds', search.beds);
    if (search.baths) params.set('baths', search.baths);
    if (search.keyword) params.set('keyword', search.keyword);

    window.location.href = `properties.html?${params.toString()}`;
}

function deleteSavedSearch(index) {
    const removed = state.savedSearches.splice(index, 1);
    saveDashboardState();
    renderDashboardSummary();
    renderDashboardPanels();
    if (removed.length) {
        addDashboardNotification('Saved search removed', `A saved search was deleted from your dashboard.`);
    }
    showToast('Saved search deleted.');
}

function openMessage(index) {
    const message = state.messages[index];
    if (!message) return;

    if (message.unread) {
        message.unread = false;
        saveDashboardState();
        renderDashboardSummary();
        renderDashboardPanels();
    }

    const detailPanel = document.getElementById('message-detail');
    if (!detailPanel) return;

    const timestamp = message.createdAt ? new Date(message.createdAt).toLocaleString() : (message.date ? new Date(message.date).toLocaleString() : 'Unknown date');
    detailPanel.innerHTML = `
        <div class="card-panel">
            <div class="panel-header">
                <div>
                    <h3>${message.subject || 'Message'}</h3>
                    <p class="pd-muted">${message.propertyAddress ? `Property: ${message.propertyAddress}` : ''}</p>
                </div>
                <span>${timestamp}</span>
            </div>
            <div class="message-thread">
                <div class="message-bubble">${esc(message.message || message.body || 'No message body provided.')}</div>
            </div>
            <div class="message-meta">
                <span>Status: ${esc(message.status || 'Pending')}</span>
                <span>Agent ID: ${esc(message.agentId || 'Unknown')}</span>
            </div>
        </div>
    `;
}

function saveProfile(event) {
    event.preventDefault();
    const fields = {
        fullName: document.getElementById('profile-name')?.value.trim(),
        email: document.getElementById('profile-email-input')?.value.trim(),
        phone: document.getElementById('profile-phone-input')?.value.trim(),
        address: document.getElementById('profile-address-input')?.value.trim(),
        city: document.getElementById('profile-city')?.value.trim(),
        state: document.getElementById('profile-state')?.value.trim(),
        postalCode: document.getElementById('profile-postal')?.value.trim()
    };

    if (!state.user) return;

    state.user = { ...state.user, ...fields };
    localStorage.setItem('atlas_user', JSON.stringify(state.user));
    window.dispatchEvent(new Event('atlas-auth-state'));
    displayProfile();
    showToast('Profile updated successfully.');
}

function changePassword(event) {
    event.preventDefault();
    const currentPassword = document.getElementById('current-password')?.value;
    const newPassword = document.getElementById('new-password')?.value;
    const confirmPassword = document.getElementById('confirm-password')?.value;

    if (!currentPassword || !newPassword) {
        showToast('Please complete both password fields.', true);
        return;
    }

    if (newPassword !== confirmPassword) {
        showToast('Passwords do not match.', true);
        return;
    }

    document.getElementById('current-password').value = '';
    document.getElementById('new-password').value = '';
    document.getElementById('confirm-password').value = '';
    showToast('Password update saved.', false);
}

function displayProfile() {
    const displayName = getDashboardDisplayName();
    const initials = displayName.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase() || 'AP';

    document.getElementById('dashboard-user-name').textContent = displayName;
    document.getElementById('dashboard-avatar').textContent = initials;
    document.getElementById('profile-avatar-initial').textContent = initials;
    document.getElementById('profile-full-name').textContent = displayName;
    document.getElementById('profile-email').textContent = state.user?.email || 'Email not available';
    document.getElementById('profile-phone').textContent = state.user?.phone || 'Phone not added';
    document.getElementById('profile-address').textContent = state.user?.address || 'Address not added';

    document.getElementById('profile-name').value = state.user?.full_name || state.user?.fullName || '';
    document.getElementById('profile-email-input').value = state.user?.email || '';
    document.getElementById('profile-phone-input').value = state.user?.phone || '';
    document.getElementById('profile-address-input').value = state.user?.address || '';
    document.getElementById('profile-city').value = state.user?.city || '';
    document.getElementById('profile-state').value = state.user?.state || '';
    document.getElementById('profile-postal').value = state.user?.postalCode || '';
}

function renderSidebarNavigation() {
    document.querySelectorAll('[data-panel-link]').forEach((button) => {
        button.onclick = (event) => {
            event.preventDefault();
            switchDashboardPanel(button.dataset.panel);
        };
    });
}

function renderTourLists() {
    const upcomingBody = document.getElementById('upcoming-tours-body');
    const pastBody = document.getElementById('past-tours-body');

    upcomingBody.innerHTML = state.tours.upcoming.length
        ? state.tours.upcoming.map((tour, index) => `
            <article class="tour-item">
                <div>
                    <h4>${tour.title}</h4>
                    <p>${tour.address}</p>
                    <span>${new Date(tour.date).toLocaleString()}</span>
                </div>
                <div class="tour-actions">
                    <button type="button" class="btn btn-outline" data-action="cancel-tour" data-tour-index="${index}">Cancel</button>
                    <button type="button" class="btn btn-secondary" data-action="reschedule-tour" data-tour-index="${index}">Reschedule</button>
                </div>
            </article>
        `).join('')
        : `<div class="empty-state"><p>No upcoming tours scheduled.</p></div>`;

    pastBody.innerHTML = state.tours.past.length
        ? state.tours.past.map((tour) => `
            <article class="tour-item">
                <div>
                    <h4>${tour.title}</h4>
                    <p>${tour.address}</p>
                    <span>${new Date(tour.date).toLocaleDateString()}</span>
                </div>
                <button type="button" class="btn btn-outline" disabled>Completed</button>
            </article>
        `).join('')
        : `<div class="empty-state"><p>No past tours available.</p></div>`;
}

function attachTourHandlers() {
    document.getElementById('upcoming-tours-body')?.addEventListener('click', (event) => {
        const button = event.target.closest('button');
        if (!button) return;

        const action = button.dataset.action;
        const tourIndex = Number(button.dataset.tourIndex);
        if (!Number.isFinite(tourIndex)) return;

        if (action === 'cancel-tour') {
            state.tours.upcoming.splice(tourIndex, 1);
            renderDashboardSummary();
            renderTourLists();
            showToast('Tour canceled successfully.');
        }

        if (action === 'reschedule-tour') {
            state.tours.upcoming[tourIndex].date = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString();
            renderTourLists();
            showToast('Tour rescheduled to next available date.');
        }
    });
}

function toggleTheme() {
    document.body.classList.toggle('dark-mode');
    const theme = document.body.classList.contains('dark-mode') ? 'dark' : 'light';
    localStorage.setItem('theme', theme);
}

function applyThemeFromStorage() {
    if (localStorage.getItem('theme') === 'dark') {
        document.body.classList.add('dark-mode');
    }
}

function showToast(message, isError = false) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${isError ? 'toast-error' : 'toast-success'}`;
    toast.textContent = message;
    container.appendChild(toast);

    window.setTimeout(() => {
        toast.classList.add('toast-hide');
    }, 2800);

    toast.addEventListener('transitionend', () => {
        toast.remove();
    });
}

function displayDashboardData() {
    const userName = getDashboardDisplayName();
    const initials = userName.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase();

    document.getElementById('dashboard-user-name').textContent = userName;
    document.getElementById('dashboard-avatar').textContent = initials;
    document.getElementById('profile-avatar-initial').textContent = initials;

    document.getElementById('profile-full-name').textContent = userName;
    document.getElementById('profile-email').textContent = state.user?.email || 'Email not available';
    document.getElementById('profile-phone').textContent = state.user?.phone || 'Phone not added';
    document.getElementById('profile-address').textContent = state.user?.address || 'Address not added';

    document.getElementById('profile-name').value = state.user?.full_name || '';
    document.getElementById('profile-email-input').value = state.user?.email || '';
    document.getElementById('profile-phone-input').value = state.user?.phone || '';
    document.getElementById('profile-address-input').value = state.user?.address || '';
    document.getElementById('profile-city').value = state.user?.city || '';
    document.getElementById('profile-state').value = state.user?.state || '';
    document.getElementById('profile-postal').value = state.user?.postalCode || '';

    document.getElementById('setting-email-notifications').checked = state.settings.emailNotifications;
    document.getElementById('setting-sms-notifications').checked = state.settings.smsNotifications;
    document.getElementById('setting-privacy').value = state.settings.privacy;
    document.getElementById('setting-language').value = state.settings.language;

    document.getElementById('setting-email-notifications')?.addEventListener('change', (event) => {
        state.settings.emailNotifications = event.target.checked;
        saveDashboardState();
    });

    document.getElementById('setting-sms-notifications')?.addEventListener('change', (event) => {
        state.settings.smsNotifications = event.target.checked;
        saveDashboardState();
    });

    document.getElementById('setting-privacy')?.addEventListener('change', (event) => {
        state.settings.privacy = event.target.value;
        saveDashboardState();
    });

    document.getElementById('setting-language')?.addEventListener('change', (event) => {
        state.settings.language = event.target.value;
        saveDashboardState();
    });
}

function activateMobileSidebar() {
    const toggle = document.getElementById('sidebar-toggle');
    const sidebar = document.getElementById('dashboard-sidebar');
    const backdrop = document.getElementById('sidebar-backdrop');

    if (!toggle || !sidebar || !backdrop) return;

    const closeSidebar = () => {
        sidebar.classList.remove('sidebar-open');
    };

    toggle.addEventListener('click', (event) => {
        event.stopPropagation();
        sidebar.classList.toggle('sidebar-open');
    });

    backdrop.addEventListener('click', closeSidebar);

    document.addEventListener('click', (event) => {
        if (window.innerWidth > 980) return;
        if (!sidebar.classList.contains('sidebar-open')) return;
        if (!document.getElementById('panel-profile')?.classList.contains('active')) return;
        if (sidebar.contains(event.target) || toggle.contains(event.target)) return;
        closeSidebar();
    });
}

function isLikelyUuid(value) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ''));
}

async function refreshDashboardData() {
    if (!state.user || state.loadingMetrics) {
        console.log('[refreshDashboardData] No state.user, returning');
        return;
    }

    state.loadingMetrics = true;
    renderDashboardSummary();

    try {
        console.log('[refreshDashboardData] Calling loadFavoritesForDashboard...');
        const favorites = await loadFavoritesForDashboard();
        console.log('[refreshDashboardData] Got favorites:', favorites.length);
        state.favorites = Array.isArray(favorites) ? favorites : [];
        console.log('[refreshDashboardData] state.favorites set to:', state.favorites.length);
        state.messages = await loadDashboardMessages();
        // notifications feature removed; maintain local state only
        state.notifications = state.notifications || [];

        if (!isLikelyUuid(state.user.id)) {
            state.metrics = {
                savedProperties: state.favorites.length,
                recentlyViewed: state.recentlyViewedDetails.length,
                scheduledTours: state.tours.upcoming.length,
                savedSearches: state.savedSearches.length,
                messages: state.messages.length,
                notifications: state.notifications.length
            };
        } else {
            const dashboardResult = await getDashboardStats(state.user.id);
            const stats = dashboardResult?.success && dashboardResult.data ? dashboardResult.data : {};
            state.metrics = {
                savedProperties: state.favorites.length,
                recentlyViewed: Number(stats.recentlyViewed ?? 0),
                scheduledTours: Number(stats.scheduledTours ?? 0),
                savedSearches: Number(stats.savedSearches ?? 0),
                messages: Number(stats.messages ?? 0),
                notifications: Number(stats.notifications ?? 0)
            };
        }
    } catch (error) {
        console.error('Dashboard refresh failed:', error);
        state.metrics = {
            savedProperties: state.favorites.length,
            recentlyViewed: state.recentlyViewedDetails.length,
            scheduledTours: state.tours.upcoming.length,
            savedSearches: state.savedSearches.length,
            messages: state.messages.length,
            notifications: state.notifications.length
        };
    } finally {
        state.loadingMetrics = false;
    }

    saveDashboardState();
    renderDashboardSummary();
    renderDashboardPanels();
    displayProfile();
}

function scheduleDashboardRefresh() {
    if (state.refreshTimer) {
        window.clearInterval(state.refreshTimer);
    }

    state.refreshTimer = window.setInterval(() => {
        refreshDashboardData();
    }, 30000);
}

async function initializeDashboard() {
    readLocalState();

    if (!state.user) {
        window.location.href = 'login.html';
        return;
    }

    applyThemeFromStorage();
    renderSidebarNavigation();
    activateMobileSidebar();
    attachGlobalEventHandlers();
    updateSavedSearchForm();
    displayProfile();
    renderTourLists();
    attachTourHandlers();

    initDashboardMortgagePanel();

    await refreshDashboardData();
    scheduleDashboardRefresh();
}

window.addEventListener('atlas:dashboard-refresh', () => {
    if (state.user) {
        refreshDashboardData();
    }
});

window.addEventListener('storage', (event) => {
    if (event.key === 'atlas_user' || event.key === 'atlasMessages' || event.key === 'atlasNotifications' || event.key === 'atlasSavedSearches' || event.key === 'atlasSettings' || event.key === 'atlas_dashboard_refresh') {
        readLocalState();
        if (state.user) {
            refreshDashboardData();
        }
    }
});

document.addEventListener('DOMContentLoaded', () => {
    initializeDashboard();
});
