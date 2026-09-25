// ============================================================
// HCA Sublimados — configuración rápida
// Reemplazá WHATSAPP_NUMBER por el número real (con código de país,
// sin +, sin espacios). Ejemplo Argentina Córdoba: "5493511234567"
// ============================================================
const WHATSAPP_NUMBER = "5493516241014";

document.addEventListener("DOMContentLoaded", () => {
  // año en el footer
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // links de whatsapp con mensaje predefinido
  document.querySelectorAll(".js-wa").forEach((el) => {
    const msg = el.getAttribute("data-wa-msg") || "Hola! Quiero hacer una consulta.";
    el.setAttribute(
      "href",
      `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`
    );
    el.setAttribute("target", "_blank");
    el.setAttribute("rel", "noopener");
  });

  // header con sombra al scrollear
  const header = document.getElementById("siteHeader");
  const onScroll = () => {
    if (window.scrollY > 12) header.classList.add("scrolled");
    else header.classList.remove("scrolled");
  };
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  // menu movil
  const navToggle = document.getElementById("navToggle");
  const mobilePanel = document.getElementById("mobilePanel");
  navToggle.addEventListener("click", () => {
    navToggle.classList.toggle("active");
    mobilePanel.classList.toggle("open");
  });
  mobilePanel.querySelectorAll("a").forEach((a) => {
    a.addEventListener("click", () => {
      navToggle.classList.remove("active");
      mobilePanel.classList.remove("open");
    });
  });

  // FAQ acordeon
  document.querySelectorAll(".faq-item").forEach((item) => {
    const question = item.querySelector(".faq-question");
    const answer = item.querySelector(".faq-answer");
    question.addEventListener("click", () => {
      const isOpen = item.classList.contains("open");

      document.querySelectorAll(".faq-item.open").forEach((openItem) => {
        if (openItem !== item) {
          openItem.classList.remove("open");
          openItem.querySelector(".faq-answer").style.maxHeight = null;
        }
      });

      if (isOpen) {
        item.classList.remove("open");
        answer.style.maxHeight = null;
      } else {
        item.classList.add("open");
        answer.style.maxHeight = answer.scrollHeight + "px";
      }
    });
  });

  // vidriera de trabajos (galeria): autoplay infinito, se pausa con hover/toque
  const galleryTrack = document.getElementById("galleryTrack");
  if (galleryTrack) {
    const originalCards = Array.from(galleryTrack.children);
    originalCards.forEach((card) => {
      const clone = card.cloneNode(true);
      clone.setAttribute("aria-hidden", "true");
      galleryTrack.appendChild(clone);
    });

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const SPEED = 34; // px por segundo
    let oneSetWidth = galleryTrack.scrollWidth / 2;
    let paused = false;
    let resumeTimer = null;
    let lastTime = null;

    const recalcWidth = () => {
      oneSetWidth = galleryTrack.scrollWidth / 2;
    };
    window.addEventListener("resize", recalcWidth);
    window.addEventListener("load", recalcWidth);

    const pause = () => { paused = true; };
    const resume = () => { paused = false; lastTime = null; };
    const resumeSoon = () => {
      clearTimeout(resumeTimer);
      resumeTimer = setTimeout(resume, 1800);
    };

    galleryTrack.addEventListener("mouseenter", pause);
    galleryTrack.addEventListener("mouseleave", () => {
      clearTimeout(resumeTimer);
      resume();
    });
    galleryTrack.addEventListener("pointerdown", pause);
    galleryTrack.addEventListener("touchstart", pause, { passive: true });
    galleryTrack.addEventListener("pointerup", resumeSoon);
    galleryTrack.addEventListener("touchend", resumeSoon, { passive: true });

    if (!reduceMotion) {
      const step = (now) => {
        if (lastTime === null) lastTime = now;
        const dt = now - lastTime;
        lastTime = now;
        if (!paused && oneSetWidth > 0) {
          galleryTrack.scrollLeft += (SPEED * dt) / 1000;
          if (galleryTrack.scrollLeft >= oneSetWidth) {
            galleryTrack.scrollLeft -= oneSetWidth;
          }
        }
        requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }
  }

  // modo claro / oscuro
  const themeToggle = document.getElementById("themeToggle");
  if (themeToggle) {
    const root = document.documentElement;
    const applyToggleUI = () => {
      const isDark = root.getAttribute("data-theme") === "dark";
      themeToggle.setAttribute("aria-pressed", String(isDark));
      themeToggle.setAttribute("aria-label", isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro");
    };
    themeToggle.addEventListener("click", () => {
      const next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
      root.setAttribute("data-theme", next);
      try {
        localStorage.setItem("hca-theme", next);
      } catch (e) {}
      applyToggleUI();
    });
    applyToggleUI();
  }

  // aparicion sutil al hacer scroll
  const revealEls = document.querySelectorAll(".reveal");
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15, rootMargin: "0px 0px -60px 0px" }
  );
  revealEls.forEach((el) => observer.observe(el));
});
