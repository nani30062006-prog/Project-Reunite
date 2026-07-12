// ==============================================
// PROJECT REUNITE — LANDING PAGE SCRIPT
// ==============================================

document.addEventListener('DOMContentLoaded', () => {

    // --- Count-Up Animation for Stats ---
    const statNumbers = document.querySelectorAll('.stats__number[data-target]');
    let statsAnimated = false;

    const statsObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting && !statsAnimated) {
                statsAnimated = true;
                statNumbers.forEach(el => {
                    const target = parseInt(el.dataset.target);
                    animateCounter(el, target, 2200);
                });
            }
        });
    }, { threshold: 0.3 });

    const statsSection = document.getElementById('stats');
    if (statsSection) {
        statsObserver.observe(statsSection);
    }


    // --- Subtle System Status Pulse ---
    const statusValues = document.querySelectorAll('.sys-status__value--ok');
    if (statusValues.length > 0) {
        setInterval(() => {
            const random = statusValues[Math.floor(Math.random() * statusValues.length)];
            random.style.opacity = '0.5';
            setTimeout(() => {
                random.style.opacity = '1';
            }, 600);
        }, 3000);
    }


    // --- Smooth Reveal on Nav Scroll ---
    const nav = document.getElementById('mainNav');
    let lastScroll = 0;

    window.addEventListener('scroll', () => {
        const currentScroll = window.scrollY;

        if (currentScroll > 60) {
            nav.style.background = 'rgba(17, 17, 17, 0.95)';
            nav.style.backdropFilter = 'blur(16px)';
        } else {
            nav.style.background = 'var(--bg-secondary)';
            nav.style.backdropFilter = 'blur(12px)';
        }

        lastScroll = currentScroll;
    }, { passive: true });

});
