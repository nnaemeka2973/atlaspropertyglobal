/**
 * Atlas Property Group - Core Engine
 * Senior JavaScript Developer
 * 
 */
// ===============================
// RapidAPI Configuration
// ===============================

document.addEventListener('DOMContentLoaded', async () => {
    if (window.initSharedNavbar) {
        window.initSharedNavbar();
    } else {
        initNavigation();
        initDarkMode();
    }

    // Ensure shared footer script is present on all pages that load main.js
    if (!document.querySelector('script[src="js/footer.js"]')) {
        const s = document.createElement('script');
        s.src = 'js/footer.js';
        s.async = false;
        document.body.appendChild(s);
    }

    if (!document.querySelector('script[src*="ai-assistant.js"]')) {
        const assistantScript = document.createElement('script');
        assistantScript.src = 'js/ai-assistant.js';
        assistantScript.async = false;
        document.body.appendChild(assistantScript);
    }

    initScrollReveal();
    initCounters();
    initPropertyInteractions();
    initTestimonials();
    initNewsletterForm();

    const propertiesGrid = document.getElementById("propertiesGrid");
    if (!propertiesGrid || document.querySelector(".hero-slider")) {
        return;
    }

    const response = await getProperties();
    const properties = Array.isArray(response?.data?.home_search?.results)
        ? response.data.home_search.results.slice(0, 6)
        : [];

    displayProperties(properties);

});

window.addEventListener('load', () => {
    document.body.classList.add('is-ready');
});

function initNewsletterForm() {
    const form = document.querySelector('.newsletter-form');
    if (!form || form.dataset.initialized === 'true') return;

    form.dataset.initialized = 'true';
    const emailInput = form.querySelector('input[type="email"]');
    const submitButton = form.querySelector('button[type="submit"]');
    const status = form.querySelector('.newsletter-status');

    form.addEventListener('submit', event => {
        event.preventDefault();
        if (!emailInput || !emailInput.checkValidity()) {
            emailInput?.reportValidity();
            return;
        }

        try {
            localStorage.setItem('atlasNewsletterEmail', emailInput.value.trim().toLowerCase());
        } catch (error) {
            console.warn('Unable to save newsletter subscription locally:', error);
        }

        if (status) {
            status.textContent = 'You are subscribed to Atlas market insights.';
            status.className = 'newsletter-status success';
        }
        emailInput.value = '';
        if (submitButton) submitButton.disabled = true;
    });
}

// Sticky Header & Mega Menu Logic
function initNavigation() {
    const header = document.querySelector('.main-header');
    const mobileMenuBtn = document.querySelector('.mobile-menu-toggle');
    const navMenu = document.querySelector('.nav-menu');

    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            header.classList.add('sticky');
        } else {
            header.classList.remove('sticky');
        }
    });

    mobileMenuBtn?.addEventListener('click', () => {
        navMenu?.classList.toggle('active');
        mobileMenuBtn.classList.toggle('is-active');
        const icon = mobileMenuBtn.querySelector('i');
        if (icon) {
            icon.classList.toggle('fa-bars');
            icon.classList.toggle('fa-times');
        }
        if (!navMenu?.classList.contains('active')) {
            document.body.classList.remove('menu-panel-open');
            const mega = document.querySelector('.has-mega');
            mega?.classList.remove('open');
            const mt = document.querySelector('.has-mega .mega-toggle');
            if (mt) mt.setAttribute('aria-expanded', 'false');
        }
    });

    const megaToggle = document.querySelector('.has-mega .mega-toggle');
    const megaItem = document.querySelector('.has-mega');
    megaToggle?.addEventListener('click', (event) => {
        event.preventDefault();
        const expanded = megaToggle.getAttribute('aria-expanded') === 'true';
        megaToggle.setAttribute('aria-expanded', String(!expanded));
        megaItem?.classList.toggle('open');
        if (window.innerWidth <= 768) {
            const isOpen = megaItem?.classList.contains('open');
            document.body.classList.toggle('menu-panel-open', Boolean(isOpen));
        }
    });
}

// Dark Mode Persistence
function initDarkMode() {
    const toggle = document.querySelector('#dark-mode-toggle');
    const isDark = localStorage.getItem('theme') === 'dark';

    if (isDark) document.body.classList.add('dark-mode');

    toggle?.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        const theme = document.body.classList.contains('dark-mode') ? 'dark' : 'light';
        localStorage.setItem('theme', theme);
    });
}

