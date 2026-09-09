function normalizePhotoUrl(photo) {
  if (!photo) return '';

  if (typeof photo === 'string') return photo.trim();
  if (typeof photo === 'object') {
    const value = photo.href || photo.url || photo.src;
    return typeof value === 'string' ? value.trim() : '';
  }

  return '';
}

function normalizePropertyPhotos(property) {
  const photoSources = [
    Array.isArray(property?.photos) ? property.photos : [],
    Array.isArray(property?.images) ? property.images : [],
    Array.isArray(property?.gallery) ? property.gallery : [],
    property?.primary_photo ? [property.primary_photo] : [],
    property?.image ? [property.image] : []
  ].flat();

  const normalized = photoSources
    .map((photo) => normalizePhotoUrl(photo))
    .filter(Boolean);

  return [...new Set(normalized)];
}

function getHardcodedSimilarHomes() {
  return [];
}

function extractPropertyPayload(payload) {
  if (!payload || typeof payload !== 'object') return null;

  if (Array.isArray(payload)) return payload[0] || null;

  const candidates = [
    payload?.home,
    payload?.property,
    payload?.result,
    payload?.data?.home,
    payload?.data?.property,
    payload?.data?.result,
    payload?.data?.home_search?.results?.[0],
    payload?.data?.results?.[0],
    payload?.home_search?.results?.[0],
    payload?.results?.[0],
    payload?.data
  ];

  for (const candidate of candidates) {
    if (candidate && typeof candidate === 'object') {
      const hasIdentity = candidate.id || candidate.property_id || candidate.listing_id || candidate.providerPropertyId || candidate.address || candidate.city;
      if (hasIdentity) return candidate;
    }
  }

  return payload?.data || payload || null;
}

async function fetchPropertyById(propertyId) {
  const id = encodeURIComponent(String(propertyId || ''));
  const response = await fetch(`http://localhost:5000/api/properties/${id}`);
  const payload = await response.json().catch(() => ({}));

  if (!response.ok && !payload?.success && !payload?.data && !payload?.home && !payload?.property && !payload?.result) {
    throw new Error(payload?.message || 'Unable to load property details.');
  }

  const property = extractPropertyPayload(payload);
  if (property) {
    return property;
  }

  if (payload?.data && Array.isArray(payload.data) && payload.data.length) {
    return payload.data[0];
  }

  return null;
}

function extractPhotoPayload(payload) {
  const candidates = [
    payload?.data,
    payload?.photos,
    payload?.images,
    payload?.gallery,
    payload?.data?.photos,
    payload?.data?.images,
    payload?.data?.gallery,
    payload?.data?.home?.photos,
    payload?.data?.property?.photos,
    payload?.data?.home_search?.results?.[0]?.photos,
    payload?.data?.home_search?.results?.[0]?.images,
    payload?.home_search?.results?.[0]?.photos,
    payload?.home_search?.results?.[0]?.images
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate;
  }

  return [];
}

async function fetchPropertyPhotos(propertyId) {
  const id = encodeURIComponent(String(propertyId || ''));
  const response = await fetch(`http://localhost:5000/api/properties/${id}/photos`);
  const payload = await response.json().catch(() => ({}));

  if (!response.ok && !payload?.success && !payload?.data && !payload?.photos && !payload?.images && !payload?.gallery) {
    throw new Error(payload?.message || 'Unable to load property photos.');
  }

  return extractPhotoPayload(payload);
}

async function fetchSimilarHomes(propertyId) {
  const id = encodeURIComponent(String(propertyId || ''));
  const response = await fetch(`http://localhost:5000/api/properties/${id}/similar`);
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    return [];
  }

  if (payload && payload.success === false && payload.supported === false) {
    return [];
  }

  return Array.isArray(payload?.results)
    ? payload.results
    : Array.isArray(payload?.data?.results)
      ? payload.data.results
      : Array.isArray(payload?.data?.home?.related_homes?.results)
        ? payload.data.home.related_homes.results
        : [];
}

function initPropertyDetailScrollReveal() {
  if (typeof window !== 'undefined' && typeof window.initScrollReveal === 'function' && window.initScrollReveal !== initPropertyDetailScrollReveal) {
    window.initScrollReveal();
  }
}

function initPropertyDetailInteractions() {
  if (typeof window !== 'undefined' && typeof window.initPropertyInteractions === 'function' && window.initPropertyInteractions !== initPropertyDetailInteractions) {
    window.initPropertyInteractions();
  }
}

