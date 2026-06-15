// ─────────────────────────────────────────────────────────
//  MisterHk Portfolio
//  Alexis Morille 
//
//  script.js 
// ─────────────────────────────────────────────────────────

const portfolioGrid = document.getElementById("portfolioGrid");
const filtersEl = document.getElementById("filters");
const globalTags = document.getElementById("globalTags");
const galleryGrid = document.getElementById("galleryGrid");

let projects = [];
let galleryData = [];
let activeFilter = "all";

const CARD_INTERVAL = 1500;
const MODAL_INTERVAL = 2500;

// NEW: auto slideshow system
const AUTO_INTERVAL = 3000;
const OFFSET_INTERVAL = 500;

const GLOW_MIN = 0.1;
const GLOW_MAX = 0.35;
const GLOW_DECAY = 0.025;
const GLOW_IDLE_DELAY = 250;

// store auto intervals per card
const autoSlides = new Map();

// ─────────────────────────────────────────────────────────
// APP
// ─────────────────────────────────────────────────────────

function initApp() {

    Promise.all([
        fetch("portfolio.json").then(r => r.json()),
        fetch("gallery.json").then(r => r.json()),
    ]).then(([portfolioData, gallery]) => {

        projects = portfolioData;
        galleryData = gallery;

        const tagSet = new Set(projects.flatMap(p => p.tags));
        const tags = [...tagSet];

        renderFilters(tags);
        renderProjects();
        renderGlobalTags(tags);
        renderGallery();

        initCinematicReveal();
        initNavigationObserver();

    });

    initDirectionalGlow();
}

initApp();

// ─────────────────────────────────────────────────────────
// FILTERS
// ─────────────────────────────────────────────────────────

function renderFilters(tags) {

    filtersEl.innerHTML = "";

    ["All", ...tags].forEach(tag => {

        const el = document.createElement("button");

        el.className = "filter" + (tag === "All" ? " active" : "");
        el.textContent = tag;

        el.setAttribute("type", "button");

        el.addEventListener("click", () => {

            activeFilter = tag === "All" ? "all" : tag;

            updateFilterUI();
            renderProjects();

        });

        filtersEl.appendChild(el);
    });
}

function updateFilterUI() {

    filtersEl.querySelectorAll(".filter").forEach(el => {

        const isActive =
            (activeFilter === "all" && el.textContent === "All") ||
            el.textContent === activeFilter;

        el.classList.toggle("active", isActive);
    });
}

// ─────────────────────────────────────────────────────────
// PROJECTS
// ─────────────────────────────────────────────────────────

function renderProjects() {

    portfolioGrid.innerHTML = "";

    const visible = activeFilter === "all"
        ? projects
        : projects.filter(p => p.tags.includes(activeFilter));

    visible.forEach((project, projectIndex) => {

        const card = buildProjectCard(project, projectIndex);
        portfolioGrid.appendChild(card);

    });
}

