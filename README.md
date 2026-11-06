# smolthings web

```sh
npm install
npm run dev      # http://localhost:5173
npm run build    # static site in dist/
```

- Projects live in `src/projects.js` (name, icon, tagline, platforms, stack, feature icons from lucide-react).
- Icons go in `public/icons/`.
- Backgrounds: `src/components/AsciiBackground.jsx` — `liquid`, `current`, `rain`, `ember`. Switch with the pill at the bottom, or `?bg=rain`.

## Deploy

Pushing to `main` builds and deploys to GitHub Pages at https://smolthings.work via `.github/workflows/deploy.yml`.
`public/CNAME` sets the domain; the build copies `index.html` to `404.html` so links like `/mouth` work on refresh.
