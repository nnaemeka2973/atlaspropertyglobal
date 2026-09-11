/**
 * Atlas Property Group - Hero Slider
 * Principal Frontend Engineer
 */

class HeroSlider {
    constructor() {
        this.slides = document.querySelectorAll('.slide');
        this.slideWrapper = document.querySelector('.slides-wrapper');
        this.indicators = document.querySelector('.slider-indicators');
        this.currentIndex = 0;
        this.interval = 6500;
        this.init();
    }

    init() {
        if (this.slides.length === 0 || !this.slideWrapper) return;
        if (this.indicators) {
            this.slides.forEach((_, index) => {
                const button = document.createElement('button');
                button.setAttribute('aria-label', `Slide ${index + 1}`);
                button.addEventListener('click', () => this.goToSlide(index));
                this.indicators.appendChild(button);
            });
            this.updateIndicators();
        }

        // Ensure aria-hidden is accurate
        this.slides.forEach((s, i) => {
            s.setAttribute('aria-hidden', i === this.currentIndex ? 'false' : 'true');
            if (i === this.currentIndex) s.classList.add('zoom-out');
        });
        // Auto slide
        this.timer = setInterval(() => this.nextSlide(), this.interval);
    }

    nextSlide() {
        this.goToSlide((this.currentIndex + 1) % this.slides.length);
    }

    goToSlide(index) {
        if (index === this.currentIndex) return;

        this.slides[this.currentIndex].classList.remove('active');
        this.slides[this.currentIndex].classList.remove('zoom-in', 'zoom-out');
        this.slides[this.currentIndex].setAttribute('aria-hidden', 'true');

        this.currentIndex = index;

        this.slides[this.currentIndex].classList.add('active');
        this.slides[this.currentIndex].classList.add(index % 2 === 0 ? 'zoom-out' : 'zoom-in');
        this.slides[this.currentIndex].setAttribute('aria-hidden', 'false');
        this.updateIndicators();

        clearInterval(this.timer);
        this.timer = setInterval(() => this.nextSlide(), this.interval);
    }

    updateIndicators() {
        if (!this.indicators) return;
        const buttons = this.indicators.querySelectorAll('button');
        buttons.forEach((btn, idx) => btn.classList.toggle('active', idx === this.currentIndex));
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new HeroSlider();
});