/**
 * Atlas Property Group - Enhanced Properties Module
 * Includes all 25 premium real estate sections with rendering functions
 */

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
    // Get 4-6 similar properties from the properties array
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
        <div class="info-block">
            <h2>Meet Your Agent</h2>
            <div style="background: var(--light-gray); padding: 24px; border-radius: 12px;">
                <div style="display: grid; grid-template-columns: auto 1fr; gap: 20px; margin-bottom: 24px;">
                    <img src="https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=150&q=80" 
                         style="width: 100px; height: 100px; border-radius: 50%; object-fit: cover;" 
                         alt="${agent.name}">
                    <div>
                        <h3 style="margin: 0 0 8px 0;">${agent.name}</h3>
                        <p style="margin: 0 0 12px 0; color: var(--medium-gray);">Senior Global Advisor</p>
                        <div style="display: flex; gap: 12px; flex-wrap: wrap;">
                            <a href="tel:${agent.phone}" class="property-doc-btn">
                                <i class="fas fa-phone"></i> ${agent.phone}
                            </a>
                            <a href="mailto:${agent.email}" class="property-doc-btn">
                                <i class="fas fa-envelope"></i> Email
                            </a>
                            <a href="https://wa.me/${agent.whatsapp.replace(/\D/g, '')}" class="property-doc-btn" target="_blank">
                                <i class="fab fa-whatsapp"></i> WhatsApp
                            </a>
                        </div>
                    </div>
                </div>
                <div class="property-extended-grid">
                    <div class="property-extended-card">
                        <h3>Office</h3>
                        <p style="margin: 0; color: var(--medium-gray);">${agent.officeAddress}</p>
                    </div>
                    <div class="property-extended-card">
                        <h3>Languages</h3>
                        <p style="margin: 0; color: var(--medium-gray);">${agent.languages.join(', ')}</p>
                    </div>
                    <div class="property-extended-card">
                        <h3>Experience</h3>
                        <p style="margin: 0; color: var(--medium-gray);">${agent.experience} years</p>
                    </div>
                    <div class="property-extended-card">
                        <h3>Properties Sold</h3>
                        <p style="margin: 0; color: var(--medium-gray);">${agent.sold}+</p>
                    </div>
                </div>
                ${agent.awards && agent.awards.length ? `
                    <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid var(--border-color);">
                        <h3 style="margin: 0 0 12px 0;">Awards & Achievements</h3>
                        ${agent.awards.map(award => `
                            <div class="amenity-item">
                                <i class="fas fa-award" style="color: var(--accent-gold);"></i> ${award}
                            </div>
                        `).join('')}
                    </div>
                ` : ''}
                <button class="btn btn-primary" style="width: 100%; margin-top: 20px;">View Agent Profile</button>
            </div>
        </div>
    `;
}

// SECTION 24 & 25: Neighborhood (already exists, but expanded)
// Handled by existing initNeighborhoodSection function

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
