/* ============================================================
   PORTFOLIO WEBSITE — Main JavaScript
   Premium AI Engineer Portfolio
   Vanilla JS · ES6+ · No dependencies
   ============================================================ */

"use strict";

/* ────────────────────────────────────────────────────────────
   0. UTILITY HELPERS
   ──────────────────────────────────────────────────────────── */

/**
 * Shorthand selectors
 */
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

/**
 * Ease-out cubic easing function  t ∈ [0,1]
 */
const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

/**
 * Linear interpolation
 */
const lerp = (a, b, n) => (1 - n) * a + n * b;

/**
 * Clamp value between min and max
 */
const clamp = (val, min, max) => Math.min(Math.max(val, min), max);

/**
 * Detect if the device supports hover (i.e. desktop)
 */
const isDesktop = () => window.matchMedia("(hover: hover) and (pointer: fine)").matches;

/**
 * Throttle function — limits execution to once per `limit` ms
 */
const throttle = (fn, limit = 100) => {
  let inThrottle = false;
  return (...args) => {
    if (!inThrottle) {
      fn.apply(this, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};


/* ============================================================
   1. PRELOADER
   ============================================================ */

const Preloader = (() => {
  const MIN_DISPLAY_MS = 1500; // minimum time to show the preloader
  const startTime = Date.now();

  /**
   * Hides the preloader with a smooth fade-out after at least
   * MIN_DISPLAY_MS have elapsed since page started loading.
   */
  const hide = () => {
    const preloader = $(".preloader") || $("#preloader");
    if (!preloader) return;

    const elapsed = Date.now() - startTime;
    const remaining = Math.max(0, MIN_DISPLAY_MS - elapsed);

    setTimeout(() => {
      preloader.classList.add("loaded"); // triggers CSS fade-out
      // Remove from DOM after transition ends to free resources
      preloader.addEventListener("transitionend", () => {
        preloader.style.display = "none";
      }, { once: true });

      // Fallback removal if transitionend never fires
      setTimeout(() => {
        preloader.style.display = "none";
      }, 1200);
    }, remaining);
  };

  return { hide };
})();


/* ============================================================
   2. SMOOTH SCROLL
   ============================================================ */

const SmoothScroll = (() => {
  const NAV_HEIGHT = 80; // px — offset for fixed navigation

  /**
   * Scrolls smoothly to a target element, accounting for
   * the fixed navigation bar height.
   */
  const scrollTo = (target) => {
    const el = typeof target === "string" ? $(target) : target;
    if (!el) return;

    const top = el.getBoundingClientRect().top + window.scrollY - NAV_HEIGHT;
    window.scrollTo({ top, behavior: "smooth" });
  };

  /**
   * Attach click handlers to every anchor link that points
   * to an in-page section (href starts with #).
   */
  const init = () => {
    document.addEventListener("click", (e) => {
      const link = e.target.closest('a[href^="#"]');
      if (!link) return;

      const hash = link.getAttribute("href");
      if (hash === "#" || hash.length < 2) return;

      e.preventDefault();
      scrollTo(hash);

      // Update URL hash without jumping
      history.pushState(null, "", hash);
    });
  };

  return { init, scrollTo };
})();


/* ============================================================
   3. NAVIGATION
   ============================================================ */

const Navigation = (() => {
  let nav, hamburger, mobileMenu, navLinks;

  /**
   * Add / remove the 'scrolled' class on the nav bar when
   * the user scrolls past a threshold (triggers background change via CSS).
   */
  const handleScrollClass = () => {
    if (!nav) return;
    if (window.scrollY > 50) {
      nav.classList.add("scrolled");
    } else {
      nav.classList.remove("scrolled");
    }
  };

  /**
   * Toggle the mobile hamburger menu open / closed.
   */
  const toggleMobileMenu = () => {
    if (!hamburger || !mobileMenu) return;
    hamburger.classList.toggle("active");
    mobileMenu.classList.toggle("active");
    document.body.classList.toggle("menu-open");
  };

  /**
   * Close the mobile menu (used when a link is clicked).
   */
  const closeMobileMenu = () => {
    if (!hamburger || !mobileMenu) return;
    hamburger.classList.remove("active");
    mobileMenu.classList.remove("active");
    document.body.classList.remove("menu-open");
  };

  /**
   * Highlight the active nav link matching the given section id.
   */
  const setActive = (sectionId) => {
    navLinks.forEach((link) => {
      link.classList.remove("active");
      if (link.getAttribute("href") === `#${sectionId}`) {
        link.classList.add("active");
      }
    });
  };

  const init = () => {
    nav = $("nav") || $(".navbar") || $("header");
    hamburger = $(".hamburger") || $(".menu-toggle") || $(".nav-toggle");
    mobileMenu = $(".nav-menu") || $(".nav-links") || $(".mobile-menu");
    navLinks = $$('nav a[href^="#"], .nav-menu a[href^="#"], .nav-links a[href^="#"]');

    // Scroll class
    window.addEventListener("scroll", throttle(handleScrollClass, 50));
    handleScrollClass(); // initial check

    // Hamburger toggle
    if (hamburger) {
      hamburger.addEventListener("click", (e) => {
        e.stopPropagation();
        toggleMobileMenu();
      });
    }

    // Close mobile menu on link click
    navLinks.forEach((link) => {
      link.addEventListener("click", () => closeMobileMenu());
    });

    // Close mobile menu when clicking outside
    document.addEventListener("click", (e) => {
      if (
        mobileMenu &&
        mobileMenu.classList.contains("active") &&
        !mobileMenu.contains(e.target) &&
        !hamburger.contains(e.target)
      ) {
        closeMobileMenu();
      }
    });
  };

  return { init, setActive };
})();


/* ============================================================
   4. TYPING ANIMATION
   ============================================================ */

const TypingAnimation = (() => {
  const TITLES = ["AI Engineer", "Software Developer", "Data Scientist", "ML Researcher"];
  const TYPE_SPEED = 100;   // ms per character when typing
  const DELETE_SPEED = 60;  // ms per character when deleting
  const PAUSE_AFTER_TYPE = 2000; // ms to pause after a word is fully typed
  const PAUSE_AFTER_DELETE = 500; // ms to pause after a word is fully deleted

  let el = null;
  let titleIndex = 0;
  let charIndex = 0;
  let isDeleting = false;

  /**
   * Core tick — types or deletes one character, then schedules
   * the next tick at the appropriate speed.
   */
  const tick = () => {
    if (!el) return;

    const currentTitle = TITLES[titleIndex];

    if (!isDeleting) {
      // Typing forward
      charIndex++;
      el.textContent = currentTitle.substring(0, charIndex);

      if (charIndex === currentTitle.length) {
        // Finished typing — pause, then start deleting
        isDeleting = true;
        setTimeout(tick, PAUSE_AFTER_TYPE);
        return;
      }
      setTimeout(tick, TYPE_SPEED);
    } else {
      // Deleting backward
      charIndex--;
      el.textContent = currentTitle.substring(0, charIndex);

      if (charIndex === 0) {
        // Finished deleting — move to next title
        isDeleting = false;
        titleIndex = (titleIndex + 1) % TITLES.length;
        setTimeout(tick, PAUSE_AFTER_DELETE);
        return;
      }
      setTimeout(tick, DELETE_SPEED);
    }
  };

  const init = () => {
    el = $(".typing-text");
    if (!el) return;

    // Clear any placeholder text
    el.textContent = "";
    charIndex = 0;
    titleIndex = 0;
    isDeleting = false;

    // Start the typing loop
    setTimeout(tick, PAUSE_AFTER_DELETE);
  };

  return { init };
})();


/* ============================================================
   5. PARTICLE BACKGROUND
   ============================================================ */

const ParticleBackground = (() => {
  const SHAPE_COUNT = 16;
  const shapes = [];
  const types = ["cube", "pyramid", "octahedron"];

  let canvas, ctx;
  let animationId = null;
  let width, height;

  let mouseX = 0, mouseY = 0;
  let targetMouseX = 0, targetMouseY = 0;

  // Vertices templates
  const cubeVertices = [
    {x: -1, y: -1, z: -1}, {x: 1, y: -1, z: -1}, {x: 1, y: 1, z: -1}, {x: -1, y: 1, z: -1},
    {x: -1, y: -1, z: 1},  {x: 1, y: -1, z: 1},  {x: 1, y: 1, z: 1},  {x: -1, y: 1, z: 1}
  ];
  const cubeEdges = [
    [0, 1], [1, 2], [2, 3], [3, 0], // front
    [4, 5], [5, 6], [6, 7], [7, 4], // back
    [0, 4], [1, 5], [2, 6], [3, 7]  // links
  ];

  const pyrVertices = [
    {x: 0, y: -1.2, z: 0},
    {x: -1, y: 0.8, z: -0.8},
    {x: 1, y: 0.8, z: -0.8},
    {x: 0, y: 0.8, z: 1.2}
  ];
  const pyrEdges = [
    [0, 1], [0, 2], [0, 3],
    [1, 2], [2, 3], [3, 1]
  ];

  const octVertices = [
    {x: 0, y: -1.2, z: 0}, {x: 0, y: 1.2, z: 0},
    {x: -1, y: 0, z: -1},  {x: 1, y: 0, z: -1},
    {x: 1, y: 0, z: 1},    {x: -1, y: 0, z: 1}
  ];
  const octEdges = [
    [0, 2], [0, 3], [0, 4], [0, 5],
    [1, 2], [1, 3], [1, 4], [1, 5],
    [2, 3], [3, 4], [4, 5], [5, 2]
  ];

  class Shape3D {
    constructor(type, size, x, y, z) {
      this.type = type;
      this.size = size;
      this.x = x;
      this.y = y;
      this.z = z;

      this.vx = (Math.random() - 0.5) * 0.5;
      this.vy = (Math.random() - 0.5) * 0.5;
      this.vz = (Math.random() - 0.5) * 0.2;

      this.rx = Math.random() * Math.PI;
      this.ry = Math.random() * Math.PI;
      this.rz = Math.random() * Math.PI;

      this.vrx = (Math.random() - 0.5) * 0.01;
      this.vry = (Math.random() - 0.5) * 0.01;
      this.vrz = (Math.random() - 0.5) * 0.01;

      if (type === "cube") {
        this.vertices = cubeVertices;
        this.edges = cubeEdges;
      } else if (type === "pyramid") {
        this.vertices = pyrVertices;
        this.edges = pyrEdges;
      } else {
        this.vertices = octVertices;
        this.edges = octEdges;
      }
    }

    update(mx, my) {
      this.x += this.vx;
      this.y += this.vy;
      this.z += this.vz;

      const limitX = width / 2 + 100;
      const limitY = height / 2 + 100;

      if (this.x < -limitX || this.x > limitX) this.vx *= -1;
      if (this.y < -limitY || this.y > limitY) this.vy *= -1;
      if (this.z < -200 || this.z > 200) this.vz *= -1;

      this.rx += this.vrx + mx * 0.00003;
      this.ry += this.vry + my * 0.00003;
      this.rz += this.vrz;
    }

    draw() {
      const rotated = this.vertices.map((v) => {
        let x = v.x * this.size;
        let y = v.y * this.size;
        let z = v.z * this.size;

        // Rotate X
        let y1 = y * Math.cos(this.rx) - z * Math.sin(this.rx);
        let z1 = y * Math.sin(this.rx) + z * Math.cos(this.rx);

        // Rotate Y
        let x2 = x * Math.cos(this.ry) + z1 * Math.sin(this.ry);
        let z2 = -x * Math.sin(this.ry) + z1 * Math.cos(this.ry);

        // Rotate Z
        let x3 = x2 * Math.cos(this.rz) - y1 * Math.sin(this.rz);
        let y3 = x2 * Math.sin(this.rz) + y1 * Math.cos(this.rz);

        return {
          x: x3 + this.x,
          y: y3 + this.y,
          z: z2 + this.z
        };
      });

      const projected = rotated.map((r) => {
        const fov = 450;
        const scale = fov / (fov + r.z + 300);
        return {
          x: width / 2 + r.x * scale,
          y: height / 2 + r.y * scale,
          z: r.z,
          scale: scale
        };
      });

      ctx.lineWidth = 0.8;
      this.edges.forEach((e) => {
        const p1 = projected[e[0]];
        const p2 = projected[e[1]];

        if (p1.x >= 0 && p1.x <= width && p1.y >= 0 && p1.y <= height) {
          const opacity = ((p1.scale + p2.scale) / 2) * 0.28;
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);

          const grad = ctx.createLinearGradient(p1.x, p1.y, p2.x, p2.y);
          const isDark = document.body.classList.contains("dark-theme");

          if (isDark) {
            grad.addColorStop(0, "rgba(255, 255, 255, 0.03)");
            grad.addColorStop(0.5, `rgba(255, 255, 255, ${opacity * 1.8})`);
            grad.addColorStop(1, "rgba(20, 20, 20, 0.05)");
          } else {
            grad.addColorStop(0, "rgba(0, 0, 0, 0.03)");
            grad.addColorStop(0.5, `rgba(0, 0, 0, ${opacity * 1.5})`);
            grad.addColorStop(1, "rgba(230, 230, 230, 0.05)");
          }

          ctx.strokeStyle = grad;
          ctx.stroke();
        }
      });

      projected.forEach((p) => {
        const isDark = document.body.classList.contains("dark-theme");
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2 * p.scale, 0, Math.PI * 2);
        ctx.fillStyle = isDark ? `rgba(255, 255, 255, ${p.scale * 0.5})` : `rgba(0, 0, 0, ${p.scale * 0.4})`;
        ctx.fill();
      });
    }
  }

  const animate = () => {
    ctx.clearRect(0, 0, width, height);

    mouseX = lerp(mouseX, targetMouseX, 0.06);
    mouseY = lerp(mouseY, targetMouseY, 0.06);

    shapes.forEach((s) => {
      s.update(mouseX, mouseY);
      s.draw();
    });

    animationId = requestAnimationFrame(animate);
  };

  const resize = () => {
    const hero = $(".hero") || $("#hero");
    if (!hero || !canvas) return;

    width = hero.offsetWidth;
    height = hero.offsetHeight;
    canvas.width = width;
    canvas.height = height;
  };

  const init = () => {
    const hero = $(".hero") || $("#hero");
    if (!hero) return;

    canvas = document.createElement("canvas");
    canvas.id = "particle-canvas";
    canvas.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 0;
    `;

    if (getComputedStyle(hero).position === "static") {
      hero.style.position = "relative";
    }

    hero.insertBefore(canvas, hero.firstChild);
    ctx = canvas.getContext("2d");
    resize();

    window.addEventListener("mousemove", (e) => {
      targetMouseX = e.clientX - window.innerWidth / 2;
      targetMouseY = e.clientY - window.innerHeight / 2;
    });

    for (let i = 0; i < SHAPE_COUNT; i++) {
      const type = types[i % types.length];
      const size = Math.random() * 45 + 25; // 25px to 70px
      const x = (Math.random() - 0.5) * (width * 0.8);
      const y = (Math.random() - 0.5) * (height * 0.8);
      const z = (Math.random() - 0.5) * 350;
      shapes.push(new Shape3D(type, size, x, y, z));
    }

    animate();

    window.addEventListener("resize", throttle(() => {
      resize();
    }, 200));
  };

  return { init };
})();


/* ============================================================
   6. SCROLL ANIMATIONS  (data-animate)
   ============================================================ */

const ScrollAnimations = (() => {
  /**
   * Uses IntersectionObserver to fade-in and slide-up elements
   * that carry the [data-animate] attribute. Grouped siblings
   * get staggered delays based on their index.
   */
  const init = () => {
    const elements = $$("[data-animate]");
    if (elements.length === 0) return;

    // Set initial hidden state via JS (avoids flash if CSS not loaded)
    elements.forEach((el) => {
      el.style.opacity = "0";
      el.style.transform = "translateY(40px)";
      el.style.transition = "opacity 0.6s ease, transform 0.6s ease";
    });

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;

          const el = entry.target;

          // Calculate stagger delay for grouped elements
          const parent = el.parentElement;
          const siblings = parent ? $$("[data-animate]", parent) : [];
          const index = siblings.indexOf(el);
          const delay = index >= 0 ? index * 120 : 0; // 120ms stagger

          setTimeout(() => {
            el.style.opacity = "1";
            el.style.transform = "translateY(0)";
          }, delay);

          // Only animate once — unobserve after triggering
          observer.unobserve(el);
        });
      },
      {
        threshold: 0.15,
        rootMargin: "0px 0px -50px 0px",
      }
    );

    elements.forEach((el) => observer.observe(el));
  };

  return { init };
})();


/* ============================================================
   7. SKILL BAR ANIMATIONS
   ============================================================ */

const SkillBars = (() => {
  let animated = false;

  /**
   * Animate a single skill bar: fills the bar from 0% to target
   * width AND counts the percentage number up.
   */
  const animateBar = (bar, delay = 0) => {
    const percentage = parseInt(bar.dataset.percentage || bar.dataset.percent || "0", 10);
    const fill = bar.querySelector(".skill-fill, .progress-fill, .bar-fill");
    const label = bar.querySelector(".skill-percentage, .percent-label, .skill-percent");

    setTimeout(() => {
      // Animate width
      if (fill) {
        fill.style.transition = "width 1.4s ease-in-out";
        fill.style.width = `${percentage}%`;
      }

      // Animate counting number
      if (label) {
        animateCount(label, 0, percentage, 1400, "%");
      }
    }, delay);
  };

  /**
   * Count from `start` to `end` over `duration` ms, updating
   * the text content of `el` each frame.
   */
  const animateCount = (el, start, end, duration, suffix = "") => {
    const startTime = performance.now();

    const update = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const value = Math.round(start + (end - start) * easeOutCubic(progress));
      el.textContent = `${value}${suffix}`;

      if (progress < 1) {
        requestAnimationFrame(update);
      }
    };

    requestAnimationFrame(update);
  };

  const init = () => {
    const section = $(".skills") || $("#skills");
    if (!section) return;

    const bars = $$("[data-percentage], [data-percent]", section);
    if (bars.length === 0) return;

    // Set initial state — bars at 0%
    bars.forEach((bar) => {
      const fill = bar.querySelector(".skill-fill, .progress-fill, .bar-fill");
      if (fill) {
        fill.style.width = "0%";
      }
    });

    // Observe the skills section
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !animated) {
            animated = true;
            bars.forEach((bar, i) => animateBar(bar, i * 150));
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.3 }
    );

    observer.observe(section);
  };

  return { init };
})();


/* ============================================================
   8. COUNTER ANIMATION  (data-count)
   ============================================================ */

const CounterAnimation = (() => {
  /**
   * Animate stat numbers from 0 → target using easeOutCubic.
   * Target value is read from the data-count attribute.
   */
  const init = () => {
    const counters = $$("[data-count]");
    if (counters.length === 0) return;

    // Set initial text to 0
    counters.forEach((el) => {
      el.textContent = "0";
    });

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;

          const el = entry.target;
          const target = parseInt(el.dataset.count, 10);
          if (isNaN(target)) return;

          // Get optional suffix (e.g. "+", "%", "K")
          const suffix = el.dataset.suffix || "";
          const duration = 2000; // 2 seconds
          const startTime = performance.now();

          const update = (now) => {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const value = Math.round(target * easeOutCubic(progress));
            el.textContent = `${value}${suffix}`;

            if (progress < 1) {
              requestAnimationFrame(update);
            } else {
              el.textContent = `${target}${suffix}`;
            }
          };

          requestAnimationFrame(update);

          // Only animate once
          observer.unobserve(el);
        });
      },
      { threshold: 0.5 }
    );

    counters.forEach((el) => observer.observe(el));
  };

  return { init };
})();


/* ============================================================
   9. PROJECT CARD TILT EFFECT
   ============================================================ */

const ProjectCards = (() => {
  const MAX_TILT = 8; // degrees

  /**
   * On desktop: subtle 3D tilt based on mouse position.
   * On mobile: simple scale-up on touch/active.
   */
  const init = () => {
    const cards = $$(".project-card, .card");
    if (cards.length === 0) return;

    if (isDesktop()) {
      // Desktop — 3D perspective tilt
      cards.forEach((card) => {
        card.style.transition = "transform 0.15s ease";
        card.style.transformStyle = "preserve-3d";

        card.addEventListener("mousemove", (e) => {
          const rect = card.getBoundingClientRect();
          const x = e.clientX - rect.left; // mouse x within card
          const y = e.clientY - rect.top;  // mouse y within card

          // Normalise to [-1, 1]
          const normX = (x / rect.width) * 2 - 1;
          const normY = (y / rect.height) * 2 - 1;

          const tiltX = -normY * MAX_TILT; // invert Y for natural feel
          const tiltY = normX * MAX_TILT;

          card.style.transform = `perspective(800px) rotateX(${tiltX}deg) rotateY(${tiltY}deg) scale3d(1.03, 1.03, 1.03)`;
        });

        card.addEventListener("mouseleave", () => {
          card.style.transform = "perspective(800px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)";
        });
      });
    } else {
      // Mobile — simple scale effect via CSS class
      cards.forEach((card) => {
        card.style.transition = "transform 0.3s ease";

        card.addEventListener("touchstart", () => {
          card.style.transform = "scale(1.03)";
        }, { passive: true });

        card.addEventListener("touchend", () => {
          card.style.transform = "scale(1)";
        }, { passive: true });
      });
    }
  };

  return { init };
})();


/* ============================================================
   10. ACTIVE SECTION HIGHLIGHTING
   ============================================================ */

const ActiveSection = (() => {
  /**
   * Uses IntersectionObserver to track which <section> is
   * currently in view and updates the nav links accordingly.
   */
  const init = () => {
    const sections = $$("section[id]");
    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            Navigation.setActive(entry.target.id);
          }
        });
      },
      {
        // Top of section hits near the top of the viewport
        rootMargin: "-20% 0px -60% 0px",
        threshold: 0,
      }
    );

    sections.forEach((section) => observer.observe(section));
  };

  return { init };
})();


/* ============================================================
   11. SCROLL-TO-TOP BUTTON
   ============================================================ */

const ScrollToTop = (() => {
  const SHOW_AFTER = 500; // px
  let btn = null;

  /**
   * Create the button if it doesn't already exist in the DOM.
   */
  const createButton = () => {
    btn = $(".scroll-top, #scroll-top, .back-to-top");

    if (!btn) {
      btn = document.createElement("button");
      btn.className = "scroll-top";
      btn.setAttribute("aria-label", "Scroll to top");
      btn.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
             stroke="currentColor" stroke-width="2.5"
             stroke-linecap="round" stroke-linejoin="round">
          <polyline points="18 15 12 9 6 15"></polyline>
        </svg>`;
      btn.style.cssText = `
        position: fixed;
        bottom: 30px;
        right: 30px;
        width: 48px;
        height: 48px;
        border-radius: 50%;
        border: 1px solid rgba(0, 255, 255, 0.3);
        background: rgba(0, 255, 255, 0.1);
        color: #0ff;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0;
        visibility: hidden;
        transform: translateY(20px);
        transition: opacity 0.4s ease, visibility 0.4s ease, transform 0.4s ease, background 0.3s ease;
        z-index: 9999;
        backdrop-filter: blur(8px);
      `;
      document.body.appendChild(btn);
    }

    return btn;
  };

  /**
   * Toggle visibility based on scroll position.
   */
  const handleScroll = () => {
    if (!btn) return;
    if (window.scrollY > SHOW_AFTER) {
      btn.style.opacity = "1";
      btn.style.visibility = "visible";
      btn.style.transform = "translateY(0)";
    } else {
      btn.style.opacity = "0";
      btn.style.visibility = "hidden";
      btn.style.transform = "translateY(20px)";
    }
  };

  const init = () => {
    btn = createButton();

    btn.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });

    // Hover effect
    btn.addEventListener("mouseenter", () => {
      btn.style.background = "rgba(0, 255, 255, 0.25)";
    });
    btn.addEventListener("mouseleave", () => {
      btn.style.background = "rgba(0, 255, 255, 0.1)";
    });

    window.addEventListener("scroll", throttle(handleScroll, 80));
    handleScroll(); // initial check
  };

  return { init };
})();


