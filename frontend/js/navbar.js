(function () {
    'use strict';

    const HEADER_ROOT_SELECTOR = '[data-shared-navbar], #shared-header-root';
    const currentPagePath = `${window.location.pathname.split('/').pop() || 'index.html'}${window.location.search}${window.location.hash}`;
    const loginHref = `login.html?redirect=${encodeURIComponent(currentPagePath)}`;
    const sharedHeaderMarkup = `
        <header class="main-header">
            <div class="container">
                <nav class="navbar">
                    <a href="index.html" class="logo">
                        <img src="asset/try3.png" alt="Atlas Property Group Logo" class="logo-img">
                    </a>

                    <ul class="nav-menu">
                        <li><a href="index.html" data-nav-home>Home</a></li>
                        <li class="has-mega">
                            <a href="properties.html" class="mega-link" data-nav-properties>Properties</a>
                            <button class="mega-toggle" type="button" aria-controls="properties-menu" aria-expanded="false" aria-label="Show property categories">
                                <i class="fas fa-chevron-down"></i>
                            </button>
                            <div class="mega-menu" id="properties-menu">
                                <div class="mega-grid">
                                    <div class="mega-col">
                                        <h4>Residential</h4>
                                        <a class="mega-item" href="properties.html?type=houses">Houses</a>
                                        <a class="mega-item" href="properties.html?type=apartments">Apartments</a>
                                        <a class="mega-item" href="properties.html?type=luxury-villas">Luxury Villas</a>
                                        <a class="mega-item" href="properties.html?type=penthouses">Penthouses</a>
                                        <a class="mega-item" href="properties.html?type=estates">Private Estates</a>
                                    </div>
                                    <div class="mega-col">
                                        <h4>Commercial</h4>
                                        <a class="mega-item" href="properties.html?type=offices">Corporate Offices</a>
                                        <a class="mega-item" href="properties.html?type=retail">Retail Spaces</a>
                                        <a class="mega-item" href="properties.html?type=industrial">Industrial Complexes</a>
                                    </div>
                                    <div class="mega-col">
                                        <h4>Investments</h4>
                                        <a class="mega-item" href="investments.html">Portfolio Strategy</a>
                                        <a class="mega-item" href="investments.html#yield">High Yield Assets</a>
                                        <a class="mega-item" href="developments.html">New Developments</a>
                                    </div>
                                </div>
                            </div>
                        </li>
                        <li class="has-mega">
                            <a href="services.html" class="mega-link" data-nav-services>Services</a>
                            <button class="mega-toggle" type="button" aria-controls="services-menu" aria-expanded="false" aria-label="Show services categories">
                                <i class="fas fa-chevron-down"></i>
                            </button>
                            <div class="mega-menu services-menu" id="services-menu">
                                <div class="mega-grid">
                                    <div class="mega-col">
                                        <a href="services.html">Services</a>
                                        <a href="investments.html">Investments</a>
                                        <a href="developments.html">Developments</a>
                                        <a href="international-buyers.html">International Buyers</a>
                                    </div>
                                </div>
                            </div>
                        </li>
                        <li><a href="mortgage-calculator.html" data-nav-mortgage>Mortgage</a></li>
                        <li><a href="agents.html" data-nav-agents>Agents</a></li>
                        <li><a href="blog.html" data-nav-journal>Journal</a></li>
                        <li><a href="contact.html" data-nav-contact>Contact</a></li>
                    </ul>

                    <div class="nav-actions">
                        <button id="dark-mode-toggle" aria-label="Toggle Dark Mode"><i class="fas fa-moon"></i></button>

                        <div class="auth-group" id="auth-nav">
                            <a href="${loginHref}" class="btn btn-gold-sm">Sign in</a>
                        </div>

                        <div class="user-profile-nav" id="user-nav" style="display: none;">
                            <button type="button" class="user-avatar-button" id="user-avatar-button" aria-haspopup="true" aria-expanded="false" aria-label="Open account menu">
                                <span class="nav-avatar nav-avatar--letter" id="user-nav-avatar">A</span>
                            </button>
                            <button id="logout-btn" class="logout-icon" aria-label="Log out">
                                <i class="fas fa-sign-out-alt"></i>
                            </button>
                            <div class="user-dropdown-menu" id="user-dropdown-menu" aria-hidden="true">
                                <a href="dashboard.html" class="user-dropdown-item">My Dashboard</a>
                                <a href="dashboard.html#panel-profile" class="user-dropdown-item">Profile</a>
                                <a href="dashboard.html#panel-saved-properties" class="user-dropdown-item">Saved Properties</a>
                                <a href="dashboard.html#panel-saved-searches" class="user-dropdown-item">Saved Searches</a>
                                <a href="dashboard.html#panel-compare" class="user-dropdown-item">Compare Properties</a>
                                <a href="dashboard.html#panel-tours" class="user-dropdown-item">Scheduled Tours</a>
                                <a href="dashboard.html#panel-messages" class="user-dropdown-item">Messages</a>
                                <a href="dashboard.html#panel-notifications" class="user-dropdown-item">Notifications</a>
                                <a href="dashboard.html#panel-settings" class="user-dropdown-item">Settings</a>
                                <div class="user-dropdown-divider"></div>
                                <button type="button" class="user-dropdown-item" id="logout-menu-btn">Logout</button>
                            </div>
                        </div>

                        <button class="mobile-menu-toggle" type="button" aria-label="Toggle mobile menu">
                            <i class="fas fa-bars"></i>
                        </button>
                    </div>
                </nav>
            </div>
        </header>
    `;

    function getActiveNavKey() {
        const path = window.location.pathname.split('/').pop() || 'index.html';
        if (path === 'property-details.html') return 'properties';
        if (path === 'properties.html') return 'properties';
        if (path === 'mortgage-calculator.html') return 'mortgage';
        if (path === 'agents.html') return 'agents';
        if (path === 'blog.html') return 'journal';
        if (path === 'contact.html') return 'contact';
        if (path === 'dashboard.html') return 'dashboard';
        return 'home';
    }

    function markActiveNavLink() {
        const activeKey = getActiveNavKey();
        document.querySelectorAll('.nav-menu a').forEach((link) => {
            let datasetKey = link.dataset.navHome ? 'home' : link.dataset.navProperties ? 'properties' : link.dataset.navServices ? 'services' : link.dataset.navMortgage ? 'mortgage' : link.dataset.navAgents ? 'agents' : link.dataset.navJournal ? 'journal' : link.dataset.navContact ? 'contact' : null;
            if (!datasetKey) {
                const href = link.getAttribute('href') || '';
                if (href.includes('index.html')) datasetKey = 'home';
                else if (href.includes('properties.html')) datasetKey = 'properties';
                else if (href.includes('mortgage-calculator.html')) datasetKey = 'mortgage';
                else if (href.includes('agents.html')) datasetKey = 'agents';
                else if (href.includes('blog.html')) datasetKey = 'journal';
                else if (href.includes('contact.html')) datasetKey = 'contact';
            }
            const isActive = datasetKey === activeKey;
            link.classList.toggle('active', isActive);
            if (isActive) {
                link.setAttribute('aria-current', 'page');
            } else {
                link.removeAttribute('aria-current');
            }
        });
    }

    function renderSharedNavbar() {
        const root = document.querySelector(HEADER_ROOT_SELECTOR);
        if (!root) {
            // Page uses manually authored navbar markup instead of the shared root.
            markActiveNavLink();
            syncAuthNavbarState();
            return;
        }
        if (root.dataset.navbarRendered === 'true') {
            markActiveNavLink();
            syncAuthNavbarState();
            return;
        }
        root.innerHTML = sharedHeaderMarkup;
        root.dataset.navbarRendered = 'true';
        markActiveNavLink();
        syncAuthNavbarState();
        // Notify other scripts that the shared navbar has been rendered
        window.dispatchEvent(new Event('atlas:navbar-rendered'));
    }

    function syncAuthNavbarState() {
        const user = JSON.parse(localStorage.getItem('atlas_user') || 'null');
        const authNav = document.getElementById('auth-nav');
        const userNav = document.getElementById('user-nav');
        const avatarButton = document.getElementById('user-avatar-button');
        const avatarTarget = document.getElementById('user-nav-avatar');
        const menu = document.getElementById('user-dropdown-menu');

        if (user) {
            if (authNav) authNav.style.display = 'none';
            if (userNav) userNav.style.display = 'flex';
            if (avatarTarget) {
                const name = (user.full_name || user.fullName || user.name || user.display_name || user.email || 'User').trim();
                const initial = name.charAt(0).toUpperCase() || 'U';
                avatarTarget.className = 'nav-avatar nav-avatar--letter';
                avatarTarget.textContent = initial;
            }
        } else {
            if (authNav) authNav.style.display = 'flex';
            if (userNav) userNav.style.display = 'none';
            const signInLink = authNav?.querySelector('a[href*="login.html"]');
            if (signInLink) {
                signInLink.href = loginHref;
            }
        }

        if (avatarButton) avatarButton.setAttribute('aria-expanded', 'false');
        if (menu) menu.setAttribute('aria-hidden', 'true');
        if (userNav) userNav.classList.remove('is-open');
    }

    function syncTheme() {
        const toggle = document.querySelector('#dark-mode-toggle');
        const isDark = localStorage.getItem('theme') === 'dark';
        if (isDark) {
            document.body.classList.add('dark-mode');
        } else {
            document.body.classList.remove('dark-mode');
        }
        if (toggle) {
            const icon = toggle.querySelector('i');
            if (icon) {
                icon.className = document.body.classList.contains('dark-mode') ? 'fas fa-sun' : 'fas fa-moon';
            }
        }
    }

    function handleNavbarLogout() {
        if (window.logoutUser) {
            window.logoutUser();
            return;
        }

        localStorage.removeItem('atlas_user');
        window.dispatchEvent(new Event('atlas-auth-state'));
    }

    function bindUserDropdown() {
        if (window.__atlasNavbarDropdownBound) return true;

        const avatarButton = document.getElementById('user-avatar-button');
        const menu = document.getElementById('user-dropdown-menu');
        const userNav = document.getElementById('user-nav');

        if (!avatarButton || !menu || !userNav) return false;

        avatarButton.addEventListener('click', (event) => {
            event.stopPropagation();
            const expanded = avatarButton.getAttribute('aria-expanded') === 'true';
            const nextExpanded = !expanded;
            avatarButton.setAttribute('aria-expanded', String(nextExpanded));
            menu.setAttribute('aria-hidden', String(!nextExpanded));
            userNav.classList.toggle('is-open', nextExpanded);
        });

        document.addEventListener('click', (event) => {
            if (!userNav.contains(event.target)) {
                avatarButton.setAttribute('aria-expanded', 'false');
                menu.setAttribute('aria-hidden', 'true');
                userNav.classList.remove('is-open');
            }
        });

        window.__atlasNavbarDropdownBound = true;
        return true;

        avatarButton.addEventListener('click', (event) => {
            event.stopPropagation();
            const expanded = avatarButton.getAttribute('aria-expanded') === 'true';
            const nextExpanded = !expanded;
            avatarButton.setAttribute('aria-expanded', String(nextExpanded));
            menu.setAttribute('aria-hidden', String(!nextExpanded));
            userNav.classList.toggle('is-open', nextExpanded);
        });

        document.addEventListener('click', (event) => {
            if (!userNav.contains(event.target)) {
                avatarButton.setAttribute('aria-expanded', 'false');
                menu.setAttribute('aria-hidden', 'true');
                userNav.classList.remove('is-open');
            }
        });
    }

    function ensureSiteFavicon() {
        let favicon = document.querySelector('link[rel~="icon"]');
        if (!favicon) {
            favicon = document.createElement('link');
            favicon.rel = 'icon';
            document.head.appendChild(favicon);
        }
        favicon.type = 'image/png';
        favicon.href = 'asset/try3.png';
    }

    function initSharedNavbar() {
        if (window.__atlasNavbarInitialized) return;
        window.__atlasNavbarInitialized = true;

        ensureSiteFavicon();
        renderSharedNavbar();
        const header = document.querySelector('.main-header');
        const mobileMenuBtn = document.querySelector('.mobile-menu-toggle');
        const navMenu = document.querySelector('.nav-menu');

        syncTheme();

        window.addEventListener('scroll', () => {
            if (!header) return;
            if (window.scrollY > 50) {
                header.classList.add('sticky');
            } else {
                header.classList.remove('sticky');
            }
        });

        // Ensure initial nav/button state is consistent (force-closed)
        const initialNav = document.querySelector('.nav-menu');
        const initialBtn = document.querySelector('.mobile-menu-toggle');
        if (initialNav) initialNav.classList.remove('active');
        if (initialBtn) {
            initialBtn.classList.remove('is-active');
            initialBtn.setAttribute('aria-expanded', 'false');
            const _icon = initialBtn.querySelector('i');
            if (_icon) {
                _icon.classList.remove('fa-times');
                _icon.classList.add('fa-bars');
            }
        }

        const toggleMobileMenu = () => {
            const liveBtn = document.querySelector('.mobile-menu-toggle');
            const liveNav = document.querySelector('.nav-menu');
            if (!liveBtn || !liveNav) return;

            const isActive = liveNav.classList.toggle('active');
            // Debug: log toggle events for troubleshooting in browsers
            try { console.debug('atlas:toggleMobileMenu', {isActive, right: liveNav.style.right, navClass: liveNav.className}); } catch (e) {}
            // Ensure inline position matches state (defensive against other CSS/inline overrides)
            try { liveNav.style.right = isActive ? '0' : '-100%'; } catch (e) {}

            liveBtn.classList.toggle('is-active', isActive);
            liveBtn.setAttribute('aria-expanded', String(isActive));
            const icon = liveBtn.querySelector('i');
            if (icon) {
                icon.classList.toggle('fa-bars', !isActive);
                icon.classList.toggle('fa-times', isActive);
            }

            if (!isActive) {
                document.body.classList.remove('menu-panel-open');
                closeMegaMenus();
            }
        };

        let mobileMenuHistoryOpen = false;

        const closeMobileMenu = (restoreHistory = true) => {
            const liveBtn = document.querySelector('.mobile-menu-toggle');
            const liveNav = document.querySelector('.nav-menu');
            if (!liveNav) return;
            const wasOpen = liveNav.classList.contains('active');
            liveNav.classList.remove('active');
            if (liveBtn) {
                liveBtn.classList.remove('is-active');
                liveBtn.setAttribute('aria-expanded', 'false');
                const icon = liveBtn.querySelector('i');
                if (icon) { icon.classList.remove('fa-times'); icon.classList.add('fa-bars'); }
            }
            document.body.classList.remove('menu-panel-open');
            closeMegaMenus();
            if (restoreHistory && wasOpen && mobileMenuHistoryOpen && history.state?.atlasMobileMenu) {
                mobileMenuHistoryOpen = false;
                history.back();
            } else {
                mobileMenuHistoryOpen = false;
            }
        };

        const openMobileMenu = () => {
            const liveBtn = document.querySelector('.mobile-menu-toggle');
            const liveNav = document.querySelector('.nav-menu');
            if (!liveBtn || !liveNav) return;
            if (!liveNav.classList.contains('active')) {
                liveNav.classList.add('active');
                liveBtn.classList.add('is-active');
                liveBtn.setAttribute('aria-expanded', 'true');
                const icon = liveBtn.querySelector('i');
                if (icon) { icon.classList.remove('fa-bars'); icon.classList.add('fa-times'); }
                document.body.classList.add('menu-panel-open');
                if (!history.state?.atlasMobileMenu) {
                    history.pushState({ ...(history.state || {}), atlasMobileMenu: true }, '', window.location.href);
                    mobileMenuHistoryOpen = true;
                }
            }
        };

        mobileMenuBtn?.addEventListener('click', () => {
            const liveNav = document.querySelector('.nav-menu');
            if (liveNav?.classList.contains('active')) closeMobileMenu(true);
            else openMobileMenu();
        });

        // Close when tapping anywhere outside the mobile drawer.
        document.addEventListener('click', (event) => {
            if (window.innerWidth > 768) return;
            const liveNav = document.querySelector('.nav-menu');
            const liveBtn = document.querySelector('.mobile-menu-toggle');
            if (!liveNav?.classList.contains('active')) return;
            if (!liveNav.contains(event.target) && !liveBtn?.contains(event.target)) {
                closeMobileMenu(true);
            }
        });

        // Android/iOS back closes the open drawer instead of leaving the page.
        window.addEventListener('popstate', () => {
            const liveNav = document.querySelector('.nav-menu');
            if (liveNav?.classList.contains('active')) closeMobileMenu(false);
            mobileMenuHistoryOpen = false;
        });

        // Escape also closes the drawer without navigating away.
        document.addEventListener('keydown', (event) => {
            if (event.key !== 'Escape' || window.innerWidth > 768) return;
            const liveNav = document.querySelector('.nav-menu');
            if (liveNav?.classList.contains('active')) closeMobileMenu(true);
        });

        const closeMegaMenus = () => {
            document.querySelectorAll('.nav-menu .has-mega').forEach((item) => {
                item.classList.remove('open');
                item.querySelector('.mega-toggle')?.setAttribute('aria-expanded', 'false');
            });
            document.body.classList.remove('menu-panel-open');
        };

        const toggleMegaMenu = (trigger, event) => {
            event.preventDefault();
            const megaItem = trigger.closest('.has-mega');
            const megaToggle = megaItem?.querySelector('.mega-toggle');
            const expanded = megaToggle?.getAttribute('aria-expanded') === 'true';

            closeMegaMenus();
            if (!expanded && megaItem && megaToggle) {
                megaToggle.setAttribute('aria-expanded', 'true');
                megaItem.classList.add('open');
                if (window.innerWidth <= 768) document.body.classList.add('menu-panel-open');
            }
        };

        document.querySelectorAll('.nav-menu .has-mega .mega-toggle, .nav-menu .has-mega .mega-link').forEach((trigger) => {
            trigger.addEventListener('click', (event) => toggleMegaMenu(trigger, event));
        });

        document.addEventListener('click', (event) => {
            const openMega = document.querySelector('.nav-menu .has-mega.open');
            if (openMega && !openMega.contains(event.target)) closeMegaMenus();
        });

        document.querySelector('#dark-mode-toggle')?.addEventListener('click', () => {
            document.body.classList.toggle('dark-mode');
            const theme = document.body.classList.contains('dark-mode') ? 'dark' : 'light';
            localStorage.setItem('theme', theme);
            syncTheme();
        });

        bindUserDropdown();
        document.getElementById('logout-btn')?.addEventListener('click', handleNavbarLogout);
        document.getElementById('logout-menu-btn')?.addEventListener('click', handleNavbarLogout);

        window.addEventListener('atlas-auth-state', () => {
            syncAuthNavbarState();
            bindUserDropdown();
        });

        window.addEventListener('storage', (event) => {
            if (event.key === 'atlas_user' || !event.key) {
                syncAuthNavbarState();
            }
        });
    }

    window.initSharedNavbar = initSharedNavbar;
    window.initNavigation = initSharedNavbar;
    window.initDarkMode = initSharedNavbar;
    window.initUserDropdown = bindUserDropdown;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initSharedNavbar);
    } else {
        initSharedNavbar();
    }
})();
