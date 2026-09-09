/**
 * Atlas Property Group - Single Source of Truth
 * Central property data and shared rendering helpers
 */

let properties = [];

const PROPERTY_PAGE_SIZE = 12;


function normalizePropertyGallery(property) {
    const extractImageUrls = (source) => {
        if (!Array.isArray(source)) return [];
        return source
            .map((photo) => {
                if (typeof photo === 'string') return photo.trim();
                if (photo && typeof photo === 'object') return (photo.href || photo.url || photo.src || '').trim();
                return '';
            })
            .filter(Boolean);
    };

    const galleryFromPhotos = extractImageUrls(property?.photos || property?.images || property?.gallery || []);
    const gallery = Array.isArray(property.gallery) && property.gallery.filter(Boolean).length
        ? property.gallery.filter(Boolean)
        : galleryFromPhotos.length
            ? galleryFromPhotos
            : (property.image ? [property.image] : []);

    return {
        image: property.image || property.primary_photo?.href || property.primary_photo?.url || gallery[0] || '',
        gallery
    };
}

function getPropertyGalleryImages(property) {
    const normalized = normalizePropertyGallery(property);
    return normalized.gallery.length ? normalized.gallery : [normalized.image];
}

function normalizePropertyRecord(property) {
    if (!property || typeof property !== 'object') {
        return null;
    }

    const propertyIdValue = getPropertyId(property);
    const priceValue = Number(property.list_price ?? property.price ?? property.price_value ?? property.priceValue ?? 0);
    const title = property.description?.name || property.title || property.location?.address?.line || 'Luxury Property';
    const address = property.location?.address?.line || property.address?.line || property.address || '';
    const city = property.location?.address?.city || property.city || '';
    const stateCode = property.location?.address?.state_code || property.address?.state_code || property.location?.address?.state || '';
    const descriptionText = typeof property.description === 'string'
        ? property.description
        : property.description?.text || property.description?.summary || property.description?.name || '';
    const statusValue = String(property.status || property.listing_status || property.description?.status || 'for-sale').toLowerCase().replace(/\s+/g, '-');
    const rawType = String(property.description?.type || property.type || property.description?.sub_type || property.category || 'property').toLowerCase();
    const typeValue = rawType.includes('penthouse') ? 'penthouse'
        : rawType.includes('estate') ? 'estate'
            : rawType.includes('residence') ? 'residence'
                : rawType.includes('apartment') ? 'apartment'
                    : rawType.includes('townhouse') ? 'townhouse'
                        : rawType.includes('loft') ? 'loft'
                            : rawType.includes('villa') ? 'villa'
                                : rawType.includes('house') ? 'house'
                                    : rawType.includes('condo') ? 'condo'
                                        : 'property';

    const normalized = {
        ...property,
        id: propertyIdValue || property.id || property.listing_id || property.listingId || '',
        property_id: propertyIdValue || property.property_id || property.id || property.listing_id || property.listingId || '',
        slug: property.slug || `${String(title).toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${String(propertyIdValue || property.id || '').replace(/[^a-z0-9]+/g, '-')}`,
        title,
        status: String(property.status || property.listing_status || 'For Sale').replace(/_/g, ' '),
        statusValue,
        type: property.description?.type || property.type || 'Property',
        typeValue,
        price: formatPrice(priceValue),
        priceValue,
        location: address,
        city,
        country: property.location?.address?.country || property.country || '',
        locationCode: String(stateCode || city || 'all').toLowerCase(),
        bedrooms: Number(property.description?.beds ?? property.beds ?? 0),
        bathrooms: Number(property.description?.baths ?? property.baths ?? 0),
        garage: Number(property.description?.garage ?? property.garage ?? 0),
        area: property.description?.sqft ? `${Number(property.description.sqft).toLocaleString()} Sq Ft` : (property.area || ''),
        areaValue: Number(property.description?.sqft ?? property.areaValue ?? 0),
        description: property.description?.text || property.description?.summary || property.description?.name || property.description || '',
        image: getPropertyImage(property),
        gallery: getPropertyGalleryImages(property),
        features: Array.isArray(property.features) ? property.features : (Array.isArray(property.description?.features) ? property.description.features : []),
        listedAt: property.list_date || property.created_at || property.listedAt || ''
    };

    const gallery = normalizePropertyGallery(normalized);
    normalized.image = gallery.image;
    normalized.gallery = gallery.gallery;

    return normalized;
}

function setPropertyCollection(items) {
    properties = Array.isArray(items)
        ? items.map((item) => normalizePropertyRecord(item)).filter(Boolean)
        : [];
}

function formatPrice(value) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0
    }).format(value);
}

function getPropertyById(id) {
    const numericId = Number(id);
    return properties.find((property) => property.id === numericId) || null;
}

function getPropertyBySlug(slug) {
    return properties.find((property) => property.slug === slug) || null;
}

function getPropertyByQuery() {
    const params = new URLSearchParams(window.location.search);
    const requestedId = params.get('id');
    const requestedSlug = params.get('slug');

    if (requestedId) {
        return getPropertyById(requestedId);
    }

    if (requestedSlug) {
        return getPropertyBySlug(requestedSlug);
    }

    return properties[0] || null;
}

function getQueryFilters() {
    const params = new URLSearchParams(window.location.search);
    const rawType = String(params.get('type') || 'all').toLowerCase();
    const rawPrice = String(params.get('price') || 'any').toLowerCase();
    const rawLocation = String(params.get('location') || 'all').trim();
    const rawKeyword = String(params.get('keyword') || '').trim();

    let type = rawType === 'any' ? 'all' : rawType;
    let price = 'any';

    if (rawPrice === '1m') {
        price = '0-5m';
    } else if (rawPrice === '5m') {
        price = '5-10m';
    } else if (rawPrice === '15m+' || rawPrice === '15m') {
        price = '10m+';
    } else if (['0-5m', '5-10m', '10m+', 'any'].includes(rawPrice)) {
        price = rawPrice;
    }

    const locationValue = rawLocation.toLowerCase();
    const knownLocationCodes = ['all', 'ny', 'ca', 'fl', 'ldn', 'miami'];
    let location = knownLocationCodes.includes(locationValue) ? locationValue : 'all';
    let keyword = rawKeyword;

    if (rawLocation && rawLocation !== 'all' && !knownLocationCodes.includes(locationValue)) {
        keyword = keyword ? `${keyword} ${rawLocation}` : rawLocation;
    }

    return {
        status: String(params.get('status') || 'all').toLowerCase(),
        type,
        location,
        beds: params.get('beds') || 'any',
        baths: params.get('baths') || 'any',
        price,
        keyword: keyword.trim()
    };
}

function hydrateFilterForm(form, filters = {}) {
    if (!form) return;
    const setValue = (name, value) => {
        const element = form.querySelector(`[name="${name}"]`);
        if (element) {
            element.value = value;
        }
    };

    setValue('status', filters.status || 'all');
    setValue('type', filters.type || 'all');
    setValue('location', filters.location || 'all');
    setValue('beds', filters.beds || 'any');
    setValue('baths', filters.baths || 'any');
    setValue('price', filters.price || 'any');
    setValue('keyword', filters.keyword || '');
}

function getFilteredProperties(filters = {}) {
    const normalizedFilters = {
        status: filters.status || 'all',
        type: filters.type || 'all',
        location: filters.location || 'all',
        beds: filters.beds || 'any',
        baths: filters.baths || 'any',
        price: filters.price || 'any',
        keyword: filters.keyword || ''
    };

    return properties.filter((property) => {
        const matchesStatus = normalizedFilters.status === 'all' || property.statusValue === normalizedFilters.status;
        const matchesType = normalizedFilters.type === 'all' || property.typeValue === normalizedFilters.type;
        const matchesLocation = normalizedFilters.location === 'all' || property.locationCode === normalizedFilters.location;
        const matchesBeds = normalizedFilters.beds === 'any' || property.bedrooms >= Number(normalizedFilters.beds);
        const matchesBaths = normalizedFilters.baths === 'any' || property.bathrooms >= Number(normalizedFilters.baths);

        const matchesPrice = (() => {
            if (normalizedFilters.price === 'any') return true;
            if (normalizedFilters.price === '0-5m') return property.priceValue <= 5000000;
            if (normalizedFilters.price === '5-10m') return property.priceValue > 5000000 && property.priceValue <= 10000000;
            if (normalizedFilters.price === '10m+') return property.priceValue > 10000000;
            return true;
        })();

        const keyword = normalizedFilters.keyword.trim().toLowerCase();
        const searchText = `${property.title} ${property.location} ${property.city} ${property.country} ${property.description} ${property.features.join(' ')}`.toLowerCase();
        const matchesKeyword = !keyword || searchText.includes(keyword);

        return matchesStatus && matchesType && matchesLocation && matchesBeds && matchesBaths && matchesPrice && matchesKeyword;
    });
}

