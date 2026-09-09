/**
 * Atlas Property Group - Filtering Compatibility Layer
 * Reuses the shared properties.js data source.
 */

function initLegacyFilterSupport() {
    if (!window.propertiesApp) return;

    const { getFilteredProperties, sortProperties, paginateProperties, createPropertyCardMarkup, PROPERTY_PAGE_SIZE } = window.propertiesApp;
    const form = document.getElementById('property-filter-form');
    const grid = document.getElementById('listing-grid');
    const pagination = document.getElementById('pagination');
    const resultsCount = document.getElementById('results-count');
    const sortSelect = document.querySelector('.sort-select');

    if (!form || !grid) return;

    const state = { page: 1, filters: {}, sort: 'default' };

    const render = () => {
        const filtered = getFilteredProperties(state.filters);
        const sorted = sortProperties(filtered, state.sort);
        const paged = paginateProperties(sorted, state.page, PROPERTY_PAGE_SIZE);

        if (resultsCount) {
            resultsCount.textContent = `Showing ${paged.items.length ? (state.page - 1) * PROPERTY_PAGE_SIZE + 1 : 0}–${Math.min(state.page * PROPERTY_PAGE_SIZE, filtered.length)} of ${filtered.length} results`;
        }

        if (!paged.items.length) {
            grid.innerHTML = '<div class="property-card reveal active"><div class="property-info"><h3>No properties found</h3><p class="property-location">Try adjusting your filters and search criteria.</p></div></div>';
            pagination.innerHTML = '';
            return;
        }

        grid.innerHTML = paged.items.map((property) => createPropertyCardMarkup(property)).join('');

        const pageLinks = [];
        for (let page = 1; page <= paged.totalPages; page += 1) {
            pageLinks.push(`<a href="#" class="page-link ${page === paged.page ? 'active' : ''}" data-page="${page}">${page}</a>`);
        }
        if (pagination) pagination.innerHTML = pageLinks.join('');
    };

    form.addEventListener('submit', (event) => {
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

    form.addEventListener('reset', () => {
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

    const mobileSearchForm = document.getElementById('mobile-search-form');
    const mobileKeywordInput = document.getElementById('mobile-search-keyword');
    const mobileFilterToggle = document.querySelector('.mobile-filter-toggle');
    const mobileFilterClose = document.querySelector('.mobile-filter-close');
    const filterSidebar = document.querySelector('.filter-sidebar');
    const overlay = document.getElementById('mobile-filter-overlay');

    const closeMobileFilters = () => {
        filterSidebar?.classList.remove('open');
        overlay?.classList.remove('active');
        mobileFilterToggle?.setAttribute('aria-expanded', 'false');
        document.body.classList.remove('mobile-filter-open');
    };

    const openMobileFilters = () => {
        filterSidebar?.classList.add('open');
        overlay?.classList.add('active');
        mobileFilterToggle?.setAttribute('aria-expanded', 'true');
        document.body.classList.add('mobile-filter-open');
    };

    mobileFilterToggle?.addEventListener('click', openMobileFilters);
    mobileFilterClose?.addEventListener('click', closeMobileFilters);
    overlay?.addEventListener('click', closeMobileFilters);

    mobileSearchForm?.addEventListener('submit', (event) => {
        event.preventDefault();
        const keywordInput = form.querySelector('input[name="keyword"]');
        if (keywordInput && mobileKeywordInput) {
            keywordInput.value = mobileKeywordInput.value;
        }
        if (form) {
            form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        }
    });

    render();
}

document.addEventListener('DOMContentLoaded', initLegacyFilterSupport);