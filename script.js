(() => {
  "use strict";

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------------- Header scroll state ---------------- */
  const header = document.getElementById("siteHeader");
  const onScroll = () => {
    header.classList.toggle("scrolled", window.scrollY > 8);
  };
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  /* ---------------- Mobile nav toggle ---------------- */
  const navToggle = document.getElementById("navToggle");
  const mainNav = document.getElementById("mainNav");
  navToggle.addEventListener("click", () => {
    const isOpen = mainNav.classList.toggle("open");
    navToggle.setAttribute("aria-expanded", String(isOpen));
  });
  mainNav.querySelectorAll(".nav-link").forEach(link => {
    link.addEventListener("click", () => {
      mainNav.classList.remove("open");
      navToggle.setAttribute("aria-expanded", "false");
    });
  });

  /* ---------------- Active nav link on scroll ---------------- */
  const sections = ["features", "how-it-works", "why", "pricing", "contact"]
    .map(id => document.getElementById(id))
    .filter(Boolean);
  const navLinks = Array.from(document.querySelectorAll(".nav-link"));

  const navObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const id = entry.target.id;
        navLinks.forEach(link => {
          link.classList.toggle("active", link.getAttribute("href") === `#${id}`);
        });
      }
    });
  }, { rootMargin: "-40% 0px -55% 0px", threshold: 0 });

  sections.forEach(sec => navObserver.observe(sec));

  /* ---------------- Scroll reveal ---------------- */
  const revealEls = document.querySelectorAll("[data-reveal]");
  if (reduceMotion) {
    revealEls.forEach(el => el.classList.add("is-visible"));
  } else {
    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry, i) => {
        if (entry.isIntersecting) {
          const el = entry.target;
          const delay = Array.from(el.parentElement.children).indexOf(el) * 60;
          setTimeout(() => el.classList.add("is-visible"), Math.min(delay, 240));
          revealObserver.unobserve(el);
        }
      });
    }, { threshold: 0.15 });
    revealEls.forEach(el => revealObserver.observe(el));
  }

  /* ---------------- Health gauge animation ---------------- */
  const gaugeFill = document.getElementById("gaugeFill");
  const gaugeNum = document.getElementById("gaugeNum");
  const CIRCUMFERENCE = 2 * Math.PI * 50; // r=50
  const TARGET_SCORE = 85;

  function animateGauge() {
    const offset = CIRCUMFERENCE - (TARGET_SCORE / 100) * CIRCUMFERENCE;
    gaugeFill.style.strokeDashoffset = String(offset);

    if (reduceMotion) {
      gaugeNum.textContent = TARGET_SCORE;
      return;
    }
    const duration = 1400;
    const start = performance.now();
    function tick(now) {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      gaugeNum.textContent = Math.round(eased * TARGET_SCORE);
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }
  // Run once dashboard is in view
  const dashCard = document.getElementById("dashCard");
  const gaugeObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        animateGauge();
        gaugeObserver.disconnect();
      }
    });
  }, { threshold: 0.4 });
  if (dashCard) gaugeObserver.observe(dashCard);

  /* ---------------- Typewriter AI insight ---------------- */
  const messages = [
    "Brake pads show normal wear for your driving pattern. No urgent action needed.",
    "Oil change is due in 1,250 km. Book a slot before your next long drive.",
    "Insurance renews in 28 days. We'll remind you a week before it lapses.",
    "Tyre tread is in good condition. Next inspection recommended in 3 months."
  ];
  const twEl = document.getElementById("typewriter");

  function typeLoop() {
    if (!twEl) return;
    if (reduceMotion) {
      twEl.textContent = messages[0];
      return;
    }
    let msgIndex = 0;
    let charIndex = 0;
    let deleting = false;

    function step() {
      const current = messages[msgIndex];
      if (!deleting) {
        charIndex++;
        twEl.textContent = current.slice(0, charIndex);
        if (charIndex === current.length) {
          deleting = false;
          setTimeout(() => { deleting = true; step(); }, 2200);
          return;
        }
      } else {
        charIndex--;
        twEl.textContent = current.slice(0, charIndex);
        if (charIndex === 0) {
          deleting = false;
          msgIndex = (msgIndex + 1) % messages.length;
        }
      }
      setTimeout(step, deleting ? 18 : 28);
    }
    step();
  }
  typeLoop();

  /* ---------------- Stat counters ---------------- */
  const stats = document.querySelectorAll(".stat[data-count]");
  function animateStat(el) {
    const target = parseFloat(el.dataset.count);
    const decimals = parseInt(el.dataset.decimal || "0", 10);
    const valueEl = el.querySelector(".stat-value");
    if (reduceMotion) {
      valueEl.textContent = target.toFixed(decimals);
      return;
    }
    const duration = 1200;
    const start = performance.now();
    function tick(now) {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      valueEl.textContent = (eased * target).toFixed(decimals);
      if (p < 1) requestAnimationFrame(tick);
      else valueEl.textContent = target.toFixed(decimals);
    }
    requestAnimationFrame(tick);
  }
  const statObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        animateStat(entry.target);
        statObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.5 });
  stats.forEach(stat => statObserver.observe(stat));

  /* ---------------- Contact form (front-end only) ---------------- */
  const form = document.getElementById("contactForm");
  const formNote = document.getElementById("formNote");
  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      if (!form.checkValidity()) {
        formNote.style.color = "var(--red-500)";
        formNote.textContent = "Please fill in your name and a valid email address.";
        form.reportValidity();
        return;
      }
      const name = document.getElementById("cf-name").value.trim();
      formNote.style.color = "var(--green-500)";
      formNote.textContent = `Thanks, ${name.split(" ")[0]}! Check your inbox to confirm your account.`;
      form.reset();
    });
  }

  /* ---------------- Footer year ---------------- */
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

})();