function sortProperties(items, sortType = 'default') {
    const sorted = [...items];

    switch (sortType) {
        case 'newest':
            return sorted.sort((a, b) => new Date(b.listedAt || 0) - new Date(a.listedAt || 0));
        case 'price-asc':
            return sorted.sort((a, b) => a.priceValue - b.priceValue);
        case 'price-desc':
            return sorted.sort((a, b) => b.priceValue - a.priceValue);
        default:
            return sorted;
    }
}

function paginateProperties(items, page = 1, pageSize = PROPERTY_PAGE_SIZE) {
    const safePage = Math.max(1, Number(page) || 1);
    const start = (safePage - 1) * pageSize;
    const end = start + pageSize;

    return {
        items: items.slice(start, end),
        totalPages: Math.max(1, Math.ceil(items.length / pageSize)),
        page: safePage
    };
}

function createPropertyCardMarkup(property) {
    return `
        <div class="property-card reveal active" data-id="${property.id}">
            <div class="property-image">
                <img src="${getPropertyImage(property)}" alt="${property.title}" loading="lazy" decoding="async" onerror="handleImageError(this)">
                <span class="property-status">${property.status}</span>
                <span class="property-price">${property.price}</span>
            </div>
            <div class="property-info">
                <h3>${property.title}</h3>
                <p class="property-location"><i class="fas fa-map-marker-alt"></i> ${property.location}</p>
                <div class="property-features">
                    <span class="feature"><i class="fas fa-bed"></i> ${property.bedrooms}</span>
                    <span class="feature"><i class="fas fa-bath"></i> ${property.bathrooms}</span>
                    <span class="feature"><i class="fas fa-car"></i> ${property.garage}</span>
                </div>
                <a href="property-details.html?id=${property.id}" class="btn btn-primary" style="width:100%; margin-top:15px; text-align:center;">View Details</a>
            </div>
        </div>
    `;
}

function renderPropertyList(grid, items) {
    if (!grid) return;

    if (!items.length) {
        grid.innerHTML = '<div class="property-card reveal active"><div class="property-info"><h3>No properties found</h3><p class="property-location">Try adjusting your filters and search criteria.</p></div></div>';
        return;
    }

    grid.innerHTML = items.map((property) => createPropertyCardMarkup(property)).join('');
}

function renderPagination(container, totalPages, currentPage) {
    if (!container) return;

    if (totalPages <= 1) {
        container.innerHTML = '';
        return;
    }

    const pages = [];
    for (let page = 1; page <= totalPages; page += 1) {
        pages.push(`
            <a href="#" class="page-link ${page === currentPage ? 'active' : ''}" data-page="${page}">${page}</a>
        `);
    }

    container.innerHTML = pages.join('');
}

async function initPropertyListingPage() {
    const grid = document.getElementById('listing-grid');
    const pagination = document.getElementById('pagination');
    const resultsCount = document.getElementById('results-count');
    const form = document.getElementById('property-filter-form');
    const sortSelect = document.querySelector('.sort-select');

    if (!grid) return;

    const state = {
        page: 1,
        filters: {},
        sort: 'default',
        loading: true,
        error: ''
    };

    const renderLoadingState = () => {
        grid.innerHTML = '<div class="property-card reveal active"><div class="property-info"><h3>Loading properties...</h3><p class="property-location">Fetching the latest listings from the backend.</p></div></div>';
        pagination.innerHTML = '';
        if (resultsCount) {
            resultsCount.textContent = 'Showing 0 results';
        }
    };

    const renderErrorState = (message) => {
        grid.innerHTML = `<div class="property-card reveal active"><div class="property-info"><h3>Unable to load properties</h3><p class="property-location">${message}</p></div></div>`;
        pagination.innerHTML = '';
        if (resultsCount) {
            resultsCount.textContent = 'Showing 0 results';
        }
    };

    const render = () => {
        const filtered = getFilteredProperties(state.filters);
        const sorted = sortProperties(filtered, state.sort);
        const paged = paginateProperties(sorted, state.page, PROPERTY_PAGE_SIZE);

        if (resultsCount) {
            const start = filtered.length ? (state.page - 1) * PROPERTY_PAGE_SIZE + 1 : 0;
            const end = Math.min(state.page * PROPERTY_PAGE_SIZE, filtered.length);
            resultsCount.textContent = `Showing ${start}–${end} of ${filtered.length} results`;
        }

        if (!paged.items.length) {
            grid.innerHTML = '<div class="property-card reveal active"><div class="property-info"><h3>No properties found</h3><p class="property-location">Try adjusting your filters and search criteria.</p></div></div>';
            pagination.innerHTML = '';
            return;
        }

        renderPropertyList(grid, paged.items);
        renderPagination(pagination, paged.totalPages, paged.page);
    };

    const loadProperties = async () => {
        state.loading = true;
        state.error = '';
        renderLoadingState();

        try {
            const response = await getProperties(state.filters || {});
            const results = Array.isArray(response?.data?.home_search?.results)
                ? response.data.home_search.results
                : Array.isArray(response?.results)
                    ? response.results
                    : Array.isArray(response?.data?.results)
                        ? response.data.results
                        : Array.isArray(response?.data?.homes)
                            ? response.data.homes
                            : [];

            if (results.length) {
                setPropertyCollection(results);
                state.loading = false;
                render();
                return;
            }

            setPropertyCollection([]);
            state.loading = false;
            renderErrorState('No live properties were returned from the backend.');
            return;
        } catch (error) {
            console.warn('Live property load failed:', error);
            state.error = error.message || 'Unable to load live properties.';
        }

        setPropertyCollection([]);
        state.loading = false;
        renderErrorState(state.error || 'The property feed is unavailable.');
    };

    form?.addEventListener('submit', (event) => {
        event.preventDefault();
        const formData = new FormData(form);

        state.filters = {
            status: formData.get('status') || 'all',
            type: formData.get('type') || 'all',
            location: formData.get('location') || 'all',
            beds: formData.get('beds') || 'any',
            baths: formData.get('baths') || 'any',
            price: formData.get('price') || 'any',
            keyword: formData.get('keyword') || ''
        };
        state.page = 1;
        render();
    });

    form?.addEventListener('reset', () => {
        state.filters = {};
        state.page = 1;
        render();
    });

    sortSelect?.addEventListener('change', (event) => {
        state.sort = event.target.value;
        state.page = 1;
        render();
    });

    pagination?.addEventListener('click', (event) => {
        const pageLink = event.target.closest('.page-link[data-page]');
        if (!pageLink) return;

        event.preventDefault();
        state.page = Number(pageLink.getAttribute('data-page')) || 1;
        render();
    });

    state.filters = getQueryFilters();
    hydrateFilterForm(form, state.filters);
    await loadProperties();
}

