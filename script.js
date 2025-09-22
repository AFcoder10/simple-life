document.addEventListener('DOMContentLoaded', function() {

    // Smooth scrolling for internal links
    const navLinks = document.querySelectorAll('nav a[href^="#"], .cta-button[href^="#"]');

    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();

            let targetId = this.getAttribute('href');
            let targetElement = document.querySelector(targetId);

            if (targetElement) {
                targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });
});