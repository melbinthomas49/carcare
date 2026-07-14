# CarCare+ — Marketing Site + User/Admin Panel (Firebase)

A responsive corporate landing page for **CarCare+**, now with real accounts and a real
database: users can sign up, add vehicles, and log service history; admins get a panel
to manage all users, vehicles, and service records. Built with plain HTML/CSS/JS +
**Firebase** (Auth + Firestore) — no build step, deployable straight to GitHub Pages.

## 📁 What's in this folder

| File | Purpose |
|---|---|
| `index.html` | All markup: marketing site, auth modal, user dashboard, admin panel |
| `css/style.css` | All styles |
| `js/script.js` | Marketing-site interactivity (nav, hero gauge, counters, reveals) |
| `js/firebase-app.js` | Auth + Firestore logic (signup/login, vehicles, service records, admin panel) |
| `firestore.rules` | Security rules to paste into your Firebase project |

A merged **single-file** version (`index.html` with CSS/JS inlined, Firebase CDN links
kept external) is also available if you asked for that — same behavior, one file.

## 🔥 Firebase setup (required — do this first)

The app won't work until you connect it to your own free Firebase project.

1. Go to [console.firebase.google.com](https://console.firebase.google.com) → **Add project** → name it (e.g. `carcare-plus`) → finish the wizard (Google Analytics optional).
2. **Enable Authentication:** left sidebar → *Build → Authentication → Get started* → under *Sign-in method*, enable **Email/Password**.
3. **Enable Firestore:** left sidebar → *Build → Firestore Database → Create database* → start in **production mode** → pick any region.
4. **Publish security rules:** in Firestore → *Rules* tab → replace the contents with everything in `firestore.rules` from this folder → **Publish**.
5. **Get your web config:** *Project settings* (gear icon) → scroll to *Your apps* → click the **</>** (web) icon → register an app (any nickname) → copy the `firebaseConfig` object it shows you.
6. Open `js/firebase-app.js` (or the `<script>` block containing `firebaseConfig` in the single-file version) and paste your values in, replacing the placeholders:
   ```js
   const firebaseConfig = {
     apiKey: "AIza...",
     authDomain: "carcare-plus-xxxxx.firebaseapp.com",
     projectId: "carcare-plus-xxxxx",
     storageBucket: "carcare-plus-xxxxx.appspot.com",
     messagingSenderId: "...",
     appId: "..."
   };
   ```
7. Save, then open `index.html` (or push to GitHub Pages) — **Sign Up** now creates a real account and a real Firestore document.

Until step 6 is done, clicking Log In/Sign Up shows a friendly reminder instead of failing silently.

## 👑 Creating your first admin

Every new signup gets `role: "user"` by default — nobody can make themselves an admin
from the UI (that's a security rule, not an oversight). To create your first admin:

1. Sign up normally through the site with the account you want to be admin.
2. In the Firebase console → **Firestore Database → Data**, open the `users` collection, find that user's document (matched by their email).
3. Edit the `role` field from `"user"` to `"admin"`, save.
4. Refresh the site and log in — you'll now see **Admin Panel** in the account menu, with Overview / Users / All Vehicles / Service Records.

From then on, that admin can promote or demote anyone else's role directly from the **Users** tab in the Admin Panel — no console needed.

## 🗄️ Data model

```
users/{uid}
  name          string
  email         string
  role          "user" | "admin"
  createdAt     timestamp

vehicles/{autoId}
  ownerId       uid of the owning user
  make, model   string
  year          number
  plate         string
  mileage       number
  createdAt     timestamp

serviceRecords/{autoId}
  vehicleId     id of the vehicle this belongs to
  ownerId       uid (mirrors the vehicle's owner, kept for fast security-rule checks)
  type          string (e.g. "Oil change")
  date          string (yyyy-mm-dd)
  mileageAtService  number
  cost          number
  notes         string
  createdAt     timestamp
```

Security rules (`firestore.rules`) enforce that:
- A signed-out visitor can read nothing and write nothing.
- A regular user can only read/write **their own** vehicles and service records, and can only edit their own profile (not their `role`, in practice — the UI never exposes that, and only admins can write another user's `role`).
- An admin can read everything and update any user's role.

## 🚀 Deploy to GitHub Pages

Same as before — this is still a static site as far as GitHub Pages is concerned;
Firebase is just a set of API calls made from the browser.

```bash
git init
git add .
git commit -m "CarCare+ with Firebase auth, user dashboard, admin panel"
git branch -M main
git remote add origin https://github.com/<your-username>/<your-repo>.git
git push -u origin main
```

Then: **Settings → Pages → Deploy from a branch → `main` / root → Save.**
Live at `https://<your-username>.github.io/<your-repo>/`.

One extra step versus a plain static site: in the Firebase console → **Authentication →
Settings → Authorized domains**, add your GitHub Pages domain
(`<your-username>.github.io`) so Firebase Auth accepts requests from it.

## 🖥️ Run locally

```bash
python3 -m http.server 8000
# or
npx serve .
```
Visit `http://localhost:8000`. If you test locally, also add `localhost` to Firebase's
Authorized domains list (it's usually there by default).

## 🧭 How the app layer works

- Clicking **Log In / Sign Up** opens a modal over the marketing site — no page reload.
- On successful login, the marketing page is hidden and the **app shell** (sidebar +
  panels) is shown. Clicking **Home** in the nav switches back.
- **My Vehicles** (every user): add a vehicle, click a card to open its service
  history, log new service records, delete records. Data updates live via Firestore
  `onSnapshot` listeners — no manual refresh needed.
- **Admin Panel** (admin role only): Overview (counts), Users (view + change roles),
  All Vehicles, and all Service Records across every user.

## ♿ Accessibility

Modals trap focus visually, close on <kbd>Esc</kbd> or backdrop click, and use
`role="dialog"`/`aria-modal`. Live regions (`aria-live`) announce toast messages and
the AI insight text. All interactive elements are keyboard-reachable with visible
focus rings.

## 📄 License

Free to use and adapt for your own project.
