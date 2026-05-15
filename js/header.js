(function() {
    const headerWrapper = document.getElementById('headerWrapper');
    const mainHeader = document.getElementById('mainHeader');
    const menuToggle = document.getElementById('mobile-menu');
    const navMenu = document.getElementById('navMenu');
    const navTriggers = document.querySelectorAll('.nav-trigger');

    // Mobile Menu Main Toggle
    menuToggle.addEventListener('click', () => {
        const isActive = menuToggle.classList.toggle('is-active');
        navMenu.classList.toggle('active');
        document.body.style.overflow = isActive ? 'hidden' : ''; // Prevent double scroll
    });

    // Accessible Dropdown & Mobile Accordion Engine
    navTriggers.forEach(trigger => {
        trigger.addEventListener('click', (e) => {
            const isMobile = window.innerWidth <= 1024;
            const dropdown = trigger.nextElementSibling;
            const isExpanded = trigger.getAttribute('aria-expanded') === 'true';

            if (isMobile) {
                e.preventDefault();
                
                // Close other accordions for clean UX
                navTriggers.forEach(t => {
                    if (t !== trigger) {
                        t.setAttribute('aria-expanded', 'false');
                        t.nextElementSibling.classList.remove('open');
                    }
                });

                // Toggle the clicked one
                trigger.setAttribute('aria-expanded', !isExpanded);
                dropdown.classList.toggle('open');
            }
        });

        // Desktop keyboard a11y (Space/Enter to focus)
        trigger.addEventListener('keydown', (e) => {
            if (window.innerWidth > 1024 && (e.key === 'Enter' || e.key === ' ')) {
                e.preventDefault();
                trigger.parentElement.focus(); // Triggers CSS :focus-within
            }
        });
    });

    // Clean up menu on link click (for one-page routing or jumping)
    document.querySelectorAll('.dropdown-content a, .nav-item').forEach(link => {
        link.addEventListener('click', () => {
            if (window.innerWidth <= 1024) {
                menuToggle.classList.remove('is-active');
                navMenu.classList.remove('active');
                document.body.style.overflow = '';
                
                // Reset internal accordions
                document.querySelectorAll('.dropdown-content').forEach(d => d.classList.remove('open'));
                navTriggers.forEach(t => t.setAttribute('aria-expanded', 'false'));
            }
        });
    });

    // Dynamic offset layout adjustment
    function updateOffset() {
        if(headerWrapper) {
            document.body.style.paddingTop = headerWrapper.offsetHeight + 'px';
        }
    }

    window.addEventListener('load', updateOffset);
    
    // Resize handler to clean up states when shifting desktop <-> mobile
    window.addEventListener('resize', () => {
        updateOffset();
        if (window.innerWidth > 1024) {
            menuToggle.classList.remove('is-active');
            navMenu.classList.remove('active');
            document.body.style.overflow = '';
            document.querySelectorAll('.dropdown-content').forEach(d => d.classList.remove('open'));
            navTriggers.forEach(t => t.setAttribute('aria-expanded', 'false'));
        }
    });

    // Shrink header on scroll
    window.addEventListener('scroll', () => {
        if (window.scrollY > 40) {
            mainHeader.style.padding = '8px 5%'; 
        } else {
            mainHeader.style.padding = '15px 5%';
        }
        updateOffset(); 
    });

})();