/* ============================================================
   12. CONTACT FORM HANDLING
   ============================================================ */

const ContactForm = (() => {
  /**
   * Creates and displays a toast notification.
   */
  const showToast = (message, type = "success") => {
    // Remove any existing toast
    const existing = $(".toast-notification");
    if (existing) existing.remove();

    const toast = document.createElement("div");
    toast.className = `toast-notification toast-${type}`;
    toast.style.cssText = `
      position: fixed;
      top: 30px;
      right: 30px;
      padding: 16px 28px;
      border-radius: 12px;
      font-size: 0.95rem;
      font-weight: 500;
      color: #fff;
      z-index: 100000;
      opacity: 0;
      transform: translateX(100%);
      transition: opacity 0.4s ease, transform 0.4s ease;
      backdrop-filter: blur(12px);
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
      ${type === "success"
        ? "background: rgba(0, 255, 150, 0.15); border: 1px solid rgba(0, 255, 150, 0.3);"
        : "background: rgba(255, 80, 80, 0.15); border: 1px solid rgba(255, 80, 80, 0.3);"}
    `;

    const icon = type === "success" ? "✓" : "✕";
    toast.innerHTML = `<span style="margin-right:8px;font-size:1.1em;">${icon}</span> ${message}`;
    document.body.appendChild(toast);

    // Animate in
    requestAnimationFrame(() => {
      toast.style.opacity = "1";
      toast.style.transform = "translateX(0)";
    });

    // Auto-dismiss after 4 seconds
    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translateX(100%)";
      setTimeout(() => toast.remove(), 500);
    }, 4000);
  };

  const init = () => {
    const form = $("form, .contact-form, #contact-form");
    if (!form) return;

    form.addEventListener("submit", (e) => {
      e.preventDefault();

      // Basic validation — check required fields
      const requiredFields = $$("[required]", form);
      let isValid = true;

      requiredFields.forEach((field) => {
        if (!field.value.trim()) {
          isValid = false;
          field.classList.add("error");
          field.addEventListener("input", () => field.classList.remove("error"), { once: true });
        }
      });

      if (!isValid) {
        showToast("Please fill in all required fields.", "error");
        return;
      }

      // Send real POST request to Web3Forms
      const formData = new FormData(form);
      const submitBtn = $("#contact-submit", form) || form.querySelector("button[type='submit']");
      const submitSpan = submitBtn ? submitBtn.querySelector("span") : null;
      const originalText = submitSpan ? submitSpan.textContent : "Send Message";

      if (submitBtn) submitBtn.disabled = true;
      if (submitSpan) submitSpan.textContent = "Sending...";

      fetch("https://api.web3forms.com/submit", {
        method: "POST",
        body: formData
      })
      .then(async (response) => {
        const json = await response.json();
        if (response.status === 200) {
          showToast("Message sent successfully! I'll get back to you soon. 🚀", "success");
          form.reset();
        } else {
          showToast(json.message || "Something went wrong. Please try again.", "error");
        }
      })
      .catch((err) => {
        console.error("Form submit error:", err);
        showToast("Network error. Please check your connection and try again.", "error");
      })
      .then(() => {
        if (submitBtn) submitBtn.disabled = false;
        if (submitSpan) submitSpan.textContent = originalText;
      });
    });
  };

  return { init };
})();


