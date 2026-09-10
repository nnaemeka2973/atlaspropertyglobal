(() => {
  const grid = document.getElementById("propertiesGrid");
  if (!grid || grid.dataset.landingPropertiesRendered === "true") return;

  const allProperties = Array.isArray(window.properties) ? window.properties : [];
  const normalize = value => String(value || "").trim().toLowerCase().replace(/[-\s]+/g, "_");
  const isForSale = p => [p.status, p.listingStatus, p.listing_status].some(v => {
    const s = normalize(v);
    return s === "for_sale" || s === "forsale";
  });

  const escape = value => String(value ?? "").replace(/[&<>\"']/g, ch => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[ch]));

  const price = value => value == null ? "Price unavailable" : `$${Number(value).toLocaleString()}`;
  const slug = p => String(p.id || p.property_id || p.address || "property").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase();
  const photo = p => {
    const value = p.primaryPhoto || p.primary_photo?.href || p.image || p.photos?.[0] || "";
    return String(value)
      .replace(/([_-])s\.(?:jpg|jpeg|png|webp)$/i, "$1l$2")
      .replace(/([_-])m\.(?:jpg|jpeg|png|webp)$/i, "$1l$2");
  };

  const featuredProperties = allProperties.filter(isForSale).slice(0, 6);

  grid.innerHTML = featuredProperties.map((property, index) => {
    const title = property.title || property.address || "Property";
    const cityState = [property.city, property.state].filter(Boolean).join(", ");
    const zip = property.zipCode || property.zip || "";
    const type = property.propertyType || property.type || "Residential";
    const beds = property.bedrooms ?? property.beds ?? "—";
    const baths = property.bathrooms ?? property.baths ?? "—";
    const sqft = property.sqft ? `${Number(property.sqft).toLocaleString()} sqft` : "Sqft unavailable";
    const image = photo(property);
    const propertySlug = slug(property);
    const href = `property-details.html?slug=${encodeURIComponent(propertySlug)}`;
    const status = property.status || "For Sale";
    const priceText = escape(price(property.price ?? property.list_price));
    const photoCount = Array.isArray(property.photos) ? property.photos.length : (image ? 1 : 0);

    const propertyId = propertySlug || `property-${Math.random().toString(36).substr(2, 9)}`;
    const isSaved = typeof isPropertySaved !== 'undefined' && isPropertySaved(propertyId);
    
    return `<article class="property-card${index ? ' reveal' : ''}"${index ? ` style="transition-delay: ${Math.min(index * 0.1, 0.5)}s;"` : ''}>
      <a class="card-image" href="${href}" aria-label="View ${escape(title)}">
        ${image ? `<img src="${escape(image)}" alt="${escape(title)}" loading="${index < 3 ? 'eager' : 'lazy'}" decoding="async"${index === 0 ? ' fetchpriority="high"' : ''}>` : `<div class="no-photo">No photo supplied</div>`}
        <span class="status-badge">${escape(status)}</span>
        <button class="card-icon favorite-btn${isSaved ? ' saved' : ''}" type="button" aria-label="Save property" data-property-id="${propertyId}"><span>${isSaved ? '♥' : '♡'}</span></button>
        <span class="photo-count"><i class="fas fa-camera"></i> ${photoCount}</span>
      </a>
      <div class="card-body">
        <div class="card-topline"><div class="price">${priceText}</div><span class="property-type-pill">${escape(type)}</span></div>
        <h2><a href="${href}">${escape(title)}</a></h2>
        <p class="location">${escape(cityState)}${zip ? ` ${escape(zip)}` : ""}</p>
        <div class="stats" aria-label="Property details">
          <span><strong>${escape(String(beds))}</strong> beds</span>
          <span><strong>${escape(String(baths))}</strong> baths</span>
          <span><strong>${escape(sqft)}</strong></span>
        </div>
        <a class="details-btn" href="${href}">View property <span aria-hidden="true">→</span></a>
      </div>
    </article>`;
  }).join("");

  grid.dataset.landingPropertiesRendered = "true";

  if (window.revealOnScroll) window.revealOnScroll();
})();