// Intersection Observer for Scroll Animations
let revealObserver;

function initScrollReveal() {
    if (revealObserver) {
        document.querySelectorAll('.reveal').forEach(el => {
            if (!el.classList.contains('active')) {
                revealObserver.observe(el);
            }
        });
        return revealObserver;
    }

    const observerOptions = { threshold: 0.1 };
    revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
                revealObserver.unobserve(entry.target);
            }
        });
    }, observerOptions);

    document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));
    return revealObserver;
}

function observeRevealElements(elements) {
    if (!revealObserver) {
        initScrollReveal();
    }

    elements.forEach(el => {
        if (!el.classList.contains('active')) {
            revealObserver.observe(el);
        }
    });
}

// Stat Counters for About/Home sections
function initCounters() {
    const counters = document.querySelectorAll('.counter-value, .stat-number');
    if (!counters.length) return;

    const runCounter = (el) => {
        const target = +el.getAttribute('data-target');
        const suffix = el.getAttribute('data-suffix') || '';
        let current = 0;
        const duration = 1400;
        const stepTime = Math.max(20, Math.floor(duration / target));
        const step = Math.ceil(target / (duration / stepTime));

        const tick = () => {
            current += step;
            if (current >= target) {
                el.innerText = target.toLocaleString() + suffix;
            } else {
                el.innerText = current.toLocaleString() + suffix;
                setTimeout(tick, stepTime);
            }
        };
        tick();
    };

    const observer = new IntersectionObserver((entries, obs) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                runCounter(entry.target);
                obs.unobserve(entry.target);
            }
        });
    }, { threshold: 0.5 });

    counters.forEach(c => observer.observe(c));
}

// Property card interactions: favorite toggle and share
function initPropertyInteractions() {
    // Favorite toggle (heart icon)
    document.querySelectorAll('.fav-icon').forEach(icon => {
        icon.addEventListener('click', (e) => {
            const el = e.currentTarget;
            el.classList.toggle('fas');
            el.classList.toggle('far');
            el.style.color = el.classList.contains('fas') ? '#e74c3c' : '';
        });
    });

    // Share: copy property link (uses closest .property-card to find a details link)
    document.querySelectorAll('.share-icon').forEach(icon => {
        icon.addEventListener('click', (e) => {
            const card = e.currentTarget.closest('.property-card');
            const linkEl = card?.querySelector('a[href*="property-details"]');
            const url = linkEl ? new URL(linkEl.getAttribute('href'), location.href).href : location.href;
            navigator.clipboard?.writeText(url).then(() => {
                console.info('Property link copied to clipboard');
            }).catch(() => {
                prompt('Copy this link', url);
            });
        });
    });
}

// Testimonials Carousel
function initTestimonials() {
    const slides = document.querySelectorAll('.testimonial-slide');
    const dots = document.querySelectorAll('.testimonial-dot');
    const prevBtn = document.querySelector('.testimonial-prev');
    const nextBtn = document.querySelector('.testimonial-next');
    if (!slides.length || !dots.length) return;

    let currentIndex = 0;
    let timeoutId;
    const interval = 7000;

    const setActiveSlide = (index) => {
        slides.forEach((slide, i) => {
            slide.classList.toggle('active', i === index);
        });
        dots.forEach((dot, i) => {
            dot.classList.toggle('active', i === index);
        });
        currentIndex = index;
    };

    const nextSlide = () => setActiveSlide((currentIndex + 1) % slides.length);
    const prevSlide = () => setActiveSlide((currentIndex - 1 + slides.length) % slides.length);
    const resetAutoSlide = () => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(nextSlide, interval);
    };

    dots.forEach((dot, index) => {
        dot.addEventListener('click', () => {
            setActiveSlide(index);
            resetAutoSlide();
        });
    });

    nextBtn?.addEventListener('click', () => {
        nextSlide();
        resetAutoSlide();
    });

    prevBtn?.addEventListener('click', () => {
        prevSlide();
        resetAutoSlide();
    });

    resetAutoSlide();
}

  




