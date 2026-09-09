const PROPERTY_FALLBACK_IMAGE = 'assets/images/no-image.jpg';
const PREFERRED_IMAGE_SUFFIX = 'o.jpg';

function escapeText(value) {
    if (value === null || value === undefined) return '';
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function getHighQualityImage(url) {
    if (!url || typeof url !== 'string') return PROPERTY_FALLBACK_IMAGE;

    const normalizedUrl = url.trim();
    if (!normalizedUrl) return PROPERTY_FALLBACK_IMAGE;

    return normalizedUrl.replace(/s\.jpg$/i, PREFERRED_IMAGE_SUFFIX);
}

function getPropertyImage(property) {
    const directCandidates = [
        property?.primary_photo?.href,
        property?.primary_photo?.url,
        property?.photos?.[0]?.href,
        property?.photos?.[0]?.url,
        property?.image,
        property?.photo?.href,
        property?.photo?.url,
        property?.photo
    ];

    for (const candidate of directCandidates) {
        if (typeof candidate === 'string' && candidate.trim()) {
            return getHighQualityImage(candidate);
        }

        if (candidate && typeof candidate === 'object') {
            const nested = candidate.href || candidate.url || candidate.src;
            if (typeof nested === 'string' && nested.trim()) {
                return getHighQualityImage(nested);
            }
        }
    }

    if (Array.isArray(property?.photos)) {
        const photoString = property.photos.find((photo) => typeof photo === 'string');
        if (typeof photoString === 'string' && photoString.trim()) {
            return getHighQualityImage(photoString);
        }

        const photoObject = property.photos.find((photo) => photo && typeof photo === 'object' && (photo.href || photo.url || photo.src));
        if (photoObject) {
            return getHighQualityImage(photoObject.href || photoObject.url || photoObject.src);
        }
    }

    return PROPERTY_FALLBACK_IMAGE;
}

function handleImageError(image) {
    if (!image || image.src.endsWith(PROPERTY_FALLBACK_IMAGE)) return;

    image.onerror = null;
    image.src = PROPERTY_FALLBACK_IMAGE;
}

document.addEventListener('error', event => {
    if (event.target instanceof HTMLImageElement) {
        handleImageError(event.target);
    }
}, true);

function formatPrice(value) {
    if (value === null || value === undefined || value === '') return 'Price unavailable';

    const numericValue = Number(value);
    if (Number.isNaN(numericValue)) return value;

    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0
    }).format(numericValue);
}

function formatAddress(address, city, state, postalCode) {
    const parts = [address, city, state, postalCode].filter(Boolean);
    return parts.join(', ') || 'Address unavailable';
}

function formatBeds(value) {
    return value ? `${value} Beds` : 'Beds unavailable';
}

function formatBaths(value) {
    return value ? `${value} Baths` : 'Baths unavailable';
}

function formatSqft(value) {
    if (value === null || value === undefined || value === '') return 'Sqft unavailable';

    const numericValue = Number(value);
    if (Number.isNaN(numericValue)) return value;

    return `${numericValue.toLocaleString()} sqft`;
}

function getPropertyId(property) {
    if (!property || typeof property !== 'object') return '';

    return property.property_id || property.id || property.listing_id || property.listingId || '';
}
