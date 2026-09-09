(function(){
    'use strict';

    const FOOTER_ROOT_SELECTOR = '[data-shared-footer], #shared-footer-root';
    const sharedFooterMarkup = `
        <footer class="main-footer shared-footer" data-shared="true">
        <div class="container">
            <div class="footer-grid">
                <div class="footer-info">
                    <a href="index.html" class="footer-logo">
                        <img src="asset/try3.png" alt="Atlas Property Group">
                        <!-- <div>
                            <span class="footer-logo-text">ATLAS</span>
                            <span class="footer-logo-sub">PROPERTY GROUP</span>
                        </div> -->
                    </a>
                    <p>Setting the gold standard in luxury real estate and international investment since 1998. Building tomorrow's landmarks with precision, discretion, and global reach.</p>
                    <div class="social-links">
                        <a href="#"><i class="fab fa-linkedin-in"></i></a>
                        <a href="#"><i class="fab fa-instagram"></i></a>
                        <a href="#"><i class="fab fa-facebook-f"></i></a>
                        <a href="#"><i class="fab fa-twitter"></i></a>
                    </div>
                </div>
                <div class="footer-links">
                    <h4>Company</h4>
                    <ul>
                        <li><a href="about.html">About Us</a></li>
                        <li><a href="services.html">Services</a></li>
                        <li><a href="agents.html">Our Team</a></li>
                        <li><a href="blog.html">Journal</a></li>
                    </ul>
                </div>
                <div class="footer-links">
                    <h4>Support</h4>
                    <ul>
                        <li><a href="faq.html">FAQ</a></li>
                        <li><a href="privacy.html">Privacy Policy</a></li>
                        <li><a href="terms.html">Terms of Service</a></li>
                        <li><a href="contact.html">Contact Support</a></li>
                    </ul>
                </div>
                <div class="footer-contact">
                    <h4>Contact</h4>
                    <ul>
                        <li><i class="fas fa-map-marker-alt"></i> 1395 Brickell Avenue, Suite 800
Miami, FL 33131, United States
</li>
                        <li><i class="fas fa-phone"></i> +1 (334) 697-1225</li>
                        <li><i class="fas fa-envelope"></i> contact@atlaspropertyglobal.com</li>
                    </ul>
                </div>
            </div>
            <div class="footer-bottom">
                <small>© ${new Date().getFullYear()} Atlas Property Group. All rights reserved.</small>
            </div>
        </div>
    </footer>
    `;

    function ensureAssistantScript() {
        if (document.querySelector('script[src*="ai-assistant.js"]')) return;
        const assistantScript = document.createElement('script');
        assistantScript.src = 'js/ai-assistant.js';
        assistantScript.async = false;
        document.body.appendChild(assistantScript);
    }

    function replaceOrInjectFooter() {
        const existingFooter = document.querySelector('footer');
        // If footer exists and is our shared footer, nothing to do
        if (existingFooter && existingFooter.classList.contains('main-footer') && existingFooter.dataset.shared === 'true') return;

        const sharedFooter = sharedFooterMarkup.replace('class="main-footer shared-footer"', 'class="main-footer shared-footer" data-shared="true"');

        // Replace existing footer if present.
        if (existingFooter) {
            existingFooter.outerHTML = sharedFooter;
            ensureFooterStyles();
            return;
        }

        // Inject into a root placeholder if available.
        const root = document.querySelector(FOOTER_ROOT_SELECTOR);
        if (root) {
            root.innerHTML = sharedFooter;
            ensureFooterStyles();
            return;
        }

        // Fallback: append shared footer to the body if no footer exists.
        const body = document.querySelector('body');
        if (body) {
            body.insertAdjacentHTML('beforeend', sharedFooter);
            ensureFooterStyles();
            ensureAssistantScript();
        }
    }

    function ensureFooterStyles() {
        if (document.getElementById('__shared_footer_styles')) return;
        const style = document.createElement('style');
        style.id = '__shared_footer_styles';
        style.textContent = '';
        document.head.appendChild(style);
    }

    document.addEventListener('DOMContentLoaded', () => {
        replaceOrInjectFooter();
        ensureAssistantScript();
    });
})();
