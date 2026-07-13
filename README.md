# CarCare+ — Marketing Website

A responsive, dynamic corporate landing page for **CarCare+**, an AI-powered car maintenance companion. Built with plain HTML, CSS, and JavaScript — no build step, no dependencies, ready to host on GitHub Pages.

## ✨ What's inside

- **Live animated dashboard mockup** in the hero — an SVG health gauge that fills in on scroll, a typewriter-style AI insight feed, and an activity log.
- **Scroll-triggered reveals** for every section using `IntersectionObserver`.
- **Animated stat counters** (users, repairs analyzed, workshops, satisfaction).
- **Sticky header** that gains a shadow/blur on scroll, with an active-link indicator and a mobile hamburger menu.
- **Working front-end form validation** on the contact/signup form (no backend — swap in your own endpoint when ready).
- Fully responsive down to small mobile, visible keyboard focus states, and `prefers-reduced-motion` support.

## 📁 Project structure

```
carcare-plus/
├── index.html          # All page markup/sections
├── css/
│   └── style.css       # Design tokens + component styles
├── js/
│   └── script.js       # Nav, gauge, counters, typewriter, form logic
└── README.md
```

## 🚀 Deploy to GitHub Pages

1. Create a new GitHub repository (e.g. `carcare-plus-website`) and push this folder's contents to the `main` branch:
   ```bash
   git init
   git add .
   git commit -m "Initial commit: CarCare+ website"
   git branch -M main
   git remote add origin https://github.com/<your-username>/<your-repo>.git
   git push -u origin main
   ```
2. In your repo on GitHub, go to **Settings → Pages**.
3. Under **Build and deployment → Source**, choose **Deploy from a branch**.
4. Set **Branch** to `main` and folder to `/ (root)`, then **Save**.
5. Your site will be live in a minute or two at:
   `https://<your-username>.github.io/<your-repo>/`

No build tools, no `node_modules`, no configuration needed — it's a static site.

## 🖥️ Run locally

Just open `index.html` in a browser, or serve it so relative paths behave the same as production:

```bash
# Python
python3 -m http.server 8000

# or Node
npx serve .
```

Then visit `http://localhost:8000`.

## 🎨 Customizing

All design tokens (colors, fonts, radii, shadows) live at the top of `css/style.css` under `:root`. Update those variables to re-theme the whole site consistently — everything references them rather than hard-coded values.

- **Fonts:** Sora (headings), Inter (body/UI), JetBrains Mono (numbers/data) — loaded from Google Fonts in `index.html`.
- **Copy:** all section text lives directly in `index.html`, organized by `<section id="...">` blocks that match the nav links.
- **Form endpoint:** the contact form in `#contactForm` currently only validates and shows a confirmation message client-side. Point it at your backend or a service like Formspree/Netlify Forms to actually collect submissions.

## ♿ Accessibility

- Semantic landmarks (`header`, `main`, `footer`, `nav`) and a skip-to-content link.
- Visible focus rings on all interactive elements.
- `aria-live` on the AI insight text and form status message.
- Respects `prefers-reduced-motion` by disabling animated counters, the gauge fill animation, and scroll reveals.

## 📄 License

Free to use and adapt for your own project.
