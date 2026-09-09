(() => {
  const grid = document.getElementById("propertyGrid");
  const searchInput = document.getElementById("searchInput");
  const typeFilter = document.getElementById("typeFilter");
  const statusFilter = document.getElementById("statusFilter");
  const locationFilter = document.getElementById("locationFilter");
  const minPrice = document.getElementById("minPrice");
  const maxPrice = document.getElementById("maxPrice");
  const minSqft = document.getElementById("minSqft");
  const maxSqft = document.getElementById("maxSqft");
  const sortFilter = document.getElementById("sortFilter");
  const pageRange = document.getElementById("pageRange");
  const pagination = document.getElementById("pagination");
  const emptyState = document.getElementById("emptyState");
  const clearFilters = document.getElementById("clearFilters");
  const applyFilters = document.getElementById("applyFilters");
  const allProperties = Array.isArray(window.properties) ? window.properties : [];
  const PAGE_SIZE = 20;
  let currentPage = 1;

  const unique = values => [...new Set(values.filter(Boolean).map(String))].sort((a,b) => a.localeCompare(b));
  const normalize = value => String(value || "").trim().toLowerCase().replace(/[-\s]+/g, "_");
  const isForSale = p => [p.status, p.listingStatus, p.listing_status].some(v => normalize(v) === "for_sale" || normalize(v) === "for_sale_" || normalize(v) === "forsale");

  unique(allProperties.map(p => p.propertyType || p.type)).forEach(v => typeFilter.add(new Option(v, v)));
  unique(allProperties.map(p => p.status)).forEach(v => statusFilter.add(new Option(v, v)));
  unique(allProperties.flatMap(p => [p.city, p.state, p.stateCode].filter(Boolean))).forEach(v => locationFilter.add(new Option(v, v)));

  // Start the portfolio on For Sale listings by default.
  const saleOption = [...statusFilter.options].find(o => normalize(o.value) === "for_sale");
  if (saleOption) statusFilter.value = saleOption.value;

  const photo = p => {
    const value = p.primaryPhoto || p.primary_photo?.href || p.image || p.photos?.[0] || "";
    return String(value)
      .replace(/([_-])s(\.(?:jpg|jpeg|png|webp))$/i, "$1l$2")
      .replace(/([_-])m(\.(?:jpg|jpeg|png|webp))$/i, "$1l$2");
  };

  const card = p => {
    const propertySlug = createPropertySlug(p);
    const href = `property-details.html?slug=${encodeURIComponent(propertySlug)}`;
    const image = photo(p);
    const title = p.address || p.title || "Property";
    const cityState = [p.city, p.state].filter(Boolean).join(", ");
    const zip = p.zipCode || p.zip || "";
    const type = p.propertyType || p.type || "Residential";
    const price = formatPropertyPrice(p.price ?? p.list_price);
    const status = p.status || "For Sale";
    const sqft = p.sqft ? `${Number(p.sqft).toLocaleString()} sqft` : "Sqft unavailable";
    const beds = p.bedrooms ?? p.beds ?? "—";
    const baths = p.bathrooms ?? p.baths ?? "—";
    const photoCount = Array.isArray(p.photos) ? p.photos.length : (image ? 1 : 0);
    const propertyId = propertySlug || `property-${Math.random().toString(36).substr(2, 9)}`;
    const isSaved = typeof isPropertySaved !== 'undefined' && isPropertySaved(propertyId);
    
    return `<article class="property-card">
      <a class="card-image" href="${href}" aria-label="View ${escapeHtml(title)}">
        ${image ? `<img src="${escapeHtml(image)}" alt="${escapeHtml(title)}" loading="lazy" decoding="async" fetchpriority="low">` : `<div class="no-photo">No photo supplied</div>`}
        <span class="status-badge">${escapeHtml(status)}</span>
        <button class="card-icon favorite-btn${isSaved ? ' saved' : ''}" type="button" aria-label="Save property" data-property-id="${propertyId}"><span>${isSaved ? '♥' : '♡'}</span></button>
        <span class="photo-count"><i class="fas fa-camera"></i> ${photoCount}</span>
      </a>
      <div class="card-body">
        <div class="card-topline"><div class="price">${escapeHtml(price)}</div><span class="property-type-pill">${escapeHtml(type)}</span></div>
        <h2><a href="${href}">${escapeHtml(title)}</a></h2>
        <p class="location">${escapeHtml(cityState)}${zip ? ` ${escapeHtml(zip)}` : ""}</p>
        <div class="stats" aria-label="Property details">
          <span><strong>${escapeHtml(String(beds))}</strong> beds</span>
          <span><strong>${escapeHtml(String(baths))}</strong> baths</span>
          <span><strong>${escapeHtml(String(sqft))}</strong></span>
        </div>
        <a class="details-btn" href="${href}">View property <span aria-hidden="true">→</span></a>
      </div>
    </article>`;
  };

  const getNumber = el => el && el.value !== "" ? Number(el.value) : null;
  const selected = { beds: "", baths: "" };

  function matches(p) {
    const q = searchInput.value.trim().toLowerCase();
    const hay = [p.title,p.address,p.city,p.state,p.zipCode,p.propertyType,p.type,p.status,p.agent?.name,p.agent?.office]
      .filter(Boolean).join(" ").toLowerCase();
    const price = Number(p.price ?? p.list_price ?? 0);
    const sqft = Number(p.sqft ?? p.areaValue ?? 0);
    const beds = Number(p.bedrooms ?? p.beds ?? 0);
    const baths = Number(p.bathrooms ?? p.baths ?? 0);
    const type = String(p.propertyType || p.type || "");
    const status = String(p.status || "");
    const location = String(p.city || p.state || p.stateCode || "");
    return (!q || hay.includes(q))
      && (!typeFilter.value || type === typeFilter.value)
      && (!statusFilter.value || status === statusFilter.value)
      && (!locationFilter.value || location === locationFilter.value)
      && (getNumber(minPrice) === null || price >= getNumber(minPrice))
      && (getNumber(maxPrice) === null || price <= getNumber(maxPrice))
      && (!selected.beds || beds >= Number(selected.beds))
      && (!selected.baths || baths >= Number(selected.baths))
      && (getNumber(minSqft) === null || sqft >= getNumber(minSqft))
      && (getNumber(maxSqft) === null || sqft <= getNumber(maxSqft));
  }

  function paginate(list) {
    const totalPages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
    currentPage = Math.min(currentPage, totalPages);
    const start = (currentPage - 1) * PAGE_SIZE;
    return { items: list.slice(start, start + PAGE_SIZE), totalPages, start, end: Math.min(start + PAGE_SIZE, list.length) };
  }

  function renderPagination(totalPages) {
    if (!pagination) return;
    if (totalPages <= 1) { pagination.innerHTML = ""; return; }
    const pages = [];
    const maxVisible = 7;
    let start = Math.max(1, currentPage - 3);
    let end = Math.min(totalPages, start + maxVisible - 1);
    if (end - start + 1 < maxVisible) start = Math.max(1, end - maxVisible + 1);
    if (currentPage > 1) pages.push(`<button type="button" class="pagination-btn pagination-prev" data-page="${currentPage-1}" aria-label="Previous page">‹</button>`);
    for (let i = start; i <= end; i++) pages.push(`<button type="button" class="pagination-btn ${i===currentPage?'active':''}" data-page="${i}" aria-current="${i===currentPage?'page':'false'}">${i}</button>`);
    if (currentPage < totalPages) pages.push(`<button type="button" class="pagination-btn pagination-next" data-page="${currentPage+1}" aria-label="Next page">›</button>`);
    pagination.innerHTML = pages.join("");
    pagination.querySelectorAll("[data-page]").forEach(btn => btn.addEventListener("click", () => {
      currentPage = Number(btn.dataset.page);
      render();
      document.querySelector(".property-results")?.scrollIntoView({behavior:"smooth", block:"start"});
    }));
  }

  function render() {
    let list = allProperties.filter(matches);
    if (sortFilter.value === "newest") list.sort((a,b) => new Date(b.list_date || b.created_at || 0) - new Date(a.list_date || a.created_at || 0));
    if (sortFilter.value === "price-low") list.sort((a,b) => Number(a.price ?? a.list_price ?? Infinity) - Number(b.price ?? b.list_price ?? Infinity));
    if (sortFilter.value === "price-high") list.sort((a,b) => Number(b.price ?? b.list_price ?? 0) - Number(a.price ?? a.list_price ?? 0));
    if (sortFilter.value === "sqft-high") list.sort((a,b) => Number(b.sqft ?? 0) - Number(a.sqft ?? 0));

    const page = paginate(list);
    pageRange.textContent = list.length ? `Showing ${page.start + 1}–${page.end}` : "";
    grid.innerHTML = page.items.map(card).join("");
    emptyState.classList.toggle("hidden", list.length !== 0);
    renderPagination(page.totalPages);
  }

  document.querySelectorAll(".choice-grid").forEach(group => {
    const key = group.dataset.filterGroup;
    group.querySelectorAll("button").forEach(btn => btn.addEventListener("click", () => {
      group.querySelectorAll("button").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      selected[key] = btn.dataset.value || "";
      currentPage = 1;
      render();
    }));
    group.querySelector("button[data-value='']")?.classList.add("active");
  });

  [searchInput,typeFilter,statusFilter,locationFilter,minPrice,maxPrice,minSqft,maxSqft,sortFilter].forEach(el => el.addEventListener("input", () => { currentPage = 1; render(); }));
  applyFilters.addEventListener("click", () => { currentPage = 1; render(); });
  clearFilters.addEventListener("click", () => {
    searchInput.value = ""; typeFilter.value = ""; locationFilter.value = ""; minPrice.value = ""; maxPrice.value = ""; minSqft.value = ""; maxSqft.value = ""; sortFilter.value = "default";
    // Return to the requested default: For Sale.
    const sale = [...statusFilter.options].find(o => normalize(o.value) === "for_sale");
    statusFilter.value = sale ? sale.value : "";
    selected.beds = ""; selected.baths = "";
    document.querySelectorAll(".choice-grid").forEach(g => { g.querySelectorAll("button").forEach(b => b.classList.remove("active")); g.querySelector("button[data-value='']")?.classList.add("active"); });
    currentPage = 1;
    render();
  });


  // Mobile hero search mirrors the desktop search field.
  const mobileSearchInput = document.getElementById("mobileSearchInput");
  const mobileFilterToggle = document.getElementById("mobileFilterToggle");
  const mobileFilterClose = document.getElementById("mobileFilterClose");
  const propertyFilterSidebar = document.getElementById("propertyFilterSidebar");
  const mobilePropertySearch = document.getElementById("mobilePropertySearch");
  const heroSection = document.querySelector(".properties-hero");
  const filterScrollArea = document.getElementById("filterScrollArea");
  const filterScrollDown = document.getElementById("filterScrollDown");
  const filterScrollUp = document.getElementById("filterScrollUp");
  const filterScrollGuide = document.querySelector(".filter-scroll-guide");

  const syncMobileFilterGuide = () => {
    if (!filterScrollGuide) return;
    if (window.innerWidth <= 820) {
      filterScrollGuide.style.margin = "0 0 10px";
      filterScrollGuide.style.padding = "8px 10px";
      filterScrollGuide.style.borderRadius = "10px";
      filterScrollGuide.style.border = "1px solid #e5e9ee";
      filterScrollGuide.style.background = "linear-gradient(180deg, #f8fafc, #fff)";
    } else {
      filterScrollGuide.style.margin = "";
      filterScrollGuide.style.padding = "";
      filterScrollGuide.style.borderRadius = "";
      filterScrollGuide.style.border = "";
      filterScrollGuide.style.background = "";
    }
  };

  if (mobileSearchInput) {
    mobileSearchInput.addEventListener("input", () => {
      searchInput.value = mobileSearchInput.value;
      currentPage = 1;
      render();
    });
  }

  const closeMobileFilters = () => {
    if (!propertyFilterSidebar) return;
    propertyFilterSidebar.classList.remove("mobile-open");
    mobileFilterToggle?.setAttribute("aria-expanded", "false");
    document.body.style.overflow = "";
  };

  if (mobileFilterToggle && propertyFilterSidebar) {
    mobileFilterToggle.addEventListener("click", (event) => {
      event.stopPropagation();
      const open = propertyFilterSidebar.classList.toggle("mobile-open");
      mobileFilterToggle.setAttribute("aria-expanded", String(open));
      document.body.style.overflow = open ? "hidden" : "";
    });

    mobileFilterClose?.addEventListener("click", () => {
      closeMobileFilters();
    });

    // Tap/click anywhere outside the filter panel to close it.
    document.addEventListener("click", (event) => {
      if (window.innerWidth > 820 || !propertyFilterSidebar.classList.contains("mobile-open")) return;
      if (!propertyFilterSidebar.contains(event.target) && !mobileFilterToggle.contains(event.target)) {
        closeMobileFilters();
      }
    });
  }

  // Close the mobile filter when a filter is applied.
  applyFilters.addEventListener("click", () => {
    if (window.innerWidth <= 820 && propertyFilterSidebar) {
      closeMobileFilters();
    }
  });

  // Hide the scrollbar but provide deliberate, polished up/down controls.
  if (filterScrollArea) {
    filterScrollDown?.addEventListener("click", () => {
      filterScrollArea.scrollBy({top: Math.max(260, filterScrollArea.clientHeight * .72), behavior:"smooth"});
    });
    filterScrollUp?.addEventListener("click", () => {
      filterScrollArea.scrollBy({top: -Math.max(260, filterScrollArea.clientHeight * .72), behavior:"smooth"});
    });
  }

  // Keep the mobile search visually in the hero at the top, then pin it to the viewport
  // once the hero has passed so it remains accessible while browsing.
  if (mobilePropertySearch && heroSection) {
    const updateMobileSearch = () => {
      if (window.innerWidth > 820) {
        mobilePropertySearch.classList.remove("is-sticky");
        return;
      }
      const threshold = heroSection.getBoundingClientRect().bottom;
      mobilePropertySearch.classList.toggle("is-sticky", threshold < 70);
    };
    window.addEventListener("scroll", updateMobileSearch, {passive:true});
    window.addEventListener("resize", () => {
      updateMobileSearch();
      syncMobileFilterGuide();
    });
    updateMobileSearch();
  }

  syncMobileFilterGuide();

  // Keep desktop filter sidebar aligned with the listing header after resizing.
  const syncSidebarState = () => {
    if (window.innerWidth > 820 && propertyFilterSidebar) {
      propertyFilterSidebar.classList.remove("mobile-open");
      document.body.style.overflow = "";
    }
  };
  window.addEventListener("resize", syncSidebarState);

  render();
})();