function buildProjectCard(project, projectIndexFallback) {

    const card = document.createElement("div");

    card.className = "project-card";
    card.tabIndex = 0;

    card.setAttribute("role", "button");
    card.setAttribute("aria-label", `Open ${project.title}`);

    const imageBox = document.createElement("div");
    imageBox.className = "project-image";

    let imageIndex = 0;
    let hoverSlideshow = null;
    let autoSlideshow = null;

    const imgs = project.images.map((src, i) => {

        const img = document.createElement("img");

        img.src = src;
        img.alt = `${project.title} screenshot ${i + 1}`;
        img.loading = "lazy";

        if (i === 0) img.classList.add("active");

        imageBox.appendChild(img);

        return img;
    });

    // ─────────────────────────────────────────────
    // AUTO ROTATION (desynced per card)
    // ─────────────────────────────────────────────

    function startAutoRotation() {

        if (imgs.length <= 1) return;

        const offset = projectIndexFallback * OFFSET_INTERVAL;

        setTimeout(() => {

            autoSlideshow = setInterval(() => {

                if (hoverSlideshow) return;

                imgs[imageIndex].classList.remove("active");

                imageIndex = (imageIndex + 1) % imgs.length;

                imgs[imageIndex].classList.add("active");

            }, AUTO_INTERVAL);

            autoSlides.set(card, autoSlideshow);

        }, offset);
    }

    startAutoRotation();

    // ─────────────────────────────────────────────
    // HOVER ROTATION (faster, overrides auto)
    // ─────────────────────────────────────────────

    card.addEventListener("mouseenter", () => {

        if (imgs.length <= 1 || hoverSlideshow) return;

        clearInterval(autoSlideshow);

        hoverSlideshow = setInterval(() => {

            imgs[imageIndex].classList.remove("active");

            imageIndex = (imageIndex + 1) % imgs.length;

            imgs[imageIndex].classList.add("active");

        }, CARD_INTERVAL);
    });

    card.addEventListener("mouseleave", () => {

        clearInterval(hoverSlideshow);
        hoverSlideshow = null;

        startAutoRotation();
    });

    // ─────────────────────────────────────────────
    // TOUCH AUTO (existing behavior)
    // ─────────────────────────────────────────────

    const prefersTouch = window.matchMedia("(hover: none)").matches;

    if (prefersTouch && imgs.length > 1) {

        autoSlideshow = setInterval(() => {

            imgs[imageIndex].classList.remove("active");

            imageIndex = (imageIndex + 1) % imgs.length;

            imgs[imageIndex].classList.add("active");

        }, CARD_INTERVAL);
    }

    // ─────────────────────────────────────────────
    // CONTENT
    // ─────────────────────────────────────────────

    const content = document.createElement("div");
    content.className = "project-content";

    const category = document.createElement("div");
    category.className = "project-category";
    category.textContent = project.category || "";

    const title = document.createElement("h4");
    title.textContent = project.title;

    const desc = document.createElement("p");
    desc.textContent = project.description;

    content.appendChild(category);
    content.appendChild(title);
    content.appendChild(desc);

    const bottom = document.createElement("div");
    bottom.className = "project-bottom";

    if (project.links?.length) {

        const links = document.createElement("div");
        links.className = "project-links";

        project.links.forEach(link => {

            const a = document.createElement("a");

            a.href = link.url;
            a.target = "_blank";
            a.rel = "noopener noreferrer";
            a.className = "project-link";
            a.textContent = link.name;

            a.addEventListener("click", e => e.stopPropagation());

            links.appendChild(a);
        });

        bottom.appendChild(links);
    }

    bottom.appendChild(buildTags(project.tags));

    content.appendChild(bottom);

    card.appendChild(imageBox);
    card.appendChild(content);

    card.addEventListener("click", () => {
        openProjectModal(project);
    });

    card.addEventListener("keydown", e => {
        if (e.key === "Enter" || e.key === " ") {
            openProjectModal(project);
        }
    });

    return card;
}

// ─────────────────────────────────────────────────────────
// PROJECT MODAL (unchanged)
// ─────────────────────────────────────────────────────────