function initNeighborhoodSection(property) {
    const mapEl = document.getElementById('neighborhood-map');
    const categoriesEl = document.getElementById('neighborhood-categories');
    const placesEl = document.getElementById('neighborhood-places-list');
    const walkScoreEl = document.getElementById('walk-score');
    const transitScoreEl = document.getElementById('transit-score');
    const nearbySchoolsEl = document.getElementById('nearby-schools');
    const nearbyParksEl = document.getElementById('nearby-parks');
    const nearbyShoppingEl = document.getElementById('nearby-shopping');
    const nearbyRestaurantsEl = document.getElementById('nearby-restaurants');

    if (!mapEl || !categoriesEl || !placesEl) return;

    if (walkScoreEl) walkScoreEl.textContent = `${Math.min(99, 74 + Math.round(property.priceValue / 300000000))}`;
    if (transitScoreEl) transitScoreEl.textContent = `${Math.min(99, 68 + Math.round(property.priceValue / 400000000))}`;

    const categories = [
        { key: 'Schools', label: 'Schools', query: 'amenity=school' },
        { key: 'Restaurants', label: 'Restaurants', query: 'amenity=restaurant' },
        { key: 'Hospitals', label: 'Hospitals', query: 'amenity=hospital' },
        { key: 'Parks', label: 'Parks', query: 'leisure=park' },
        { key: 'Grocery Stores', label: 'Grocery Stores', query: 'shop=supermarket' },
        { key: 'Shopping', label: 'Shopping', query: 'shop=mall' },
        { key: 'Banks', label: 'Banks', query: 'amenity=bank' },
        { key: 'Gas Stations', label: 'Gas Stations', query: 'amenity=fuel' },
        { key: 'Cafes', label: 'Cafes', query: 'amenity=cafe' },
        { key: 'Gyms', label: 'Gyms', query: 'leisure=gym' }
    ];

    const state = window.neighborhoodMapState || (window.neighborhoodMapState = {});
    const lat = Number(property.latitude);
    const lon = Number(property.longitude);

    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;

    if (state.map) {
        state.map.remove();
    }

    state.map = L.map(mapEl, {
        zoomControl: false,
        scrollWheelZoom: true,
        attributionControl: true
    });

    state.map.setView([lat, lon], 14);

    const streetLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    });

    const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/World_Imagery/{z}/{x}/{y}.png', {
        attribution: 'Tiles &copy; Esri'
    });

    state.currentLayer = streetLayer;
    streetLayer.addTo(state.map);

    const propertyIcon = L.divIcon({
        html: '<div class="neighborhood-pin"></div>',
        className: 'neighborhood-pin-wrap',
        iconSize: [24, 24],
        iconAnchor: [12, 24]
    });

    state.marker = L.marker([lat, lon], { icon: propertyIcon }).addTo(state.map);
    state.marker.bindPopup(`<strong>${property.title}</strong><br>${property.location}`);

    const placeLayer = L.layerGroup().addTo(state.map);
    state.placeLayer = placeLayer;

    const setCategoryButtons = (activeKey) => {
        categoriesEl.innerHTML = categories.map((category) => `
            <button type="button" class="neighborhood-category-btn ${category.key === activeKey ? 'active' : ''}" data-category="${category.key}">
                ${category.label}
            </button>
        `).join('');

        categoriesEl.querySelectorAll('button').forEach((button) => {
            button.addEventListener('click', () => {
                renderPlaces(button.dataset.category);
            });
        });
    };

    const updateCounts = (placesByCategory) => {
        if (nearbySchoolsEl) nearbySchoolsEl.textContent = `${placesByCategory.Schools.length} nearby`;
        if (nearbyParksEl) nearbyParksEl.textContent = `${placesByCategory.Parks.length} nearby`;
        if (nearbyShoppingEl) nearbyShoppingEl.textContent = `${placesByCategory.Shopping.length} nearby`;
        if (nearbyRestaurantsEl) nearbyRestaurantsEl.textContent = `${placesByCategory.Restaurants.length} nearby`;
    };

    const renderPlaces = async (categoryKey) => {
        const category = categories.find((item) => item.key === categoryKey) || categories[0];
        setCategoryButtons(category.key);
        placesEl.innerHTML = '<li>Loading nearby places…</li>';

        const query = category.query;
        const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(`[out:json][timeout:25];(node(around:2000,${lat},${lon})[${query}];way(around:2000,${lat},${lon})[${query}];);out center;`)}`;

        try {
            const response = await fetch(url);
            const data = await response.json();
            const places = (data.elements || [])
                .map((element) => ({
                    name: element.tags?.name || category.label,
                    address: element.tags?.addr_street || element.tags?.operator || 'Nearby location',
                    lat: Number(element.lat ?? element.center?.lat),
                    lon: Number(element.lon ?? element.center?.lon)
                }))
                .filter((place) => place.name && Number.isFinite(place.lat) && Number.isFinite(place.lon))
                .slice(0, 8);

            state.placeLayer.clearLayers();
            state.placeLayer.addLayer(state.marker);

            const placeMarkers = places.map((place) => {
                const marker = L.circleMarker([place.lat, place.lon], {
                    radius: 5,
                    color: '#d9a63a',
                    fillColor: '#0f3d66',
                    fillOpacity: 1,
                    weight: 1
                });
                marker.bindPopup(`<strong>${place.name}</strong><br>${place.address}`);
                return marker;
            });

            placeMarkers.forEach((marker) => {
                state.placeLayer.addLayer(marker);
            });

            placesEl.innerHTML = places.length ? places.map((place) => `<li>${place.name}<br><small>${place.address}</small></li>`).join('') : '<li>No nearby places found for this category.</li>';

            const placesByCategory = {
                Schools: categories.find((item) => item.key === 'Schools') ? [] : [],
                Parks: categories.find((item) => item.key === 'Parks') ? [] : [],
                Shopping: categories.find((item) => item.key === 'Shopping') ? [] : [],
                Restaurants: categories.find((item) => item.key === 'Restaurants') ? [] : []
            };

            const counts = {
                Schools: 0,
                Parks: 0,
                Shopping: 0,
                Restaurants: 0
            };

            categories.forEach((categoryItem) => {
                const categoryPlaces = (data.elements || []).filter((element) => {
                    const tags = element.tags || {};
                    if (categoryItem.key === 'Schools' && (tags.amenity === 'school' || tags.amenity === 'college' || tags.amenity === 'kindergarten')) return true;
                    if (categoryItem.key === 'Restaurants' && tags.amenity === 'restaurant') return true;
                    if (categoryItem.key === 'Hospitals' && tags.amenity === 'hospital') return true;
                    if (categoryItem.key === 'Parks' && tags.leisure === 'park') return true;
                    if (categoryItem.key === 'Grocery Stores' && tags.shop === 'supermarket') return true;
                    if (categoryItem.key === 'Shopping' && ['mall', 'department_store', 'clothes'].includes(tags.shop)) return true;
                    if (categoryItem.key === 'Banks' && tags.amenity === 'bank') return true;
                    if (categoryItem.key === 'Gas Stations' && tags.amenity === 'fuel') return true;
                    if (categoryItem.key === 'Cafes' && tags.amenity === 'cafe') return true;
                    if (categoryItem.key === 'Gyms' && tags.leisure === 'gym') return true;
                    return false;
                });

                if (categoryItem.key === 'Schools') counts.Schools = categoryPlaces.length;
                if (categoryItem.key === 'Parks') counts.Parks = categoryPlaces.length;
                if (categoryItem.key === 'Shopping') counts.Shopping = categoryPlaces.length;
                if (categoryItem.key === 'Restaurants') counts.Restaurants = categoryPlaces.length;
            });

            updateCounts(counts);
        } catch (error) {
            placesEl.innerHTML = '<li>Unable to load nearby places right now.</li>';
        }
    };

    document.querySelectorAll('.neighborhood-control-btn').forEach((button) => {
        button.addEventListener('click', () => {
            const action = button.dataset.action;
            if (action === 'zoom-in') {
                state.map.zoomIn();
            } else if (action === 'zoom-out') {
                state.map.zoomOut();
            } else if (action === 'satellite') {
                const isSatellite = button.classList.contains('active');
                button.classList.toggle('active', !isSatellite);
                if (isSatellite) {
                    state.map.removeLayer(satelliteLayer);
                    state.map.addLayer(streetLayer);
                } else {
                    state.map.removeLayer(streetLayer);
                    state.map.addLayer(satelliteLayer);
                }
            } else if (action === 'fullscreen') {
                const mapCard = button.closest('.neighborhood-map-card');
                if (!document.fullscreenElement && mapCard) {
                    mapCard.requestFullscreen().catch(() => {});
                } else {
                    document.exitFullscreen().catch(() => {});
                }
            } else if (action === 'street-view') {
                const streetViewUrl = `https://www.google.com/maps?q=&layer=c&cbll=${lat},${lon}`;
                window.open(streetViewUrl, '_blank', 'noopener,noreferrer');
            }
        });
    });

    setCategoryButtons(categories[0].key);
    renderPlaces(categories[0].key);
}