async function displayProperties(properties) {
    const grid = document.getElementById("propertiesGrid");

    if (!grid) return;

    const user = JSON.parse(localStorage.getItem("atlas_user"));
    const favoriteIds = new Set();
    const userId = user?.id || user?.uid;

    if (userId) {
        try {
            const response = await getFavorites(userId);
            const favorites = Array.isArray(response?.data) ? response.data : [];

            favorites.forEach(favorite => {
                if (favorite?.property_id !== undefined && favorite?.property_id !== null) {
                    favoriteIds.add(String(favorite.property_id));
                }
            });
        } catch (error) {
            console.error("Failed to load favorites:", error);
        }
    }

    grid.innerHTML = "";

    const fragment = document.createDocumentFragment();

    properties.forEach(property => {
        const image = getPropertyImage(property);
        const price = property.list_price
            ? `$${property.list_price.toLocaleString()}`
            : "Price unavailable";
        const beds = property.description?.beds ?? "-";
        const baths = property.description?.baths ?? "-";
        const sqft = property.description?.sqft
            ? property.description.sqft.toLocaleString()
            : "-";
        const address = property.location?.address?.line || "";
        const city = property.location?.address?.city || "";
        const state = property.location?.address?.state_code || "";
        const propertyId = String(getPropertyId(property));
        const isFavorite = favoriteIds.has(propertyId);

        const card = document.createElement("div");
        card.className = "property-card reveal";
        card.innerHTML = `
            <div class="property-image">
                <img
                    src="${image}"
                    alt="Property"
                    loading="lazy"
                    decoding="async"
                    onerror="handleImageError(this)"
                >
                <button
                    type="button"
                    class="favorite-btn"
                    data-id="${propertyId}"
                    aria-label="${isFavorite ? "Remove from favorites" : "Add to favorites"}"
                    aria-pressed="${isFavorite}">
                    <i class="${isFavorite ? "fa-solid" : "fa-regular"} fa-heart" style="${isFavorite ? "color: #e74c3c;" : ""}"></i>
                </button>
            </div>
            <div class="property-info">
                <h3>${price}</h3>
                <p class="property-location">
                    ${address}, ${city}, ${state}
                </p>
                <div class="property-features">
                    <span>🛏 ${beds} Beds</span>
                    <span>🛁 ${baths} Baths</span>
                    <span>📐 ${sqft} sqft</span>
                </div>
                <button
                    type="button"
                    class="btn btn-primary view-property"
                    data-id="${propertyId}"
                    style="width:100%;margin-top:20px;">
                    View Details
                </button>
            </div>
        `;

        fragment.appendChild(card);
    });

    grid.appendChild(fragment);

    grid.querySelectorAll(".view-property").forEach(button => {
        button.addEventListener("click", () => {
            window.location.href = `property-details.html?id=${button.dataset.id}`;
        });
    });

    grid.querySelectorAll(".favorite-btn").forEach(button => {
        button.addEventListener("click", async () => {
            if (button.dataset.pending === "true") return;

            const propertyId = button.dataset.id;
            const property = properties.find(item =>
                String(getPropertyId(item)) === propertyId
            );

            if (!property) return;

            const wasFavorite = favoriteIds.has(propertyId);
            const icon = button.querySelector("i");

            button.dataset.pending = "true";
            button.disabled = true;

            if (wasFavorite) {
                favoriteIds.delete(propertyId);
                icon?.classList.replace("fa-solid", "fa-regular");
                if (icon) icon.style.color = "";
                button.setAttribute("aria-label", "Add to favorites");
                button.setAttribute("aria-pressed", "false");
            } else {
                favoriteIds.add(propertyId);
                icon?.classList.replace("fa-regular", "fa-solid");
                if (icon) icon.style.color = "#e74c3c";
                button.setAttribute("aria-label", "Remove from favorites");
                button.setAttribute("aria-pressed", "true");
            }

            try {
                if (wasFavorite) {
                    await removeFavorite(propertyId);
                } else {
                    await addFavorite({ ...property, property_id: propertyId });
                }
            } catch (error) {
                if (wasFavorite) {
                    favoriteIds.add(propertyId);
                    icon?.classList.replace("fa-regular", "fa-solid");
                    if (icon) icon.style.color = "#e74c3c";
                    button.setAttribute("aria-label", "Remove from favorites");
                    button.setAttribute("aria-pressed", "true");
                } else {
                    favoriteIds.delete(propertyId);
                    icon?.classList.replace("fa-solid", "fa-regular");
                    if (icon) icon.style.color = "";
                    button.setAttribute("aria-label", "Add to favorites");
                    button.setAttribute("aria-pressed", "false");
                }

                console.error("Failed to update favorite:", error);
            } finally {
                button.dataset.pending = "false";
                button.disabled = false;
            }
        });
    });

    observeRevealElements(Array.from(grid.querySelectorAll(".property-card.reveal")));
}