function initMortgageCalculator() {}
function initMobileContactBar() {}

function formatPrice(value) {
  const numeric = Number(value || 0);
  if (!Number.isFinite(numeric)) return 'Price unavailable';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  }).format(numeric);
}

function normalizePropertyRecordId(property) {
  if (!property || typeof property !== 'object') return '';
  return String(property.id || property.property_id || property.listing_id || property.listingId || '').trim();
}

function extractPropertySummary(property) {
  if (!property) return 'Luxury home for sale.';
  if (typeof property.description === 'string' && property.description.trim()) return property.description.trim();
  if (property.description?.summary) return property.description.summary;
  if (property.summary) return property.summary;
  return 'Luxury home for sale.';
}

function extractPropertyDescription(property) {
  if (!property) return 'Description unavailable.';
  if (typeof property.description === 'string' && property.description.trim()) return property.description.trim();
  if (property.description?.text) return property.description.text;
  if (property.description?.summary) return property.description.summary;

  const beds = property.beds ?? property.description?.beds ?? 0;
  const baths = property.baths ?? property.description?.baths ?? 0;
  const sqft = property.sqft ?? property.description?.sqft ?? 0;
  const type = property.description?.type || property.propertyType || property.type || 'home';
  const city = property.location?.address?.city || property.city || 'the area';

  if (beds || baths || sqft || type || city) {
    return `${type.charAt(0).toUpperCase() + type.slice(1)} in ${city} featuring ${beds || 0} bedrooms, ${baths || 0} bathrooms, and ${sqft ? `${Number(sqft).toLocaleString()} square feet` : 'spacious living areas'}.`;
  }

  return 'Description unavailable.';
}

function extractPropertyFeatures(property) {
  const rawFeatures = [];

  if (Array.isArray(property?.description?.features)) rawFeatures.push(...property.description.features);
  if (Array.isArray(property?.features)) rawFeatures.push(...property.features);
  if (Array.isArray(property?.amenities)) rawFeatures.push(...property.amenities);
  if (Array.isArray(property?.description?.amenities)) rawFeatures.push(...property.description.amenities);
  if (Array.isArray(property?.raw?.details)) {
    property.raw.details.forEach((detail) => {
      if (Array.isArray(detail?.text)) rawFeatures.push(...detail.text);
    });
  }

  const cleaned = [...new Set(rawFeatures.filter(Boolean).map((feature) => String(feature).trim()))];
  return cleaned.length ? cleaned.slice(0, 12) : ['Waterfront living', 'Private outdoor spaces', 'Luxury finishes'];
}

function extractPropertyAmenities(property) {
  const amenities = [];
  if (Array.isArray(property?.amenities)) amenities.push(...property.amenities);
  if (Array.isArray(property?.description?.amenities)) amenities.push(...property.description.amenities);
  if (Array.isArray(property?.features)) amenities.push(...property.features);

  const unique = [...new Set(amenities.filter(Boolean).map((item) => String(item).trim()))];
  return unique.length ? unique.slice(0, 12) : ['Private outdoor area', 'Smart home', 'Luxury finishes'];
}

function renderList(containerId, items, emptyLabel = 'No information available.') {
  const container = document.getElementById(containerId);
  if (!container) return;

  const list = Array.isArray(items) && items.length ? items : [emptyLabel];
  container.innerHTML = list.map((item) => `
    <div class="property-highlight-card">
      <i class="fas fa-check"></i>
      <span>${item}</span>
    </div>
  `).join('');
}

function renderLoadingState() {
  const titleEl = document.getElementById('property-title');
  const locationEl = document.getElementById('property-location');
  const priceEl = document.getElementById('property-price');
  const summaryEl = document.getElementById('property-summary');
  const descriptionEl = document.getElementById('property-description');
  const galleryEl = document.getElementById('property-gallery');
  const statsEl = document.getElementById('detail-stats');
  const agentEl = document.getElementById('agent-name');

  if (titleEl) titleEl.textContent = 'Loading property...';
  if (locationEl) locationEl.innerHTML = '<i class="fas fa-map-marker-alt"></i> Loading address...';
  if (priceEl) priceEl.textContent = 'Loading...';
  if (summaryEl) summaryEl.textContent = 'Loading details...';
  if (descriptionEl) descriptionEl.textContent = 'Loading description...';
  if (galleryEl) galleryEl.innerHTML = '<div class="property-card"><div class="property-info"><h3>Loading gallery...</h3></div></div>';
  if (statsEl) statsEl.innerHTML = '<div class="property-highlight-card">Loading details...</div>';
  if (agentEl) agentEl.textContent = 'Loading agent...';
}