/* ============================================================
   13. CUSTOM CURSOR  (desktop only)
   ============================================================ */

const CustomCursor = (() => {
  let dot, outline;
  let mouseX = 0, mouseY = 0;
  let outlineX = 0, outlineY = 0;
  let isVisible = false;

  /**
   * Creates the cursor elements and injects them into the DOM.
   * Uses two layers: a small dot (follows instantly) and a
   * larger outline ring (follows with a slight delay via lerp).
   */
  const createCursor = () => {
    // Small dot
    dot = document.createElement("div");
    dot.className = "cursor-dot";
    dot.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #0ff;
      pointer-events: none;
      z-index: 100001;
      transform: translate(-50%, -50%);
      transition: width 0.3s ease, height 0.3s ease, background 0.3s ease;
      mix-blend-mode: difference;
    `;

    // Outline ring
    outline = document.createElement("div");
    outline.className = "cursor-outline";
    outline.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 36px;
      height: 36px;
      border-radius: 50%;
      border: 1.5px solid rgba(0, 255, 255, 0.5);
      pointer-events: none;
      z-index: 100000;
      transform: translate(-50%, -50%);
      transition: width 0.3s ease, height 0.3s ease, border-color 0.3s ease, opacity 0.3s ease;
    `;

    document.body.appendChild(dot);
    document.body.appendChild(outline);
  };

  /**
   * Render loop: dot follows mouse instantly; outline
   * follows with smooth interpolation.
   */
  const render = () => {
    if (!isVisible) {
      requestAnimationFrame(render);
      return;
    }

    // Dot — instant follow
    dot.style.left = `${mouseX}px`;
    dot.style.top = `${mouseY}px`;

    // Outline — smooth follow with lerp
    outlineX = lerp(outlineX, mouseX, 0.15);
    outlineY = lerp(outlineY, mouseY, 0.15);
    outline.style.left = `${outlineX}px`;
    outline.style.top = `${outlineY}px`;

    requestAnimationFrame(render);
  };

  /**
   * Enlarge cursor when hovering over interactive elements.
   */
  const addHoverEffects = () => {
    const interactiveSelectors = "a, button, input, textarea, select, [role='button'], .project-card, .card";

    document.addEventListener("mouseover", (e) => {
      if (e.target.closest(interactiveSelectors)) {
        dot.style.width = "12px";
        dot.style.height = "12px";
        outline.style.width = "50px";
        outline.style.height = "50px";
        outline.style.borderColor = "rgba(0, 255, 255, 0.8)";
      }
    });

    document.addEventListener("mouseout", (e) => {
      if (e.target.closest(interactiveSelectors)) {
        dot.style.width = "6px";
        dot.style.height = "6px";
        outline.style.width = "36px";
        outline.style.height = "36px";
        outline.style.borderColor = "rgba(0, 255, 255, 0.5)";
      }
    });
  };

  const init = () => {
    // Only activate on desktop devices
    if (!isDesktop()) return;

    createCursor();

    // Track mouse position
    document.addEventListener("mousemove", (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;

      if (!isVisible) {
        isVisible = true;
        dot.style.opacity = "1";
        outline.style.opacity = "1";
      }
    });

    // Hide cursor when mouse leaves the window
    document.addEventListener("mouseleave", () => {
      isVisible = false;
      dot.style.opacity = "0";
      outline.style.opacity = "0";
    });

    document.addEventListener("mouseenter", () => {
      isVisible = true;
      dot.style.opacity = "1";
      outline.style.opacity = "1";
    });

    addHoverEffects();
    requestAnimationFrame(render);

    // Hide default cursor via CSS
    const style = document.createElement("style");
    style.textContent = `
      *, *::before, *::after {
        cursor: none !important;
      }
    `;
    document.head.appendChild(style);
  };

  return { init };
})();