function openProjectModal(project) {
    let projectIndex = projects.findIndex(
        p => p.title === project.title
    );

    const overlay = document.createElement("div");
    overlay.className = "lightbox";

    const modal = document.createElement("div");
    modal.className = "cinematic";

    const prevBtn = navArrow("‹", "modal-prev", () => {

        clearInterval(timer);
        closeModal();

        projectIndex =
            (projectIndex - 1 + projects.length) % projects.length;

        openProjectModal(projects[projectIndex]);
    });

    const nextBtn = navArrow("›", "modal-next", () => {

        clearInterval(timer);
        closeModal();

        projectIndex =
            (projectIndex + 1) % projects.length;

        openProjectModal(projects[projectIndex]);
    });

    const left = document.createElement("div");
    left.className = "modal-left";

    const main = document.createElement("div");
    main.className = "modal-main-image";

    let current = 0;
    let autoplay = !window.matchMedia("(hover: none)").matches;

    const images = project.images.map((src, i) => {

        const img = document.createElement("img");

        img.src = src;
        img.alt = `${project.title} image ${i + 1}`;
        img.loading = "lazy";

        if (i === 0) img.classList.add("active");

        main.appendChild(img);

        return img;
    });

    const thumbsEl = document.createElement("div");
    thumbsEl.className = "modal-thumbs";

    const thumbEls = [];

    function showImage(index) {

        images[current].classList.remove("active");
        thumbEls[current]?.classList.remove("active");

        current = index;

        images[current].classList.add("active");
        thumbEls[current]?.classList.add("active");

        const nextIndex = (current + 1) % images.length;
        new Image().src = project.images[nextIndex];
    }

    project.images.forEach((src, i) => {

        const thumb = document.createElement("div");

        thumb.className =
            "modal-thumb" + (i === 0 ? " active" : "");

        thumb.tabIndex = 0;

        const img = document.createElement("img");

        img.src = src;
        img.alt = `Thumbnail ${i + 1}`;
        img.loading = "lazy";

        thumb.appendChild(img);

        thumb.addEventListener("click", e => {
            e.stopPropagation();
            autoplay = false;
            showImage(i);
        });

        thumbsEl.appendChild(thumb);
        thumbEls.push(thumb);
    });

    const timer = setInterval(() => {

        if (autoplay && images.length > 1) {
            showImage((current + 1) % images.length);
        }

    }, MODAL_INTERVAL);

    enableSwipe(
        main,
        () => showImage((current + 1) % images.length),
        () => showImage((current - 1 + images.length) % images.length)
    );


    const right = document.createElement("div");
    right.className = "modal-right";

    const h2 = document.createElement("h2");
    h2.textContent = project.title;

    const desc = document.createElement("p");
    desc.textContent = project.description;

    left.appendChild(main);

    modal.appendChild(left);
    modal.appendChild(right);
    modal.appendChild(thumbsEl);


    right.appendChild(h2);
    right.appendChild(desc);

    if (project.links?.length) {

        const links = document.createElement("div");
        links.className = "project-links";

        project.links.forEach(link => {

            const a = document.createElement("a");

            a.href = link.url;
            a.target = "_blank";
            a.rel = "noopener noreferrer";
            a.className = "project-link";
            a.textContent = link.name;

            links.appendChild(a);
        });

        right.appendChild(links);
    }

    right.appendChild(buildTags(project.tags));

    modal.appendChild(left);
    modal.appendChild(right);

    overlay.appendChild(modal);
    overlay.appendChild(prevBtn);
    overlay.appendChild(nextBtn);

    document.body.appendChild(overlay);

    function closeModal() {
        clearInterval(timer);
        overlay.remove();
        document.removeEventListener("keydown", handleKey);
    }

    overlay.addEventListener("click", e => {
        if (e.target === overlay) closeModal();
    });

    function handleKey(e) {
        if (e.key === "Escape") closeModal();
        else if (e.key === "ArrowRight") nextBtn.click();
        else if (e.key === "ArrowLeft") prevBtn.click();
    }

    document.addEventListener("keydown", handleKey);
}

// ─────────────────────────────────────────────────────────
// GALLERY (unchanged except caption already fixed earlier)
// ─────────────────────────────────────────────────────────

function renderGallery() {

    galleryGrid.innerHTML = "";

    galleryData.forEach((item, i) => {

        const div = document.createElement("div");

        div.className = "gallery-item";
        div.tabIndex = 0;

        const img = document.createElement("img");

        img.src = item.src;
        img.alt = item.alt || "";

        div.appendChild(img);

        div.addEventListener("click", () => {
            openGalleryModal(i);
        });

        div.addEventListener("keydown", e => {
            if (e.key === "Enter" || e.key === " ") {
                openGalleryModal(i);
            }
        });

        galleryGrid.appendChild(div);
    });
}

function openGalleryModal(startIndex) {

    let index = startIndex;

    const overlay = document.createElement("div");
    overlay.className = "lightbox";

    const modal = document.createElement("div");
    modal.className = "gallery-modal";

    const content = document.createElement("div");
    content.className = "gallery-modal-content";

    const img = document.createElement("img");

    const info = document.createElement("div");
    info.className = "gallery-info";

    const title = document.createElement("h3");
    const desc = document.createElement("p");

    info.appendChild(title);
    info.appendChild(desc);

    function show(i) {

        index = (i + galleryData.length) % galleryData.length;
        const item = galleryData[index];

        img.src = item.src;
        img.alt = item.title || "Gallery image";

        title.textContent = item.title ?? "";
        desc.textContent = item.description ?? "";
    }

    show(index);

    const prev = navArrow("‹", "modal-prev", () => show(index - 1));
    const next = navArrow("›", "modal-next", () => show(index + 1));

    content.appendChild(img);
    content.appendChild(info);

    modal.appendChild(content);
    overlay.appendChild(modal);
    overlay.appendChild(prev);
    overlay.appendChild(next);

    document.body.appendChild(overlay);

    function closeModal() {
        overlay.remove();
        document.removeEventListener("keydown", handleKey);
    }

    overlay.addEventListener("click", e => {
        if (e.target === overlay) closeModal();
    });

    function handleKey(e) {
        if (e.key === "Escape") closeModal();
        else if (e.key === "ArrowRight") show(index + 1);
        else if (e.key === "ArrowLeft") show(index - 1);
    }

    document.addEventListener("keydown", handleKey);
}