function renderErrorState(message) {
  const titleEl = document.getElementById('property-title');
  const descriptionEl = document.getElementById('property-description');
  const galleryEl = document.getElementById('property-gallery');

  if (titleEl) titleEl.textContent = 'Property unavailable';
  if (descriptionEl) descriptionEl.textContent = message;
  if (galleryEl) galleryEl.innerHTML = '<div class="property-card"><div class="property-info"><h3>Unable to load property content.</h3></div></div>';
}

function renderSimilarPropertiesSection(similarHomes) {
  const list = document.getElementById('similar-properties-list');
  if (!list) return;

  const safeHomes = Array.isArray(similarHomes) ? similarHomes : [];
  const cards = safeHomes.slice(0, 3).map((home) => {
    const homeId = normalizePropertyRecordId(home) || home.property_id || home.id || '';
    const homeImage = normalizePropertyPhotos(home)[0] || '';
    return `
      <article class="property-similar-card">
        <img src="${homeImage}" alt="${home.title}">
        <div class="card-body">
          <h3>${home.title}</h3>
          <p>${formatPrice(home.list_price || home.price)}</p>
          <a href="property-details.html?id=${encodeURIComponent(homeId)}">View details</a>
        </div>
      </article>
    `;
  }).join('');

  list.innerHTML = cards || '<p class="property-empty-copy">No similar homes found.</p>';
}