/* ============================================================
   14. DARK / LIGHT THEME TOGGLE
   ============================================================ */

const ThemeToggle = (() => {
  const STORAGE_KEY = "portfolio-theme";
  let toggleBtn = null;

  /**
   * Apply the given theme to the document.
   */
  const applyTheme = (theme) => {
    document.documentElement.setAttribute("data-theme", theme);
    document.body.classList.toggle("light-theme", theme === "light");
    document.body.classList.toggle("dark-theme", theme === "dark");

    // Update the toggle button icon
    if (toggleBtn) {
      toggleBtn.innerHTML = theme === "dark" ? "☀️" : "🌙";
      toggleBtn.setAttribute("aria-label", `Switch to ${theme === "dark" ? "light" : "dark"} mode`);
    }

    localStorage.setItem(STORAGE_KEY, theme);
  };

  /**
   * Get the saved theme from localStorage, or default to light.
   */
  const getSavedTheme = () => {
    return localStorage.getItem(STORAGE_KEY) || "light";
  };

  /**
   * Create the toggle button if it doesn't exist in the DOM.
   */
  const createToggleButton = () => {
    toggleBtn = $(".theme-toggle, #theme-toggle, .dark-mode-toggle");

    if (!toggleBtn) {
      toggleBtn = document.createElement("button");
      toggleBtn.className = "theme-toggle";
      toggleBtn.setAttribute("aria-label", "Toggle theme");
      // No inline styles — all styling is handled by .theme-toggle in CSS
      // This allows responsive media queries to properly position the button

      // Insert into the nav-container if it exists, otherwise body
      const navContainer = $(".nav-container");
      if (navContainer) {
        navContainer.appendChild(toggleBtn);
      } else {
        document.body.appendChild(toggleBtn);
      }
    }

    return toggleBtn;
  };

  const init = () => {
    toggleBtn = createToggleButton();

    // Apply saved or default theme immediately
    const savedTheme = getSavedTheme();
    applyTheme(savedTheme);

    // Toggle on click
    toggleBtn.addEventListener("click", () => {
      const current = document.documentElement.getAttribute("data-theme") || "dark";
      const next = current === "dark" ? "light" : "dark";
      applyTheme(next);

      // Add a spin animation on click
      toggleBtn.style.transform = "rotate(360deg)";
      setTimeout(() => {
        toggleBtn.style.transform = "rotate(0deg)";
      }, 500);
    });
  };

  return { init };
})();


