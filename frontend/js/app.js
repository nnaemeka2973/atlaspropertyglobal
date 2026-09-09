(() => {
    'use strict';

    const root = document.getElementById('property-shell');
    const params = new URLSearchParams(window.location.search);
    const propertyId = params.get('id') || params.get('propertyId');

    const state = {
        property: null,
        images: [],
        similar: [],
        activeImageIndex: 0,
        onRender: null
    };

    const normalizeProperty = (response) => {
        return response?.data?.home || response?.data?.property || response?.data || response || null;
    };

    const normalizePhotos = (response) => {
        return response?.data?.home_search?.results?.[0]?.photos || response?.data?.photos || response?.photos || response?.data || response || [];
    };

    const normalizeSimilar = (response) => {
        return response?.data?.home?.related_homes?.results || response?.data?.related_homes?.results || response?.data?.results || response?.results || response?.data || [];
    };

    function renderSkeleton() {
        root.innerHTML = `
            <div class="zpd-loading-shell">
                <div class="zpd-skeleton-card zpd-skeleton-gallery"></div>
                <div class="zpd-skeleton-card zpd-skeleton-side">
                    <div class="zpd-skeleton-line short"></div>
                    <div class="zpd-skeleton-line medium"></div>
                    <div class="zpd-skeleton-line long"></div>
                    <div class="zpd-skeleton-line short"></div>
                    <div class="zpd-skeleton-grid">
                        <div class="zpd-skeleton-block"></div>
                        <div class="zpd-skeleton-block"></div>
                        <div class="zpd-skeleton-block"></div>
                    </div>
                </div>
            </div>
        `;
    }

    function renderError(message) {
        root.innerHTML = `
            <section class="zpd-error-shell">
                <div class="zpd-error-card">
                    <span class="zpd-error-icon" aria-hidden="true">!</span>
                    <div>
                        <h2>Property not found</h2>
                        <p>${escapeText(message || 'We could not load the listing details at this time.')}</p>
                        <div class="zpd-error-actions">
                            <a href="properties.html" class="zpd-button zpd-button-secondary">Back to listings</a>
                            <button type="button" id="zpd-retry-button" class="zpd-button zpd-button-primary">Retry</button>
                        </div>
                    </div>
                </div>
            </section>
        `;
    }

    function renderPage() {
        const address = formatAddress(
            state.property?.address || state.property?.location?.address?.line || '',
            state.property?.city || state.property?.location?.address?.city || '',
            state.property?.state || state.property?.location?.address?.state_code || '',
            state.property?.zip || state.property?.location?.address?.postal_code || ''
        );

        const title = state.property?.title || state.property?.location?.address?.line || state.property?.address || 'Luxury residence';
        const price = formatPrice(Number(state.property?.price || state.property?.list_price || 0));
        const status = escapeText(state.property?.listingStatus || state.property?.status || 'For sale');
        const propertyType = escapeText(state.property?.propertyType || state.property?.type || 'Single Family');

        root.innerHTML = `
            <article class="zpd-detail-page">
                ${renderPageHeader(state.property)}
                <section class="zpd-gallery-full-width">
                    ${GalleryModule.renderHero(state.property, state.images, state.activeImageIndex)}
                    <div class="zpd-gallery-sidebar-content">
                        ${renderSummaryCard({ title, price, address, status, propertyType })}
                        ${renderStatCards(state.property)}
                        ${renderContactForm()}
                        ${renderMapCard(state.property)}
                    </div>
                </section>

                <section class="zpd-main-content">
                    ${renderDescriptionSection(state.property)}
                    ${renderAmenityCards(state.property)}
                    ${SimilarPropertiesModule.renderSimilarProperties(state.similar)}
                </section>
            </article>
        `;

        bindPageEvents();
        GalleryModule.bindGallery(root, state, renderPage);
        MapModule.initMap(state.property);
        SimilarPropertiesModule.bindSimilarActions(root);
    }

    function renderPageHeader(property = {}) {
        const listingStatus = String(property?.listingStatus || property?.status || '').toLowerCase();
        const normalizedStatus = listingStatus.replace(/[_-]/g, ' ');
        const showSale = /for\s+sale/.test(normalizedStatus);
        const title = property?.title || property?.address || property?.location?.address?.line || 'Luxury residence';
        const address = formatAddress(
            property?.address || property?.location?.address?.line || '',
            property?.city || property?.location?.address?.city || '',
            property?.state || property?.location?.address?.state_code || '',
            property?.zip || property?.location?.address?.postal_code || ''
        );

        return `
            <section class="zpd-page-heading">
                ${showSale ? '<span class="zpd-page-heading-label">For Sale</span>' : ''}
                <h1>${escapeText(title)}</h1>
                <p class="zpd-page-heading-address">${escapeText(address)}</p>
            </section>
        `;
    }

    function renderSummaryCard({ title, price, address, status, propertyType }) {
        return `
            <section class="zpd-card zpd-property-summary-card">
                <div class="zpd-property-heading">
                    <div>
                        <span class="zpd-status-pill">${status}</span>
                        <h1>${escapeText(title)}</h1>
                        <p class="zpd-summary-address">${escapeText(address)}</p>
                    </div>
                </div>
                <div class="zpd-price-block">
                    <strong>${escapeText(price)}</strong>
                    <span>${propertyType}</span>
                </div>
                <div class="zpd-property-meta-list">
                    <div><span>MLS</span><strong>${escapeText(state.property?.mlsNumber || state.property?.listingId || state.property?.listing_id || '—')}</strong></div>
                    <div><span>Property ID</span><strong>${escapeText(state.property?.propertyId || state.property?.id || '—')}</strong></div>
                    <div><span>Year built</span><strong>${escapeText(state.property?.yearBuilt || state.property?.description?.year_built || '—')}</strong></div>
                </div>
            </section>
        `;
    }

    function renderStatCards(property = {}) {
        const stats = [
            { label: 'Bedrooms', value: formatBeds(property?.description?.beds ?? property?.beds ?? property?.bedrooms ?? 0) },
            { label: 'Bathrooms', value: formatBaths(property?.description?.baths ?? property?.baths ?? property?.bathrooms ?? 0) },
            { label: 'Garage', value: escapeText(property?.description?.garage || property?.garage || '—') },
            { label: 'Area', value: escapeText(formatSqft(property?.description?.sqft ?? property?.area ?? property?.building_area ?? 0)) },
            { label: 'Type', value: escapeText(property?.description?.type || property?.type || '—') },
            { label: 'Status', value: escapeText(state.property?.listingStatus || state.property?.status || '—') }
        ];

        return `
            <section class="zpd-card zpd-stats-card">
                <div class="zpd-stat-grid">
                    ${stats.map((stat) => `
                        <article class="zpd-stat-tile">
                            <span>${escapeText(stat.label)}</span>
                            <strong>${stat.value}</strong>
                        </article>
                    `).join('')}
                </div>
            </section>
        `;
    }

    function renderDescriptionSection(property = {}) {
        const description = property?.description?.text || property?.description?.summary || property?.public_remarks || property?.description || '';
        const paragraphs = String(description).split(/\n\n|\r\n\r\n/).map((paragraph) => paragraph.trim()).filter(Boolean);

        return `
            <section class="zpd-card zpd-description-card">
                <div class="zpd-card-header">
                    <div>
                        <span class="zpd-section-label">Overview</span>
                        <h2>Property description</h2>
                    </div>
                </div>
                ${paragraphs.length ? paragraphs.map((paragraph) => `<p>${escapeText(paragraph)}</p>`).join('') : '<p>This listing does not include a detailed description.</p>'}
            </section>
        `;
    }

    function getAmenityList(property = {}) {
        const rawAmenities = property?.description?.features || property?.features || property?.amenities || [];
        const list = Array.isArray(rawAmenities)
            ? rawAmenities
            : typeof rawAmenities === 'string'
                ? rawAmenities.split(',').map((item) => item.trim())
                : [];

        if (!list.length) {
            const inferred = [];
            if (property?.description?.garage || property?.garage) inferred.push('Parking');
            if (String(property?.description?.pool || property?.pool).toLowerCase() === 'yes') inferred.push('Swimming Pool');
            if (String(property?.description?.balcony || property?.balcony).toLowerCase() === 'yes') inferred.push('Balcony');
            if (String(property?.description?.air_conditioning || property?.airConditioning || property?.air_conditioning).toLowerCase() === 'yes') inferred.push('Air Conditioning');
            if (String(property?.description?.security || property?.security).toLowerCase() === 'yes') inferred.push('Security');
            return inferred;
        }

        return list.filter(Boolean).slice(0, 12);
    }

    function renderAmenityCards(property = {}) {
        const items = getAmenityList(property);
        if (!items.length) return '';

        return `
            <section class="zpd-card zpd-amenities-card">
                <div class="zpd-card-header">
                    <div>
                        <span class="zpd-section-label">Amenities</span>
                        <h2>Features & amenities</h2>
                    </div>
                </div>
                <div class="zpd-amenities-grid">
                    ${items.map((item) => `
                        <div class="zpd-amenity-tile">
                            <span class="zpd-amenity-icon">${renderAmenityIcon(item)}</span>
                            <span>${escapeText(item)}</span>
                        </div>
                    `).join('')}
                </div>
            </section>
        `;
    }

    function renderAmenityIcon(label) {
        const name = String(label).toLowerCase();
        if (name.includes('pool')) return '<i class="fas fa-water"></i>';
        if (name.includes('parking') || name.includes('garage')) return '<i class="fas fa-car-side"></i>';
        if (name.includes('garden') || name.includes('yard')) return '<i class="fas fa-tree"></i>';
        if (name.includes('balcony')) return '<i class="fas fa-building"></i>';
        if (name.includes('security') || name.includes('alarm')) return '<i class="fas fa-shield-alt"></i>';
        if (name.includes('air') || name.includes('conditioning')) return '<i class="fas fa-fan"></i>';
        if (name.includes('fireplace')) return '<i class="fas fa-fire"></i>';
        return '<i class="fas fa-star"></i>';
    }

    function renderAgentContact(property = {}) {
        const agent = property?.agent || property?.advertisers?.[0] || {};
        const phone = String(agent.phone || property?.agent?.phone || property?.advertisers?.[0]?.phone || '+18005550123').replace(/[^0-9]/g, '');
        const email = agent.email || property?.agent?.email || property?.advertisers?.[0]?.email || 'hello@atlaspropertygroup.com';

        return `
            <section class="zpd-card zpd-agent-panel">
                <div class="zpd-agent-panel-top">
                    <img src="${escapeText(agent.photo || agent.image || property?.agent?.photo || property?.advertisers?.[0]?.photo || 'https://images.unsplash.com/photo-1544723795-3fb6469f5b39?auto=format&fit=crop&w=400&q=80')}" alt="${escapeText(agent.name || 'Agent')}" loading="lazy">
                    <div>
                        <span class="zpd-agent-label-large">${escapeText(agent.company || 'Atlas Property Group')}</span>
                        <h3>${escapeText(agent.name || 'James Anderson')}</h3>
                        <p>${escapeText(agent.title || 'Lead Property Agent')}</p>
                    </div>
                </div>
                <div class="zpd-agent-meta-grid">
                    <div><strong>${escapeText(agent.experience || '15')} yrs</strong><span>Experience</span></div>
                    <div><strong>${escapeText(agent.reviews || '128')}</strong><span>Reviews</span></div>
                    <div><strong>${escapeText(agent.languages?.join(', ') || 'English')}</strong><span>Languages</span></div>
                </div>
                <div class="zpd-agent-actions">
                    <a href="tel:${escapeText(phone)}" class="zpd-button zpd-button-primary">Call</a>
                    <a href="mailto:${escapeText(email)}" class="zpd-button zpd-button-secondary">Email</a>
                    <a href="https://wa.me/${escapeText(phone)}" class="zpd-button zpd-button-secondary">WhatsApp</a>
                </div>
            </section>
        `;
    }

    function renderHighlights(highlights = []) {
        if (!Array.isArray(highlights) || !highlights.length) return '';

        return `
            <div class="zpd-highlights">
                <h3>Highlights</h3>
                <ul>
                    ${highlights.map((item) => `<li>${escapeText(item)}</li>`).join('')}
                </ul>
            </div>
        `;
    }

    function renderFeatures(features = {}) {
        if (!features) return '';

        const interior = features.interior || [];
        const exterior = features.exterior || [];
        const community = features.community || [];

        return `
            <section class="zpd-card zpd-features-card">
                <div class="zpd-card-header">
                    <div>
                        <span class="zpd-section-label">Features</span>
                        <h2>Home features</h2>
                    </div>
                </div>
                <div class="zpd-features-grid">
                    ${renderFeatureList('Interior', interior)}
                    ${renderFeatureList('Exterior', exterior)}
                    ${renderFeatureList('Community', community)}
                </div>
            </section>
        `;
    }

    function renderFeatureList(title, items) {
        if (!items.length) return '';
        return `
            <div class="zpd-feature-group">
                <h4>${escapeText(title)}</h4>
                <ul>${items.map((feature) => `<li>${escapeText(feature)}</li>`).join('')}</ul>
            </div>
        `;
    }

    function renderRooms(rooms = []) {
        if (!rooms.length) return '';

        return `
            <section class="zpd-card zpd-rooms-card">
                <div class="zpd-card-header">
                    <div>
                        <span class="zpd-section-label">Rooms</span>
                        <h2>Room details</h2>
                    </div>
                </div>
                <div class="zpd-table-wrap">
                    <table>
                        <thead>
                            <tr>
                                <th>Room</th>
                                <th>Dimensions</th>
                                <th>Floor</th>
                                <th>Features</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${rooms.map((room) => `
                                <tr>
                                    <td>${escapeText(room.name || room.room)}</td>
                                    <td>${escapeText(room.dimensions || `${room.length || '—'} x ${room.width || '—'}`)}</td>
                                    <td>${escapeText(room.floor || room.level || '—')}</td>
                                    <td>${escapeText((room.features || []).join(', ') || room.feature || '—')}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </section>
        `;
    }

    function renderReviews(reviews = []) {
        return ReviewsModule.renderReviewList(reviews);
    }

    function renderMapCard(property) {
        return `
            <section class="zpd-card zpd-map-card">
                <div class="zpd-card-header">
                    <div>
                        <span class="zpd-section-label">Location</span>
                        <h2>Neighborhood snapshot</h2>
                    </div>
                </div>
                ${MapModule.renderMapSection(property)}
            </section>
        `;
    }

    function renderNearby(nearby) {
        const source = nearby || {};
        const categories = [
            { title: 'Schools', items: Array.isArray(source.schools) ? source.schools : [] },
            { title: 'Restaurants', items: Array.isArray(source.restaurants) ? source.restaurants : [] },
            { title: 'Parks', items: Array.isArray(source.parks) ? source.parks : [] },
            { title: 'Shopping', items: Array.isArray(source.shopping) ? source.shopping : [] }
        ];

        if (!categories.some((category) => category.items.length)) return '';

        return `
            <section class="zpd-card zpd-nearby-card">
                <div class="zpd-card-header">
                    <div>
                        <span class="zpd-section-label">Nearby</span>
                        <h2>Local conveniences</h2>
                    </div>
                </div>
                <div class="zpd-nearby-grid">
                    ${categories.map((category) => renderNearbyCategory(category.title, category.items)).join('')}
                </div>
            </section>
        `;
    }

    function renderNearbyCategory(title, items = []) {
        if (!items.length) return '';
        return `
            <div class="zpd-nearby-group">
                <h4>${escapeText(title)}</h4>
                <ul>
                    ${items.slice(0, 4).map((item) => `
                        <li>
                            <strong>${escapeText(item.name)}</strong>
                            <span>${escapeText(item.distance || '')}</span>
                            <p>${escapeText(item.address || item.location || '')}</p>
                        </li>
                    `).join('')}
                </ul>
            </div>
        `;
    }

    function renderPropertyHistory(history = [], taxHistory = []) {
        if (!history.length && !taxHistory.length) return '';

        return `
            <section class="zpd-card zpd-history-card">
                <div class="zpd-card-header">
                    <div>
                        <span class="zpd-section-label">History</span>
                        <h2>Price & tax history</h2>
                    </div>
                </div>
                ${renderHistoryTable(history)}
                ${renderTaxHistoryTable(taxHistory)}
            </section>
        `;
    }

    function renderHistoryTable(history = []) {
        if (!history.length) return '';
        return `
            <div class="zpd-history-block">
                <h4>Listing history</h4>
                <table>
                    <thead><tr><th>Date</th><th>Event</th><th>Price</th></tr></thead>
                    <tbody>${history.map((item) => `
                        <tr>
                            <td>${escapeText(item.date)}</td>
                            <td>${escapeText(item.event || item.type)}</td>
                            <td>${escapeText(formatPrice(Number(item.price || item.amount || 0)))}</td>
                        </tr>
                    `).join('')}</tbody>
                </table>
            </div>
        `;
    }

    function renderTaxHistoryTable(taxHistory = []) {
        if (!taxHistory.length) return '';
        return `
            <div class="zpd-history-block">
                <h4>Tax history</h4>
                <table>
                    <thead><tr><th>Year</th><th>Tax paid</th><th>Assessment</th></tr></thead>
                    <tbody>${taxHistory.map((item) => `
                        <tr>
                            <td>${escapeText(item.year)}</td>
                            <td>${escapeText(formatPrice(Number(item.taxPaid || item.tax || 0)))}</td>
                            <td>${escapeText(formatPrice(Number(item.assessment || 0)))}</td>
                        </tr>
                    `).join('')}</tbody>
                </table>
            </div>
        `;
    }

    function renderInvestment(investment = {}) {
        if (!investment || !Object.keys(investment).length) return '';

        return `
            <section class="zpd-card zpd-investment-card">
                <div class="zpd-card-header">
                    <div>
                        <span class="zpd-section-label">Investment</span>
                        <h2>Performance metrics</h2>
                    </div>
                </div>
                <div class="zpd-investment-grid">
                    ${renderInvestmentTile('Rental estimate', formatPrice(Number(investment.rentalEstimate || 0)))}
                    ${renderInvestmentTile('ROI', `${escapeText(investment.roi || '—')}%`)}
                    ${renderInvestmentTile('Cash flow', formatPrice(Number(investment.cashFlow || 0)))}
                    ${renderInvestmentTile('Cap rate', `${escapeText(investment.capRate || '—')}%`)}
                    ${renderInvestmentTile('Occupancy', `${escapeText(investment.occupancyRate || '—')}%`)}
                    ${renderInvestmentTile('Score', escapeText(investment.score || '—'))}
                </div>
            </section>
        `;
    }

    function renderInvestmentTile(label, value) {
        return `
            <div class="zpd-investment-tile">
                <span>${escapeText(value)}</span>
                <small>${escapeText(label)}</small>
            </div>
        `;
    }

    function renderEnergy(energy = {}) {
        if (!energy || !Object.keys(energy).length) return '';

        return `
            <section class="zpd-card zpd-energy-card">
                <div class="zpd-card-header">
                    <div>
                        <span class="zpd-section-label">Energy</span>
                        <h2>Efficiency & utilities</h2>
                    </div>
                </div>
                <div class="zpd-energy-grid">
                    ${renderEnergyTile('Rating', energy.energyRating || '—')}
                    ${renderEnergyTile('Solar', energy.solar || '—')}
                    ${renderEnergyTile('Electricity', energy.electricity || '—')}
                    ${renderEnergyTile('Gas', energy.gas || '—')}
                    ${renderEnergyTile('Water', energy.water || '—')}
                </div>
            </section>
        `;
    }

    function renderEnergyTile(label, value) {
        return `
            <div class="zpd-energy-tile">
                <strong>${escapeText(value)}</strong>
                <small>${escapeText(label)}</small>
            </div>
        `;
    }

    function renderFloorPlans(floorplans = []) {
        if (!floorplans.length) return '';

        return `
            <section class="zpd-card zpd-floorplans-card">
                <div class="zpd-card-header">
                    <div>
                        <span class="zpd-section-label">Floor plans</span>
                        <h2>Interactive layouts</h2>
                    </div>
                </div>
                ${floorplans.map((plan) => `
                    <div class="zpd-floorplan-item">
                        <strong>${escapeText(plan.title || plan.name || 'Floor plan')}</strong>
                        <p>${escapeText(plan.description || '')}</p>
                        <a href="${escapeText(plan.pdfUrl || plan.url || '#')}" class="zpd-link">Download PDF</a>
                    </div>
                `).join('')}
            </section>
        `;
    }

    function renderDocuments(documents = []) {
        if (!documents.length) return '';

        return `
            <section class="zpd-card zpd-documents-card">
                <div class="zpd-card-header">
                    <div>
                        <span class="zpd-section-label">Documents</span>
                        <h2>Property paperwork</h2>
                    </div>
                </div>
                <div class="zpd-documents-grid">
                    ${documents.map((doc) => `
                        <a href="${escapeText(doc.url || '#')}" class="zpd-document-item">
                            <strong>${escapeText(doc.name || doc.title || 'Document')}</strong>
                            <span>${escapeText(doc.type || 'PDF')}</span>
                        </a>
                    `).join('')}
                </div>
            </section>
        `;
    }

    function renderAgentCard(agent = {}) {
        if (!agent || !Object.keys(agent).length) return '';

        return `
            <section class="zpd-card zpd-agent-card-panel">
                <div class="zpd-agent-card-top">
                    <img src="${escapeText(agent.photo || agent.image || 'https://images.unsplash.com/photo-1544723795-3fb6469f5b39?auto=format&fit=crop&w=400&q=80')}" alt="${escapeText(agent.name || 'Agent')}" loading="lazy">
                    <div>
                        <span class="zpd-agent-label-large">${escapeText(agent.company || 'Atlas Property Group')}</span>
                        <h3>${escapeText(agent.name || 'James Anderson')}</h3>
                        <p>${escapeText(agent.title || agent.role || 'Lead agent')}</p>
                    </div>
                </div>
                <div class="zpd-agent-meta">
                    <div><strong>${escapeText(agent.rating || '4.9')}</strong><small>Rating</small></div>
                    <div><strong>${escapeText(agent.reviews || '128')}</strong><small>Reviews</small></div>
                    <div><strong>${escapeText(agent.experience || '15')} yrs</strong><small>Experience</small></div>
                </div>
                <div class="zpd-agent-actions-panel">
                    <a href="tel:${escapeText(agent.phone || '+18005550123')}" class="zpd-button zpd-button-secondary"><i class="fas fa-phone"></i> Call</a>
                    <a href="mailto:${escapeText(agent.email || 'hello@atlaspropertygroup.com')}" class="zpd-button zpd-button-secondary"><i class="fas fa-envelope"></i> Email</a>
                    <a href="https://wa.me/${escapeText((agent.whatsapp || agent.phone || '+18005550123').replace(/[^0-9]/g, ''))}" class="zpd-button zpd-button-secondary"><i class="fab fa-whatsapp"></i> WhatsApp</a>
                </div>
                <div class="zpd-agent-stats">
                    <div><strong>${escapeText(agent.propertiesSold || '234')}</strong><small>Sold</small></div>
                    <div><strong>${escapeText(agent.languages?.join(', ') || 'English')}</strong><small>Languages</small></div>
                    <div><strong>${escapeText(agent.licenseNumber || 'CA 123456')}</strong><small>License</small></div>
                </div>
            </section>
        `;
    }

    function renderContactForm() {
        return `
            <section class="zpd-card zpd-contact-card">
                <div class="zpd-card-header">
                    <div>
                        <span class="zpd-section-label">Contact</span>
                        <h2>Request more info</h2>
                    </div>
                </div>
                <form id="zpd-contact-form" class="zpd-contact-form">
                    <label>
                        Name
                        <input type="text" name="name" required>
                    </label>
                    <label>
                        Phone
                        <input type="tel" name="phone" required>
                    </label>
                    <label>
                        Email
                        <input type="email" name="email" required>
                    </label>
                    <label>
                        Message
                        <textarea name="message" rows="4"></textarea>
                    </label>
                    <div class="zpd-contact-grid">
                        <label>
                            Preferred visit date
                            <input type="date" name="visitDate">
                        </label>
                        <label>
                            Preferred time
                            <input type="time" name="visitTime">
                        </label>
                    </div>
                    <button type="submit" class="zpd-button zpd-button-primary">Submit request</button>
                </form>
            </section>
        `;
    }

    function bindPageEvents() {
        const saveButton = root.querySelector('[data-action="save"]');
        const shareButton = root.querySelector('[data-action="share"]');
        const contactForm = root.querySelector('#zpd-contact-form');
        const retryButton = root.querySelector('#zpd-retry-button');

        document.querySelectorAll('.zpd-agent-panel, .zpd-agent-card-panel, .pd-agent-card').forEach((node) => {
            node.remove();
        });

        saveButton?.addEventListener('click', () => {
            const id = state.property?.propertyId || state.property?.id;
            window.localStorage.setItem(`favorite_${id}`, JSON.stringify({ saved: true, id }));
            saveButton.textContent = 'Saved';
        });

        shareButton?.addEventListener('click', async () => {
            try {
                await navigator.clipboard.writeText(window.location.href);
                shareButton.textContent = 'Copied';
                setTimeout(() => { shareButton.textContent = 'Share'; }, 1800);
            } catch {
                shareButton.textContent = 'Copy failed';
            }
        });

        retryButton?.addEventListener('click', () => {
            loadPage();
        });

        contactForm?.addEventListener('submit', (event) => {
            event.preventDefault();
            const form = event.target;
            const data = {
                name: form.name.value,
                phone: form.phone.value,
                email: form.email.value,
                message: form.message.value,
                visitDate: form.visitDate.value,
                visitTime: form.visitTime.value,
                propertyId: state.property?.propertyId || state.property?.id
            };
            console.log('Contact request submitted', data);
            form.reset();
            alert('Your request has been submitted. An agent will follow up shortly.');
        });
    }

    async function loadPage() {
        if (!propertyId) {
            renderError('Property ID missing from the URL.');
            return;
        }

        renderSkeleton();

        try {
            const [propertyResponse, photosResponse, similarResponse] = await Promise.all([
                getPropertyDetails(propertyId),
                getPropertyPhotos(propertyId),
                getSimilarHomes(propertyId)
            ]);

            state.property = normalizeProperty(propertyResponse);
            state.images = normalizePhotos(photosResponse);
            state.similar = normalizeSimilar(similarResponse);
            state.activeImageIndex = 0;

            if (!state.property) {
                throw new Error('Listing data unavailable.');
            }

            renderPage();
        } catch (error) {
            console.error('Failed to load property page:', error);
            renderError(error?.message || 'Unable to load listing details.');
        }
    }

    if (!root) return;
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', loadPage);
    } else {
        loadPage();
    }
})();
