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
