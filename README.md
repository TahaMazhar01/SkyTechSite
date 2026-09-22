# SKY TECH storefront

The homepage hero automatically cycles through five image-and-copy slides every 3 seconds, without navigation controls or hover-to-pause behavior. Rotation suspends while the tab is hidden and resumes when it becomes visible. Reduced-motion preferences disable transition effects. Slide content lives in `src/hero.js`. Floating phone and WhatsApp links use the business contact number. The IP-COM wordmark comes from the official website and replaces the cropped client reference.

Rollup uses the official WebAssembly package override for compatibility with Windows application-control policies that block its native addon.

A responsive local storefront and installation-service website, built with Vite, vanilla JavaScript, and Lucide icons.

## Run locally

```sh
npm install
npm run dev -- --port 5173
```

Open http://localhost:5173. Use `npm run build` for the production build.

## Included

- Responsive service pages in accessible native dialogs.
- Searchable, category-filtered equipment catalogue.
- Quote basket with quantities, removal, and local persistence.
- WhatsApp quote and consultation handoff. Messages are prepared; the visitor must send them in WhatsApp.
- Phone, email, and location links.

## Before launch

Confirm business contact details and service area. Replace illustrative product categories with actual models, photos, stock, specifications, and approved pricing. Configure the selected payment, order, and backend services if direct checkout is required. No payments or bookings are processed by this preview, and no customer data is submitted to a backend.

The logo is supplied by the client. Equipment and service photography is downloaded locally from Pexels and Unsplash under their free-use stock licences (not public-domain or open-source licences). Full source links and credits are in `public/image-credits.html`, also linked in the website footer. Photographs represent equipment categories, not confirmed SKUs or completed client projects. Fonts: DM Sans and Manrope, delivered by Google Fonts with system fallbacks.

Catalogue content lives in `src/catalogue.js`: 12 equipment categories, selection guidance, image mappings, and six FAQs. The homepage also includes home/business/security solutions and installation guidance. Keep exact inventory and pricing unconfirmed until supplied by the business.

The shared larger typography and contrast overrides are in `src/readability.css`. WhatsApp brand glyph comes from Bootstrap Icons (MIT); its notice is saved beside the SVG in `public/assets/whatsapp-icon-LICENSE.txt`.

September 23 visual update: seven-second automatic hero; separate text and photo columns (stacked on mobile); 25 distinct page photos; official EZVIZ C6N G1 2K equipment entry; client-supplied IP-COM wordmark. Sources and manufacturer image distinctions are documented in public/image-credits.html.
