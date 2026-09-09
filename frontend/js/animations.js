/**
 * Atlas Property Group - Animation Engine
 * Senior UI/UX Designer
 */

const animateOnScroll = () => {
    const elements = document.querySelectorAll('.property-card, .service-card-large, .reveal');
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = "1";
                entry.target.style.transform = "translateY(0)";
                entry.target.classList.add('active');
            }
        });
    }, { threshold: 0.1 });

    elements.forEach(el => {
        el.style.opacity = "0";
        el.style.transform = "translateY(30px)";
        el.style.transition = "all 0.8s cubic-bezier(0.165, 0.84, 0.44, 1)";
        observer.observe(el);
    });
};

document.addEventListener('DOMContentLoaded', animateOnScroll);