/* ============================================================
   15. EXTRA — SMOOTH REVEAL FOR SECTIONS ON LOAD
   ============================================================ */

const SectionReveal = (() => {
  /**
   * Adds a subtle reveal animation to all major sections
   * as they scroll into view for the first time.
   */
  const init = () => {
    const sections = $$("section");
    if (sections.length === 0) return;

    sections.forEach((section) => {
      if (!section.hasAttribute("data-animate")) {
        section.style.opacity = "1"; // don't double-hide
      }
    });
  };

  return { init };
})();


/* ============================================================
   INITIALISE EVERYTHING ON DOM READY
   ============================================================ */

const App = (() => {
  const init = () => {
    console.log(
      "%c🚀 Portfolio Loaded",
      "color: #0ff; font-size: 14px; font-weight: bold;"
    );

    // --- Core modules ---
    SmoothScroll.init();
    Navigation.init();
    TypingAnimation.init();
    ParticleBackground.init();

    // --- Scroll-driven features ---
    ScrollAnimations.init();
    SkillBars.init();
    CounterAnimation.init();
    ActiveSection.init();
    SectionReveal.init();

    // --- Interactive features ---
    ProjectCards.init();
    ScrollToTop.init();
    ContactForm.init();

    // --- Desktop-only features ---
    CustomCursor.init();

    // --- Theme ---
    ThemeToggle.init();

    // --- Preloader (hide after everything is set up) ---
    Preloader.hide();
  };

  return { init };
})();

/**
 * Fire initialisation when the DOM is fully loaded.
 * We use both DOMContentLoaded and window.load to ensure
 * the preloader minimum display time works correctly.
 */
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", App.init);
} else {
  // DOM already loaded (script loaded with defer or at end of body)
  App.init();
}