function initPropertyDetailsPage() {
    if (window.__propertyDetailsPageInit) return;
    window.__propertyDetailsPageInit = true;

    const property = getPropertyByQuery();
    if (!property) return;

    const title = document.querySelector('title');
    if (title) {
        title.textContent = `${property.title} | Atlas Property Group`;
    }

    const statusEl = document.getElementById('property-status');
    const titleEl = document.getElementById('property-title');
    const locationEl = document.getElementById('property-location');
    const priceEl = document.getElementById('property-price');
    const summaryEl = document.getElementById('property-summary');
    const galleryEl = document.getElementById('property-gallery');
    const descriptionEl = document.getElementById('property-description');
    const featuresEl = document.getElementById('property-features');
    const agentNameEl = document.getElementById('agent-name');
    const agentRoleEl = document.getElementById('agent-role');
    const agentImageEl = document.getElementById('agent-image');
    const calcPriceEl = document.getElementById('calc-price');
    const detailStatsEl = document.getElementById('detail-stats');

    if (statusEl) statusEl.textContent = property.status;
    if (titleEl) titleEl.textContent = property.title;
    if (locationEl) locationEl.innerHTML = `<i class="fas fa-map-marker-alt"></i> ${property.location}`;
    if (priceEl) priceEl.textContent = property.price;
    if (summaryEl) summaryEl.textContent = `${property.bedrooms} Bedrooms • ${property.bathrooms} Bathrooms • ${property.garage} Garage`;
    if (descriptionEl) descriptionEl.textContent = property.description;
    if (calcPriceEl) calcPriceEl.value = property.priceValue;

    if (galleryEl) {
        const images = getPropertyGalleryImages(property);
        const galleryState = {
            currentIndex: 0,
            overlayIndex: 0,
            overlay: null
        };
        const isDesktop = window.matchMedia('(min-width: 769px)').matches;

        const renderGallery = () => {
            const heroImage = galleryEl.querySelector('.gallery-hero-image');
            const counterEl = galleryEl.querySelector('.gallery-counter');
            const previewCards = [...galleryEl.querySelectorAll('.gallery-preview-card')];
            const thumbs = [...galleryEl.querySelectorAll('.gallery-thumb')];

            if (heroImage) {
                heroImage.style.opacity = '0';
                const nextSrc = images[galleryState.currentIndex];
                heroImage.src = nextSrc;
                heroImage.alt = `${property.title} photo ${galleryState.currentIndex + 1}`;
                heroImage.loading = galleryState.currentIndex === 0 ? 'eager' : 'lazy';
                window.setTimeout(() => {
                    if (heroImage.src === nextSrc) {
                        heroImage.style.opacity = '1';
                    }
                }, 70);
            }

            if (counterEl) {
                counterEl.textContent = `${galleryState.currentIndex + 1} of ${images.length}`;
            }

            previewCards.forEach((card) => {
                const cardIndex = Number(card.dataset.index || -1);
                card.classList.toggle('active', cardIndex === galleryState.currentIndex);
            });

            thumbs.forEach((thumb) => {
                thumb.classList.toggle('active', Number(thumb.dataset.index) === galleryState.currentIndex);
            });
        };

        const setCurrentImage = (index) => {
            galleryState.currentIndex = (index + images.length) % images.length;
            renderGallery();
        };

        const createOverlay = () => {
            if (galleryState.overlay) {
                galleryState.overlayIndex = galleryState.currentIndex;
                renderOverlay();
                return galleryState.overlay;
            }

            const overlay = document.createElement('div');
            overlay.className = 'gallery-overlay';
            overlay.innerHTML = `
                <div class="gallery-overlay-content">
                    <button type="button" class="gallery-overlay-close" aria-label="Close gallery">
                        <i class="fas fa-times"></i>
                    </button>
                    <button type="button" class="gallery-overlay-nav gallery-overlay-prev" aria-label="Previous photo">
                        <i class="fas fa-chevron-left"></i>
                    </button>
                    <div class="gallery-overlay-stage">
                        <img class="gallery-overlay-image" src="${getHighQualityImage(images[galleryState.currentIndex])}" alt="${property.title} photo ${galleryState.currentIndex + 1}" loading="lazy" decoding="async" onerror="handleImageError(this)">
                    </div>
                    <button type="button" class="gallery-overlay-nav gallery-overlay-next" aria-label="Next photo">
                        <i class="fas fa-chevron-right"></i>
                    </button>
                    <div class="gallery-overlay-footer">
                        <div class="gallery-overlay-counter">1 of ${images.length}</div>
                        <div class="gallery-overlay-thumbs"></div>
                    </div>
                </div>
            `;

            document.body.appendChild(overlay);
            document.body.classList.add('gallery-overlay-open');

            const overlayImage = overlay.querySelector('.gallery-overlay-image');
            const overlayThumbs = overlay.querySelector('.gallery-overlay-thumbs');
            const overlayCounter = overlay.querySelector('.gallery-overlay-counter');
            const prevBtn = overlay.querySelector('.gallery-overlay-prev');
            const nextBtn = overlay.querySelector('.gallery-overlay-next');
            const closeBtn = overlay.querySelector('.gallery-overlay-close');
            const overlayStage = overlay.querySelector('.gallery-overlay-stage');

            const renderOverlay = () => {
                if (!overlayImage || !overlayCounter || !overlayThumbs) return;
                const visibleIndex = galleryState.overlayIndex;
                overlayImage.src = images[visibleIndex];
                overlayImage.alt = `${property.title} photo ${visibleIndex + 1}`;
                overlayCounter.textContent = `${visibleIndex + 1} of ${images.length}`;
                overlayThumbs.innerHTML = images.map((image, index) => `
                    <button type="button" class="gallery-overlay-thumb ${index === visibleIndex ? 'active' : ''}" data-index="${index}" aria-label="Open photo ${index + 1}">
                        <img src="${getHighQualityImage(image)}" alt="${property.title} thumbnail ${index + 1}" loading="lazy" decoding="async" onerror="handleImageError(this)">
                    </button>
                `).join('');
                overlayThumbs.querySelectorAll('button').forEach((button) => {
                    button.addEventListener('click', () => {
                        galleryState.overlayIndex = Number(button.dataset.index);
                        renderOverlay();
                    });
                });
            };

            const moveOverlayImage = (delta) => {
                galleryState.overlayIndex = (galleryState.overlayIndex + delta + images.length) % images.length;
                renderOverlay();
            };

            const toggleOverlayZoom = () => {
                overlayImage.classList.toggle('is-zoomed');
            };

            prevBtn?.addEventListener('click', () => moveOverlayImage(-1));
            nextBtn?.addEventListener('click', () => moveOverlayImage(1));
            closeBtn?.addEventListener('click', closeOverlay);
            overlay.addEventListener('click', (event) => {
                if (event.target === overlay) {
                    closeOverlay();
                }
            });
            overlayImage?.addEventListener('click', toggleOverlayZoom);
            overlayStage?.addEventListener('touchstart', (event) => {
                overlayStage.dataset.touchStart = event.touches[0].clientX;
            }, { passive: true });
            overlayStage?.addEventListener('touchend', (event) => {
                const startX = Number(overlayStage.dataset.touchStart || 0);
                const endX = event.changedTouches[0].clientX;
                if (startX - endX > 50) {
                    moveOverlayImage(1);
                } else if (endX - startX > 50) {
                    moveOverlayImage(-1);
                }
            }, { passive: true });

            renderOverlay();
            galleryState.overlay = overlay;
            return overlay;
        };

        const closeOverlay = () => {
            if (!galleryState.overlay) return;
            galleryState.overlay.classList.remove('active');
            document.body.classList.remove('gallery-overlay-open');
            setTimeout(() => {
                galleryState.overlay?.remove();
                galleryState.overlay = null;
            }, 220);
        };

        const openOverlay = (index = galleryState.currentIndex) => {
            if (!images.length) return;
            galleryState.overlayIndex = index;
            const overlay = createOverlay();
            overlay.classList.add('active');
        };

        const previewImages = images.slice(1, 4);
        const previewMarkup = previewImages.map((image, index) => `
            <button type="button" class="gallery-preview-card" data-index="${index + 1}">
                <img src="${getHighQualityImage(image)}" alt="${property.title} preview ${index + 1}" loading="lazy" decoding="async" onerror="handleImageError(this)">
            </button>
        `).join('');
        const hasMorePhotos = images.length > previewImages.length + 1;
        const viewAllMarkup = hasMorePhotos ? `
            <button type="button" class="gallery-preview-card gallery-preview-card--all" data-index="0">
                <span class="gallery-preview-label">View All Photos<br>${images.length}</span>
            </button>
        ` : '';

        galleryEl.innerHTML = `
            <div class="gallery-shell">
                <div class="gallery-stage-row">
                    <div class="gallery-hero-card" data-index="${galleryState.currentIndex}" role="button" tabindex="0">
                        <img class="gallery-hero-image" src="${getHighQualityImage(images[0])}" alt="${property.title} photo 1" loading="lazy" decoding="async" onerror="handleImageError(this)">
                        <button type="button" class="gallery-nav gallery-prev" aria-label="Previous photo">
                            <i class="fas fa-chevron-left"></i>
                        </button>
                        <button type="button" class="gallery-nav gallery-next" aria-label="Next photo">
                            <i class="fas fa-chevron-right"></i>
                        </button>
                        <div class="gallery-hero-overlay">
                            <span class="gallery-counter">1 of ${images.length}</span>
                        </div>
                    </div>
                    <div class="gallery-preview-grid">
                        ${previewMarkup}${viewAllMarkup}
                    </div>
                </div>
                <div class="gallery-thumbs" role="listbox" aria-label="Property photo gallery">
                    ${images.map((image, index) => `
                        <button type="button" class="gallery-thumb ${index === 0 ? 'active' : ''}" data-index="${index}" aria-label="Open photo ${index + 1}">
                            <img src="${getHighQualityImage(image)}" alt="${property.title} thumbnail ${index + 1}" loading="lazy" decoding="async" onerror="handleImageError(this)">
                        </button>
                    `).join('')}
                </div>
            </div>
        `;

        const heroCard = galleryEl.querySelector('.gallery-hero-card');
        const previewCards = [...galleryEl.querySelectorAll('.gallery-preview-card')];
        const thumbs = [...galleryEl.querySelectorAll('.gallery-thumb')];
        const thumbRow = galleryEl.querySelector('.gallery-thumbs');
        const prevButton = galleryEl.querySelector('.gallery-prev');
        const nextButton = galleryEl.querySelector('.gallery-next');
        const heroImage = galleryEl.querySelector('.gallery-hero-image');
        const counterEl = galleryEl.querySelector('.gallery-counter');

        const updateView = () => {
            if (heroImage && counterEl) {
                heroImage.style.opacity = '0';
                const nextSrc = images[galleryState.currentIndex];
                heroImage.src = nextSrc;
                heroImage.alt = `${property.title} photo ${galleryState.currentIndex + 1}`;
                heroImage.loading = galleryState.currentIndex === 0 ? 'eager' : 'lazy';
                window.setTimeout(() => {
                    if (heroImage.src === nextSrc) {
                        heroImage.style.opacity = '1';
                    }
                }, 70);
                counterEl.textContent = `${galleryState.currentIndex + 1} of ${images.length}`;
            }

            previewCards.forEach((card) => {
                const cardIndex = Number(card.dataset.index || -1);
                card.classList.toggle('active', cardIndex === galleryState.currentIndex);
            });

            thumbs.forEach((thumb) => {
                thumb.classList.toggle('active', Number(thumb.dataset.index) === galleryState.currentIndex);
            });
        };

        const handleNext = () => {
            setCurrentImage(galleryState.currentIndex + 1);
        };

        const handlePrev = () => {
            setCurrentImage(galleryState.currentIndex - 1);
        };

        if (isDesktop && thumbRow) {
            thumbRow.addEventListener('wheel', (event) => {
                const isHorizontalGesture = Math.abs(event.deltaY) > Math.abs(event.deltaX);
                if (!isHorizontalGesture) return;
                const atStart = thumbRow.scrollLeft <= 0 && event.deltaY < 0;
                const atEnd = thumbRow.scrollLeft + thumbRow.clientWidth >= thumbRow.scrollWidth - 1 && event.deltaY > 0;
                if (!atStart && !atEnd) {
                    event.preventDefault();
                    thumbRow.scrollLeft += event.deltaY;
                }
            }, { passive: false });
        }

        heroCard?.addEventListener('click', (event) => {
            if (event.target.closest('.gallery-nav')) return;
            openOverlay(galleryState.currentIndex);
        });
        prevButton?.addEventListener('click', (event) => {
            event.stopPropagation();
            handlePrev();
        });
        nextButton?.addEventListener('click', (event) => {
            event.stopPropagation();
            handleNext();
        });
        previewCards.forEach((card) => {
            card.addEventListener('click', () => {
                if (card.dataset.index === '0') {
                    openOverlay(0);
                    return;
                }
                setCurrentImage(Number(card.dataset.index));
                openOverlay(Number(card.dataset.index));
            });
        });
        thumbs.forEach((thumb) => {
            thumb.addEventListener('click', () => {
                setCurrentImage(Number(thumb.dataset.index));
                if (!isDesktop) {
                    openOverlay(Number(thumb.dataset.index));
                }
            });
        });

        renderGallery();
        updateView();

        document.addEventListener('keydown', (event) => {
            if (!images.length) return;
            if (document.body.classList.contains('gallery-overlay-open')) {
                if (event.key === 'Escape') {
                    closeOverlay();
                }
                if (event.key === 'ArrowRight') {
                    event.preventDefault();
                    galleryState.overlayIndex = (galleryState.overlayIndex + 1 + images.length) % images.length;
                    if (galleryState.overlay) {
                        const overlayImage = galleryState.overlay.querySelector('.gallery-overlay-image');
                        const overlayCounter = galleryState.overlay.querySelector('.gallery-overlay-counter');
                        const overlayThumbs = galleryState.overlay.querySelector('.gallery-overlay-thumbs');
                        if (overlayImage && overlayCounter && overlayThumbs) {
                            overlayImage.src = images[galleryState.overlayIndex];
                            overlayImage.alt = `${property.title} photo ${galleryState.overlayIndex + 1}`;
                            overlayCounter.textContent = `${galleryState.overlayIndex + 1} of ${images.length}`;
                            overlayThumbs.querySelectorAll('button').forEach((button) => {
                                button.classList.toggle('active', Number(button.dataset.index) === galleryState.overlayIndex);
                            });
                        }
                    }
                }
                if (event.key === 'ArrowLeft') {
                    event.preventDefault();
                    galleryState.overlayIndex = (galleryState.overlayIndex - 1 + images.length) % images.length;
                    if (galleryState.overlay) {
                        const overlayImage = galleryState.overlay.querySelector('.gallery-overlay-image');
                        const overlayCounter = galleryState.overlay.querySelector('.gallery-overlay-counter');
                        const overlayThumbs = galleryState.overlay.querySelector('.gallery-overlay-thumbs');
                        if (overlayImage && overlayCounter && overlayThumbs) {
                            overlayImage.src = images[galleryState.overlayIndex];
                            overlayImage.alt = `${property.title} photo ${galleryState.overlayIndex + 1}`;
                            overlayCounter.textContent = `${galleryState.overlayIndex + 1} of ${images.length}`;
                            overlayThumbs.querySelectorAll('button').forEach((button) => {
                                button.classList.toggle('active', Number(button.dataset.index) === galleryState.overlayIndex);
                            });
                        }
                    }
                }
                return;
            }

            if (event.key === 'ArrowRight') {
                event.preventDefault();
                setCurrentImage(galleryState.currentIndex + 1);
            }
            if (event.key === 'ArrowLeft') {
                event.preventDefault();
                setCurrentImage(galleryState.currentIndex - 1);
            }
        });
    }

    if (featuresEl) {
        featuresEl.innerHTML = property.features.map((feature) => `
            <div class="amenity-item">
                <i class="fas fa-check-circle"></i> ${feature}
            </div>
        `).join('');
    }

    if (agentNameEl) agentNameEl.textContent = property.agent;
    if (agentImageEl) agentImageEl.src = 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=200&q=80';

    if (detailStatsEl) {
        detailStatsEl.innerHTML = `
            <div class="amenity-item"><i class="fas fa-bed"></i> ${property.bedrooms} Bedrooms</div>
            <div class="amenity-item"><i class="fas fa-bath"></i> ${property.bathrooms} Bathrooms</div>
            <div class="amenity-item"><i class="fas fa-car"></i> ${property.garage} Car Garage</div>
            <div class="amenity-item"><i class="fas fa-ruler-combined"></i> ${property.area}</div>
            <div class="amenity-item"><i class="fas fa-calendar-alt"></i> Built ${property.yearBuilt}</div>
            <div class="amenity-item"><i class="fas fa-map-marker-alt"></i> ${property.city}</div>
        `;
    }

    initNeighborhoodSection(property);
    
    // Render all 25 enhanced sections
    renderPropertyExtendedContent(property);
    renderAgentExtendedDetails(property);
    setupMobileContactBar(property);
    
    // Track recently viewed property
    trackRecentlyViewed(property.id);
}