// ─────────────────────────────────────────────────────────
// HELPERS (unchanged)
// ─────────────────────────────────────────────────────────

function renderGlobalTags(tags) {
    globalTags.innerHTML = "";
    globalTags.appendChild(buildTags(tags));
}

function buildTags(tags) {

    const container = document.createElement("div");
    container.className = "tags";

    tags.forEach(tag => {

        const el = document.createElement("span");
        el.className = "tag";
        el.textContent = tag;

        container.appendChild(el);
    });

    return container;
}

function navArrow(symbol, className, onClick) {

    const el = document.createElement("div");

    el.className = `modal-nav ${className}`;
    el.innerHTML = symbol;
    el.tabIndex = 0;

    el.addEventListener("click", e => {
        e.stopPropagation();
        onClick();
    });

    return el;
}

function enableSwipe(el, onLeft, onRight) {

    let startX = 0;

    el.addEventListener("touchstart", e => {
        startX = e.touches[0].clientX;
    }, { passive: true });

    el.addEventListener("touchend", e => {

        const endX = e.changedTouches[0].clientX;
        const dx = endX - startX;

        if (Math.abs(dx) < 50) return;

        if (dx < 0) onLeft();
        else onRight();

    }, { passive: true });
}

// ─────────────────────────────────────────────────────────
// CINEMATIC + NAV + GLOW (unchanged)
// ─────────────────────────────────────────────────────────

function initCinematicReveal() {
    const items = document.querySelectorAll("[data-animate]");

    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add("in-view");
            } else {
                entry.target.classList.remove("in-view");
            }
        });
    }, {
        threshold: 0.12,
        rootMargin: "0px 0px -10% 0px"
    });

    items.forEach(el => observer.observe(el));
}

function initNavigationObserver() {

    const sections = [...document.querySelectorAll("section[id]")];

    const desktopLinks = document.querySelectorAll(".nav-links a");
    const mobileLinks = document.querySelectorAll(".bottom-nav a");

    const allLinks = [...desktopLinks, ...mobileLinks];

    const observer = new IntersectionObserver(entries => {

        entries.forEach(entry => {

            if (!entry.isIntersecting) return;

            const id = entry.target.id;

            allLinks.forEach(link => link.classList.remove("active"));

            allLinks.forEach(link => {
                if (link.getAttribute("href") === `#${id}`) {
                    link.classList.add("active");
                }
            });
        });

    }, { threshold: 0.45 });

    sections.forEach(section => observer.observe(section));
}

function initDirectionalGlow() {

    let lastY = window.scrollY;
    let red = GLOW_MIN;
    let cyan = GLOW_MIN;

    let targetRed = GLOW_MIN;
    let targetCyan = GLOW_MIN;

    let idleTimer = null;

    function clamp(v, min, max) {
        return Math.max(min, Math.min(max, v));
    }

    function lerp(a, b, t) {
        return a + (b - a) * t;
    }

    function resetToNeutral() {
        targetRed = GLOW_MIN;
        targetCyan = GLOW_MIN;
    }

    window.addEventListener("scroll", () => {

        const y = window.scrollY;
        const delta = y - lastY;

        const strength = Math.min(Math.abs(delta) * 0.003, 0.1);

        if (delta > 0) {
            targetCyan = clamp(targetCyan + strength, GLOW_MIN, GLOW_MAX);
            targetRed = clamp(targetRed - strength * 0.6, 0.08, 0.2);
        } else if (delta < 0) {
            targetRed = clamp(targetRed + strength, GLOW_MIN, GLOW_MAX);
            targetCyan = clamp(targetCyan - strength * 0.6, 0.08, 0.2);
        }

        lastY = y;

        clearTimeout(idleTimer);

        idleTimer = setTimeout(resetToNeutral, GLOW_IDLE_DELAY);

    }, { passive: true });

    function animate() {

        red = lerp(red, targetRed, GLOW_DECAY);
        cyan = lerp(cyan, targetCyan, GLOW_DECAY);

        document.documentElement.style.setProperty("--glow-red", red.toFixed(3));
        document.documentElement.style.setProperty("--glow-cyan", cyan.toFixed(3));

        requestAnimationFrame(animate);
    }

    animate();
}