async function renderPropertyDetails(property, photos, similarHomes) {
  const titleEl = document.getElementById('property-title');
  const statusEl = document.getElementById('property-status');
  const locationEl = document.getElementById('property-location');
  const priceEl = document.getElementById('property-price');
  const summaryEl = document.getElementById('property-summary');
  const descriptionEl = document.getElementById('property-description');
  const galleryEl = document.getElementById('property-gallery');
  const statsEl = document.getElementById('detail-stats');
  const featuresEl = document.getElementById('property-features');
  const agentEl = document.getElementById('agent-name');

  if (!property) {
    throw new Error('Property not found.');
  }

  const normalizedProperty = {
    ...property,
    id: normalizePropertyRecordId(property) || property.id || property.property_id || property.listing_id || property.listingId,
    property_id: property.property_id || property.id || property.listing_id || property.listingId,
    title: property.title || property.description?.name || property.location?.address?.line || 'Luxury Property',
    status: property.status || 'For Sale',
    list_price: property.list_price ?? property.price ?? property.price_value ?? property.priceValue ?? 0,
    price: property.price ?? property.list_price ?? property.price_value ?? property.priceValue ?? 0,
    beds: property.beds ?? property.description?.beds ?? 0,
    baths: property.baths ?? property.description?.baths ?? 0,
    sqft: property.sqft ?? property.description?.sqft ?? 0,
    year_built: property.year_built ?? property.description?.year_built ?? 'N/A',
    description: property.description ?? { text: extractPropertyDescription(property) }
  };

  const line = normalizedProperty.location?.address?.line || normalizedProperty.address || 'Location unavailable';
  const city = normalizedProperty.location?.address?.city || normalizedProperty.city || '';
  const stateCode = normalizedProperty.location?.address?.state_code || normalizedProperty.state || '';
  const postal = normalizedProperty.location?.address?.postal_code || normalizedProperty.zip || '';
  const locationText = [line, city ? `${city}, ${stateCode}` : stateCode, postal].filter(Boolean).join(', ');

  const normalizedImages = (Array.isArray(photos) && photos.length ? photos : normalizePropertyPhotos(normalizedProperty))
    .map((image) => normalizePhotoUrl(image))
    .filter(Boolean);
  const featureItems = extractPropertyFeatures(normalizedProperty);
  const amenityItems = extractPropertyAmenities(normalizedProperty);
  const descriptionText = extractPropertyDescription(normalizedProperty);

  if (titleEl) titleEl.textContent = normalizedProperty.title;
  if (statusEl) statusEl.textContent = String(normalizedProperty.status || 'For Sale').replace(/_/g, ' ');
  if (locationEl) locationEl.innerHTML = '<i class="fas fa-map-marker-alt"></i> ' + locationText;
  if (priceEl) priceEl.textContent = formatPrice(normalizedProperty.list_price || normalizedProperty.price);
  if (summaryEl) summaryEl.textContent = extractPropertySummary(normalizedProperty);
  if (descriptionEl) descriptionEl.textContent = descriptionText;
  document.title = `${normalizedProperty.title} | Atlas Property Group`;

  if (galleryEl) {
    if (!normalizedImages.length) {
      galleryEl.innerHTML = '<div class="info-block"><p class="property-empty-copy">No gallery images available for this property.</p></div>';
    } else {
      const mainImage = normalizedImages[0];
      galleryEl.innerHTML = `
        <div class="gallery-shell">
          <div class="gallery-stage-row">
            <div class="gallery-hero-card">
              <img class="gallery-hero-image" src="${mainImage}" alt="${normalizedProperty.title} photo 1" loading="eager" decoding="async" onerror="handleImageError(this)">
            </div>
            <div class="gallery-preview-grid">
              ${normalizedImages.slice(1, 4).map((image, index) => `
                <div class="gallery-preview-card" data-index="${index + 1}">
                  <img src="${image}" alt="${normalizedProperty.title} preview ${index + 1}" loading="lazy" decoding="async" onerror="handleImageError(this)">
                </div>
              `).join('')}
            </div>
          </div>
          <div class="gallery-thumbs">
            ${normalizedImages.map((image, index) => `
              <button type="button" class="gallery-thumb ${index === 0 ? 'active' : ''}" data-index="${index}" aria-label="Open photo ${index + 1}">
                <img src="${image}" alt="${normalizedProperty.title} thumbnail ${index + 1}" loading="lazy" decoding="async" onerror="handleImageError(this)">
              </button>
            `).join('')}
          </div>
        </div>
      `;
    }
  }

  const stats = [
    `${normalizedProperty.beds || 0} Beds`,
    `${normalizedProperty.baths || 0} Baths`,
    `${normalizedProperty.sqft || 0} Sqft`,
    `${normalizedProperty.description?.type || normalizedProperty.propertyType || normalizedProperty.type || 'Luxury'}`,
    `${normalizedProperty.year_built || 'N/A'} Built`,
    `${normalizedProperty.parking?.spaces || normalizedProperty.garage?.spaces || 0} Parking`
  ];

  if (statsEl) {
    statsEl.innerHTML = stats.map((stat) => `
      <div class="property-highlight-card">
        <i class="fas fa-home"></i>
        <span>${stat}</span>
      </div>
    `).join('');
  }

  if (featuresEl) {
    featuresEl.innerHTML = featureItems.map((feature) => `
      <div class="property-highlight-card">
        <i class="fas fa-check"></i>
        <span>${feature}</span>
      </div>
    `).join('');
  }

  renderList('amenities-indoor', amenityItems.slice(0, 4));
  renderList('amenities-outdoor', amenityItems.slice(4, 8));
  renderList('amenities-community', amenityItems.slice(8, 10));
  renderList('amenities-luxury', amenityItems.slice(10));

  if (agentEl) {
    const advertiser = Array.isArray(normalizedProperty.consumer_advertisers) && normalizedProperty.consumer_advertisers.length
      ? normalizedProperty.consumer_advertisers[0]
      : { name: 'Atlas Property Group' };
    agentEl.textContent = advertiser.name || 'Atlas Property Group';
  }

  if (Array.isArray(similarHomes) && similarHomes.length > 0) {
    renderSimilarPropertiesSection(similarHomes);
  }
}

async function initPropertyDetailsPage() {
  if (window.__propertyDetailsPageInit) {
    return;
  }
  window.__propertyDetailsPageInit = true;

  initPropertyDetailScrollReveal();
  initPropertyDetailInteractions();

  const id = new URLSearchParams(window.location.search).get('id');
  renderLoadingState();
  initMortgageCalculator(null);

  try {
    const property = await fetchPropertyById(id || '');
    const photos = await fetchPropertyPhotos(id || '');
    const similarHomes = await fetchSimilarHomes(id || '');

    await renderPropertyDetails(property, photos, similarHomes);
  } catch (error) {
    console.error('Property details render failed:', error);
    renderErrorState(error.message || 'Unable to load property details.');
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    if (!window.__propertyDetailsPageInit) {
      initPropertyDetailsPage();
    }
  });
} else if (!window.__propertyDetailsPageInit) {
  initPropertyDetailsPage();
}