function normalizeAgentPhone(phone) {
    return phone ? phone.toString().replace(/\D/g, '') : '';
}

function highlightContactForm(form) {
    if (!form) return;
    form.classList.add('mobile-contact-form-highlight');
    window.setTimeout(() => {
        form.classList.remove('mobile-contact-form-highlight');
    }, 1200);
}

function setupMobileContactBar(property) {
    if (!property?.agentInfo) return;

    const contactBar = document.getElementById('mobile-contact-bar');
    const nameEl = document.getElementById('mobile-contact-name');
    const avatarEl = document.getElementById('mobile-contact-avatar');
    const callButton = document.getElementById('mobile-call-button');
    const waButton = document.getElementById('mobile-wa-button');
    const contactButton = document.getElementById('mobile-contact-button');
    const form = document.getElementById('contact-agent-form');

    if (!contactBar || !nameEl || !avatarEl || !callButton || !waButton || !contactButton || !form) {
        return;
    }

    const phone = normalizeAgentPhone(property.agentInfo.phone || property.agentInfo.whatsapp);
    const whatsapp = normalizeAgentPhone(property.agentInfo.whatsapp || property.agentInfo.phone);
    const agentTitle = property.agentInfo.title || 'Senior Global Advisor';

    nameEl.textContent = property.agentInfo.name || 'Agent';
    avatarEl.src = avatarEl.src || 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=200&q=80';
    avatarEl.alt = `${property.agentInfo.name} profile photo`;
    const mobileRoleEl = document.querySelector('.mobile-contact-role');
    if (mobileRoleEl) {
        mobileRoleEl.textContent = agentTitle;
    }

    if (phone) {
        callButton.href = `tel:+${phone}`;
    } else {
        callButton.removeAttribute('href');
        callButton.setAttribute('aria-disabled', 'true');
    }

    if (whatsapp) {
        waButton.href = `https://wa.me/${whatsapp}`;
    } else {
        waButton.removeAttribute('href');
        waButton.setAttribute('aria-disabled', 'true');
    }

    const openContactForm = (event) => {
        if (event) {
            event.preventDefault();
        }
        if (!form) return;
        if (typeof form.scrollIntoView === 'function') {
            form.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        highlightContactForm(form);
        contactButton.focus({ preventScroll: true });
    };

    contactButton.addEventListener('click', openContactForm);
    contactButton.addEventListener('touchstart', (event) => {
        event.preventDefault();
        openContactForm();
    }, { passive: false });
    contactButton.addEventListener('touchend', (event) => {
        event.preventDefault();
        openContactForm();
    }, { passive: false });

    const mediaQuery = window.matchMedia('(max-width: 768px)');
    const updateBarVisibility = () => {
        if (mediaQuery.matches) {
            contactBar.classList.add('mobile-contact-bar-visible');
        } else {
            contactBar.classList.remove('mobile-contact-bar-visible');
        }
    };
    updateBarVisibility();
    mediaQuery.addEventListener?.('change', updateBarVisibility);
}

window.propertiesApp = {
    properties,
    formatPrice,
    getPropertyById,
    getPropertyBySlug,
    getPropertyByQuery,
    getFilteredProperties,
    sortProperties,
    paginateProperties,
    createPropertyCardMarkup,
    PROPERTY_PAGE_SIZE
};

// ============================================================
// ENHANCED SECTIONS: 25 Premium Real Estate Sections
// ============================================================

// Utility: Get icon for a feature
function getFeatureIcon(feature) {
    const iconMap = {
        'gourmet kitchen': 'fa-utensils',
        'walk-in closet': 'fa-person-booth',
        'fireplace': 'fa-fire',
        'home office': 'fa-briefcase',
        'home theater': 'fa-film',
        'wine cellar': 'fa-wine-glass',
        'smart home': 'fa-home',
        'spa': 'fa-water',
        'gym': 'fa-dumbbell',
        'elevator': 'fa-up-down',
        'laundry room': 'fa-washing-machine',
        'infinity pool': 'fa-water',
        'outdoor kitchen': 'fa-fire',
        'bbq area': 'fa-fire',
        'garden': 'fa-leaf',
        'balcony': 'fa-building',
        'rooftop terrace': 'fa-mountain-sun',
        'guest house': 'fa-house',
        'private dock': 'fa-water',
        'tennis court': 'fa-tennis',
        'basketball court': 'fa-basketball',
        'smart thermostat': 'fa-temperature-half',
        'solar panels': 'fa-sun',
        'ev charging': 'fa-plug',
        'double glazing': 'fa-window-maximize'
    };
    return iconMap[feature.toLowerCase()] || 'fa-check-circle';
}

// SECTION 1: Quick Facts
function renderQuickFacts(property) {
    if (!property) return '';
    
    const facts = [
        { label: 'Property Type', value: property.type },
        { label: 'MLS Number', value: property.mlsNumber || 'N/A' },
        { label: 'Property Status', value: property.status },
        { label: 'Year Built', value: property.yearBuilt },
        { label: 'Lot Size', value: property.lotSize || 'N/A' },
        { label: 'Living Area', value: property.area },
        { label: 'Stories', value: property.stories || 'N/A' },
        { label: 'Garage Spaces', value: property.garage },
        { label: 'HOA Fees', value: property.hoaFees || 'N/A' },
        { label: 'Property ID', value: property.propertyId || 'N/A' }
    ];

    return `
        <div class="info-block">
            <h2>Quick Facts</h2>
            <div class="property-extended-grid">
                ${facts.map(fact => `
                    <div class="property-extended-card">
                        <h3 style="font-size: 14px; margin-bottom: 8px; color: var(--medium-gray);">${fact.label}</h3>
                        <p style="margin: 0; font-weight: 600; color: var(--primary-blue);">${fact.value}</p>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

// SECTION 2: Interior Features
function renderInteriorFeatures(property) {
    if (!property.interiorFeatures || !property.interiorFeatures.length) return '';
    
    return `
        <div class="info-block">
            <h2>Interior Features</h2>
            <div class="amenities-list">
                ${property.interiorFeatures.map(feature => `
                    <div class="amenity-item">
                        <i class="fas ${getFeatureIcon(feature)}"></i> ${feature}
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

// SECTION 3: Exterior Features
function renderExteriorFeatures(property) {
    if (!property.exteriorFeatures || !property.exteriorFeatures.length) return '';
    
    return `
        <div class="info-block">
            <h2>Exterior Features</h2>
            <div class="amenities-list">
                ${property.exteriorFeatures.map(feature => `
                    <div class="amenity-item">
                        <i class="fas ${getFeatureIcon(feature)}"></i> ${feature}
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

// SECTION 4: Community Amenities
function renderCommunityAmenities(property) {
    if (!property.communityAmenities || !property.communityAmenities.length) return '';
    
    return `
        <div class="info-block">
            <h2>Community Amenities</h2>
            <div class="amenities-list">
                ${property.communityAmenities.map(amenity => `
                    <div class="amenity-item">
                        <i class="fas fa-star"></i> ${amenity}
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

// SECTION 5: Property Highlights
function renderPropertyHighlights(property) {
    if (!property.highlights || !property.highlights.length) return '';
    
    return `
        <div class="info-block">
            <h2>Property Highlights</h2>
            <div class="property-extended-grid">
                ${property.highlights.map(highlight => `
                    <div class="property-highlight-card">
                        <i class="fas fa-star"></i>
                        <span>${highlight}</span>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

// SECTION 6: Property History (Timeline)
function renderPropertyHistory(property) {
    if (!property.propertyHistory || !property.propertyHistory.length) return '';
    
    return `
        <div class="info-block">
            <h2>Property History</h2>
            <div class="property-timeline">
                ${property.propertyHistory.map(item => `
                    <div class="property-timeline-item">
                        <strong>${item.year}</strong><br>
                        ${item.event}
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

// SECTION 7: Price History (Chart)
function renderPriceHistory(property) {
    if (!property.priceHistory || !property.priceHistory.length) return '';
    
    const chartData = property.priceHistory.map(p => p.price);
    const chartLabels = property.priceHistory.map(p => p.month);
    
    return `
        <div class="info-block">
            <h2>Price History</h2>
            <canvas id="price-history-chart" style="max-height: 300px;"></canvas>
        </div>
        <script>
            (function() {
                setTimeout(() => {
                    const ctx = document.getElementById('price-history-chart');
                    if (ctx && typeof Chart !== 'undefined') {
                        new Chart(ctx, {
                            type: 'line',
                            data: {
                                labels: ${JSON.stringify(chartLabels)},
                                datasets: [{
                                    label: 'Property Price',
                                    data: ${JSON.stringify(chartData)},
                                    borderColor: 'var(--accent-gold)',
                                    backgroundColor: 'rgba(217, 166, 58, 0.1)',
                                    tension: 0.4,
                                    fill: true,
                                    pointBackgroundColor: 'var(--primary-blue)',
                                    pointBorderColor: 'var(--accent-gold)',
                                    pointRadius: 5,
                                    pointHoverRadius: 7
                                }]
                            },
                            options: {
                                responsive: true,
                                maintainAspectRatio: true,
                                plugins: {
                                    legend: { display: false }
                                },
                                scales: {
                                    y: {
                                        beginAtZero: false,
                                        ticks: {
                                            callback: function(value) {
                                                return '$' + (value / 1000000).toFixed(1) + 'M';
                                            }
                                        }
                                    }
                                }
                            }
                        });
                    }
                }, 100);
            })();
        </script>
    `;
}

// SECTION 8: Nearby Schools
function renderNearbySchools(property) {
    if (!property.nearbySchools || !property.nearbySchools.length) return '';
    
    return `
        <div class="info-block">
            <h2>Nearby Schools</h2>
            <div class="property-extended-grid">
                ${property.nearbySchools.slice(0, 6).map(school => `
                    <div class="property-extended-card">
                        <h3>${school.name}</h3>
                        <ul>
                            <li><strong>Rating:</strong> ${school.rating}/5</li>
                            <li><strong>Distance:</strong> ${school.distance}</li>
                            <li><strong>Type:</strong> ${school.type}</li>
                        </ul>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

// SECTION 9: Nearby Places
function renderNearbyPlaces(property) {
    if (!property.nearbyPlaces || !property.nearbyPlaces.length) return '';
    
    return `
        <div class="info-block">
            <h2>Nearby Places</h2>
            <div class="property-extended-grid">
                ${property.nearbyPlaces.slice(0, 8).map(place => `
                    <div class="property-extended-card">
                        <h3>${place.name}</h3>
                        <ul>
                            <li><strong>Category:</strong> ${place.category}</li>
                            <li><strong>Distance:</strong> ${place.distance}</li>
                        </ul>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

// SECTION 10: Commute Information
function renderCommuteInfo(property) {
    if (!property.commuteInfo) return '';
    
    return `
        <div class="info-block">
            <h2>Commute Information</h2>
            <div class="amenities-list">
                <div class="amenity-item"><i class="fas fa-plane"></i> ${property.commuteInfo.airport || 'N/A'}</div>
                <div class="amenity-item"><i class="fas fa-building"></i> ${property.commuteInfo.downtown || 'N/A'}</div>
                <div class="amenity-item"><i class="fas fa-water"></i> ${property.commuteInfo.beach || 'N/A'}</div>
                <div class="amenity-item"><i class="fas fa-hospital"></i> ${property.commuteInfo.hospital || 'N/A'}</div>
                <div class="amenity-item"><i class="fas fa-shopping-bag"></i> ${property.commuteInfo.shopping || 'N/A'}</div>
            </div>
        </div>
    `;
}

// SECTION 11: Floor Plans
function renderFloorPlans(property) {
    if (!property.floorPlans || !property.floorPlans.length) return '';
    
    return `
        <div class="info-block">
            <h2>Floor Plans</h2>
            <div class="property-extended-grid">
                ${property.floorPlans.map(plan => `
                    <div class="property-plan-card">
                        <img src="${getHighQualityImage(plan.image)}" alt="${plan.name}" onerror="handleImageError(this)">
                        <div class="card-body">
                            <p style="margin: 0 0 10px 0; font-weight: 600;">${plan.name}</p>
                            <a href="${plan.image}" download class="property-doc-btn" style="display: inline-block;">
                                <i class="fas fa-download"></i> Download
                            </a>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

// SECTION 12: Video Tour
function renderVideoTour(property) {
    if (!property.videoTour) return '';
    
    return `
        <div class="info-block">
            <h2>Video Tour</h2>
            <div style="position: relative; width: 100%; padding-bottom: 56.25%; height: 0; overflow: hidden; border-radius: 12px;">
                <iframe 
                    src="${property.videoTour}" 
                    style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: none; border-radius: 12px;"
                    frameborder="0" 
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowfullscreen>
                </iframe>
            </div>
        </div>
    `;
}

// SECTION 13: 3D Virtual Tour
function renderVirtualTour(property) {
    if (!property.virtualTour) return '';
    
    return `
        <div class="info-block">
            <h2>3D Virtual Tour</h2>
            <div style="position: relative; width: 100%; padding-bottom: 56.25%; height: 0; overflow: hidden; border-radius: 12px;">
                <iframe 
                    src="${property.virtualTour}" 
                    style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: none; border-radius: 12px;"
                    allow="xr-spatial-tracking"
                    allowfullscreen>
                </iframe>
            </div>
        </div>
    `;
}

// SECTION 14: Documents
function renderDocuments(property) {
    if (!property.documents || !property.documents.length) return '';
    
    return `
        <div class="info-block">
            <h2>Documents</h2>
            <div style="display: flex; flex-wrap: wrap; gap: 12px;">
                ${property.documents.map(doc => `
                    <a href="${doc.url}" class="property-doc-btn">
                        <i class="fas ${doc.icon}"></i> ${doc.name}
                    </a>
                `).join('')}
            </div>
        </div>
    `;
}

// SECTION 15: Financial Information
function renderFinancialInfo(property) {
    if (!property.financialInfo) return '';
    
    return `
        <div class="info-block">
            <h2>Financial Information</h2>
            <div class="property-extended-grid">
                <div class="property-extended-card">
                    <h3>Annual Property Tax</h3>
                    <p style="margin: 0; font-weight: 600; color: var(--primary-blue);">${property.financialInfo.propertyTax}</p>
                </div>
                <div class="property-extended-card">
                    <h3>Insurance Estimate</h3>
                    <p style="margin: 0; font-weight: 600; color: var(--primary-blue);">${property.financialInfo.insurance}</p>
                </div>
                <div class="property-extended-card">
                    <h3>HOA Fee</h3>
                    <p style="margin: 0; font-weight: 600; color: var(--primary-blue);">${property.financialInfo.hoaFee}</p>
                </div>
                <div class="property-extended-card">
                    <h3>Estimated Utilities</h3>
                    <p style="margin: 0; font-weight: 600; color: var(--primary-blue);">${property.financialInfo.utilities}</p>
                </div>
                <div class="property-extended-card">
                    <h3>Rental Estimate</h3>
                    <p style="margin: 0; font-weight: 600; color: var(--primary-blue);">${property.financialInfo.rentalEstimate}</p>
                </div>
            </div>
        </div>
    `;
}

// SECTION 16: Energy & Sustainability
function renderSustainability(property) {
    if (!property.sustainability) return '';
    
    const items = [
        { label: 'Solar Panels', value: property.sustainability.solarPanels },
        { label: 'EV Charging', value: property.sustainability.evCharging },
        { label: 'Energy Rating', value: property.sustainability.energyRating },
        { label: 'Double Glazing', value: property.sustainability.doubleGlazing },
        { label: 'Smart Thermostat', value: property.sustainability.smartThermostat }
    ];
    
    return `
        <div class="info-block">
            <h2>Energy & Sustainability</h2>
            <div class="amenities-list">
                ${items.map(item => `
                    <div class="amenity-item">
                        <i class="fas ${item.value === true || item.value === 'Yes' ? 'fa-check-circle' : item.value ? 'fa-info-circle' : 'fa-times-circle'}"></i> 
                        ${item.label}: ${typeof item.value === 'boolean' ? (item.value ? 'Yes' : 'No') : item.value}
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

// SECTION 17: Similar Properties
function renderSimilarProperties(property) {
    const similar = properties.filter(p => p.id !== property.id && p.typeValue === property.typeValue).slice(0, 6);
    
    if (!similar.length) return '';
    
    return `
        <div class="info-block">
            <h2>Similar Properties</h2>
            <div class="property-extended-grid">
                ${similar.map(prop => `
                    <div class="property-similar-card">
                        <img src="${getPropertyImage(prop)}" alt="${prop.title}" loading="lazy" decoding="async" onerror="handleImageError(this)">
                        <div class="card-body">
                            <h3 style="margin: 0 0 8px 0; font-size: 16px;">${prop.title}</h3>
                            <p style="margin: 0 0 8px 0; color: var(--accent-gold); font-weight: 600;">${prop.price}</p>
                            <p style="margin: 0; font-size: 13px; color: var(--medium-gray);">${prop.bedrooms} BD • ${prop.bathrooms} BA</p>
                            <a href="property-details.html?id=${prop.id}" class="btn btn-primary" style="width: 100%; display: inline-block; margin-top: 10px; text-align: center; font-size: 12px; padding: 8px 0;">View</a>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

// SECTION 18: Recently Viewed Properties
function renderRecentlyViewed() {
    const recentlyViewed = JSON.parse(localStorage.getItem('recentlyViewed')) || [];
    const recent = recentlyViewed.slice(-6).reverse().map(id => properties.find(p => p.id === id)).filter(Boolean);
    
    if (!recent.length) return '';
    
    return `
        <div class="info-block">
            <h2>Recently Viewed</h2>
            <div class="property-extended-grid">
                ${recent.map(prop => `
                    <div class="property-similar-card">
                        <img src="${getPropertyImage(prop)}" alt="${prop.title}" loading="lazy" decoding="async" onerror="handleImageError(this)">
                        <div class="card-body">
                            <h3 style="margin: 0 0 8px 0; font-size: 16px;">${prop.title}</h3>
                            <p style="margin: 0 0 8px 0; color: var(--accent-gold); font-weight: 600;">${prop.price}</p>
                            <p style="margin: 0; font-size: 13px; color: var(--medium-gray);">${prop.bedrooms} BD • ${prop.bathrooms} BA</p>
                            <a href="property-details.html?id=${prop.id}" class="btn btn-primary" style="width: 100%; display: inline-block; margin-top: 10px; text-align: center; font-size: 12px; padding: 8px 0;">View</a>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

// SECTION 19: Schedule a Tour
function renderScheduleTour() {
    return `
        <div class="info-block">
            <h2>Schedule a Tour</h2>
            <div style="background: var(--light-gray); padding: 28px; border-radius: 12px;">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px;">
                    <div>
                        <label style="display: block; margin-bottom: 8px; font-weight: 600;">Date</label>
                        <input type="date" class="calc-input" id="tour-date">
                    </div>
                    <div>
                        <label style="display: block; margin-bottom: 8px; font-weight: 600;">Time</label>
                        <input type="time" class="calc-input" id="tour-time">
                    </div>
                </div>
                <div style="margin-bottom: 20px;">
                    <label style="display: block; margin-bottom: 8px; font-weight: 600;">Tour Type</label>
                    <div style="display: flex; gap: 12px;">
                        <button type="button" class="property-action-btn active" data-tour-type="in-person">In-Person</button>
                        <button type="button" class="property-action-btn" data-tour-type="virtual">Virtual Tour</button>
                    </div>
                </div>
                <div style="margin-bottom: 20px;">
                    <label style="display: block; margin-bottom: 8px; font-weight: 600;">Special Requests</label>
                    <textarea class="calc-input" id="tour-requests" placeholder="Any special requests?" style="resize: vertical; min-height: 80px;"></textarea>
                </div>
                <button class="btn btn-primary" onclick="scheduleTour()" style="width: 100%;">Request Tour</button>
            </div>
        </div>
    `;
}

// SECTION 20: Share Property
function renderShareProperty(property) {
    const shareUrl = window.location.href;
    const shareTitle = property.title;
    
    return `
        <div class="info-block">
            <h2>Share Property</h2>
            <div class="property-share-grid">
                <button onclick="shareOnFacebook('${shareUrl}', '${shareTitle}')" class="property-action-btn">
                    <i class="fab fa-facebook"></i> Facebook
                </button>
                <button onclick="shareOnX('${shareUrl}', '${shareTitle}')" class="property-action-btn">
                    <i class="fab fa-x-twitter"></i> X
                </button>
                <button onclick="shareOnLinkedIn('${shareUrl}', '${shareTitle}')" class="property-action-btn">
                    <i class="fab fa-linkedin"></i> LinkedIn
                </button>
                <button onclick="shareOnWhatsApp('${shareUrl}', '${shareTitle}')" class="property-action-btn">
                    <i class="fab fa-whatsapp"></i> WhatsApp
                </button>
                <button onclick="shareViaEmail('${property.agentInfo.email}', '${shareTitle}')" class="property-action-btn">
                    <i class="fas fa-envelope"></i> Email
                </button>
                <button onclick="copyShareLink('${shareUrl}')" class="property-action-btn">
                    <i class="fas fa-link"></i> Copy Link
                </button>
                <button onclick="printProperty()" class="property-action-btn">
                    <i class="fas fa-print"></i> Print
                </button>
            </div>
        </div>
    `;
}

// SECTION 21: Save Property
function renderSaveProperty(property) {
    return `
        <div style="display: flex; align-items: center; gap: 12px; margin: 20px 0;">
            <button id="save-property-btn" onclick="toggleSaveProperty(${property.id})" class="property-action-btn" style="flex: 1;">
                <i class="fas fa-heart"></i> <span id="save-text">Save Property</span>
            </button>
        </div>
        <script>
            (function() {
                const savedId = ${property.id};
                const saved = JSON.parse(localStorage.getItem('savedProperties')) || [];
                const btn = document.getElementById('save-property-btn');
                const txt = document.getElementById('save-text');
                
                if (saved.includes(savedId)) {
                    btn.classList.add('active');
                    txt.textContent = 'Saved';
                }
            })();
        </script>
    `;
}

// SECTION 22: Compare Properties
function renderCompareProperties(property) {
    return `
        <div class="info-block">
            <h2>Compare Properties</h2>
            <div style="background: var(--light-gray); padding: 20px; border-radius: 12px; text-align: center;">
                <p style="margin: 0 0 16px 0; color: var(--medium-gray);">Compare this property with up to 3 others</p>
                <button onclick="openPropertyComparison(${property.id})" class="btn btn-primary">Start Comparison</button>
            </div>
        </div>
    `;
}

// SECTION 23: Expanded Agent Section
function renderExpandedAgent(property) {
    const agent = property.agentInfo;
    if (!agent) return '';
    
    return `
        <div class="info-block" style="margin-bottom: 12px;">
            <h2 style="margin-bottom: 6px; font-size: 20px;">Meet Your Agent</h2>
            <div style="background: var(--light-gray); padding: 8px; border-radius: 12px;">
                <div style="display: grid; grid-template-columns: auto 1fr; gap: 8px; align-items: center;">
                    <img src="https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=150&q=80" 
                         style="width: 46px; height: 46px; border-radius: 50%; object-fit: cover;" 
                         alt="${agent.name}">
                    <div>
                        <h3 style="margin: 0 0 2px 0; font-size: 14px;">${agent.name}</h3>
                        <div style="display: flex; gap: 4px; flex-wrap: wrap; align-items: center;">
                            <a href="tel:${agent.phone}" class="property-doc-btn" style="padding: 4px 6px; font-size: 10px;">
                                <i class="fas fa-phone"></i>
                            </a>
                            <a href="mailto:${agent.email}" class="property-doc-btn" style="padding: 4px 6px; font-size: 10px;">
                                <i class="fas fa-envelope"></i>
                            </a>
                            <a href="https://wa.me/${agent.whatsapp.replace(/\D/g, '')}" class="property-doc-btn" target="_blank" style="padding: 4px 6px; font-size: 10px;">
                                <i class="fab fa-whatsapp"></i>
                            </a>
                        </div>
                    </div>
                </div>
                <div class="property-extended-grid" style="grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; margin-top: 6px;">
                    <div class="property-extended-card" style="padding: 6px;">
                        <h3 style="margin-bottom: 3px; font-size: 13px;">Experience</h3>
                        <p style="margin: 0; color: var(--medium-gray); font-size: 11px;">${agent.experience} yrs</p>
                    </div>
                    <div class="property-extended-card" style="padding: 6px;">
                        <h3 style="margin-bottom: 3px; font-size: 13px;">Sold</h3>
                        <p style="margin: 0; color: var(--medium-gray); font-size: 11px;">${agent.sold}+</p>
                    </div>
                </div>
                ${agent.awards && agent.awards.length ? `
                    <div style="margin-top: 6px; padding-top: 6px; border-top: 1px solid var(--border-color); font-size: 11px;">
                        <strong>Awards:</strong> ${agent.awards.join(', ')}
                    </div>
                ` : ''}
            </div>
        </div>
    `;
}

// Main render function for extended content
function renderPropertyExtendedContent(property) {
    const contentDiv = document.getElementById('property-extended-content');
    if (!contentDiv) return;
    
    const html = `
        ${renderQuickFacts(property)}
        ${renderInteriorFeatures(property)}
        ${renderExteriorFeatures(property)}
        ${renderCommunityAmenities(property)}
        ${renderPropertyHighlights(property)}
        ${renderPropertyHistory(property)}
        ${renderPriceHistory(property)}
        ${renderNearbySchools(property)}
        ${renderNearbyPlaces(property)}
        ${renderCommuteInfo(property)}
        ${renderFloorPlans(property)}
        ${renderVideoTour(property)}
        ${renderVirtualTour(property)}
        ${renderDocuments(property)}
        ${renderFinancialInfo(property)}
        ${renderSustainability(property)}
        ${renderSimilarProperties(property)}
        ${renderRecentlyViewed()}
        ${renderScheduleTour()}
        ${renderShareProperty(property)}
        ${renderSaveProperty(property)}
        ${renderCompareProperties(property)}
    `;
    
    contentDiv.innerHTML = html;
}

// Render expanded agent details
function renderAgentExtendedDetails(property) {
    const detailsDiv = document.getElementById('agent-extended-details');
    if (!detailsDiv) return;
    
    detailsDiv.innerHTML = renderExpandedAgent(property);
}

// Helper functions for sharing
function shareOnFacebook(url, title) {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank', 'width=600,height=400');
}

function shareOnX(url, title) {
    window.open(`https://x.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`, '_blank', 'width=600,height=400');
}

function shareOnLinkedIn(url, title) {
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`, '_blank', 'width=600,height=400');
}

function shareOnWhatsApp(url, title) {
    window.open(`https://wa.me/?text=${encodeURIComponent(title + ' ' + url)}`, '_blank');
}

function shareViaEmail(email, title) {
    window.location.href = `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(window.location.href)}`;
}

function copyShareLink(url) {
    navigator.clipboard.writeText(url).then(() => {
        alert('Link copied to clipboard!');
    });
}

function printProperty() {
    window.print();
}

// Save/unsave property
function toggleSaveProperty(propertyId) {
    let saved = JSON.parse(localStorage.getItem('savedProperties')) || [];
    const btn = document.getElementById('save-property-btn');
    const txt = document.getElementById('save-text');
    
    if (saved.includes(propertyId)) {
        saved = saved.filter(id => id !== propertyId);
        btn.classList.remove('active');
        txt.textContent = 'Save Property';
    } else {
        saved.push(propertyId);
        btn.classList.add('active');
        txt.textContent = 'Saved';
    }
    
    localStorage.setItem('savedProperties', JSON.stringify(saved));
}

// Schedule tour
function scheduleTour() {
    const date = document.getElementById('tour-date').value;
    const time = document.getElementById('tour-time').value;
    
    if (!date || !time) {
        alert('Please select a date and time');
        return;
    }
    
    alert(`Tour scheduled for ${date} at ${time}. You will receive a confirmation email shortly.`);
}

// Open property comparison
function openPropertyComparison(propertyId) {
    localStorage.setItem('comparisonBase', propertyId);
    alert('Comparison mode activated. You can now select properties to compare.');
}

// Track recently viewed
function trackRecentlyViewed(propertyId) {
    let recent = JSON.parse(localStorage.getItem('recentlyViewed')) || [];
    recent = recent.filter(id => id !== propertyId);
    recent.push(propertyId);
    localStorage.setItem('recentlyViewed', JSON.stringify(recent.slice(-20)));
}

document.addEventListener('DOMContentLoaded', () => {
    if (document.body.classList.contains('property-details-page')) {
        return;
    }

    if (document.getElementById('listing-grid')) {
        initPropertyListingPage();
    }

    if (document.getElementById('property-gallery') && !window.__propertyDetailsPageInit) {
        initPropertyDetailsPage();
    }
});
