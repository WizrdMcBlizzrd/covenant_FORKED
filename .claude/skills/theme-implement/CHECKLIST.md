# Implementation Checklist

Use this checklist before marking a theme implementation complete.

---

## Pre-Implementation

- [ ] Proposal exists at `tmp/makeover/themes/{theme-name}.html`
- [ ] Extracted MAKEOVER_METADATA from proposal
- [ ] Read CONTROLLERS.md for Stimulus patterns
- [ ] Development server running (`npm run dev`)

---

## File Creation

### Directory Structure

- [ ] Created `app/themes/{theme-name}/`
- [ ] Created `app/themes/{theme-name}/partials/`

### Templates

- [ ] `layout.html` - Main layout with nav, footer, wallet modal
- [ ] `home.html` - Home page with collections grid
- [ ] `inscription.html` - Inscription detail with full buy flow
- [ ] `inscriptions.html` - Collection page with inscription grid + pagination
- [ ] `activity.html` - Transaction history
- [ ] `policy.html` - Policy/info page
- [ ] `partials/inscription-card.html` - Card component
- [ ] `partials/order.html` - Order status display

### CSS

- [ ] Created `app/assets/stylesheets/application.{theme-name}.tailwind.css`
- [ ] CSS includes `@import "tailwindcss"`
- [ ] CSS includes `@source` directives for JS and templates
- [ ] CSS defines `@theme` variables
- [ ] Body uses `class="theme-{theme-name}"`

---

## Stimulus Controller Compliance

### Inscription Page

- [ ] Section has `data-controller="inscription"`
- [ ] Section has `data-action` for wallet events
- [ ] Section has all three `data-inscription-*-value` attributes
- [ ] Form has `data-inscription-target="form"`
- [ ] All 17 Stimulus targets present (see CONTROLLERS.md)
- [ ] Connect button has `class="hide-on-connected"`
- [ ] Prepare button has `class="show-on-connected"`
- [ ] Buy button has `class="hidden"` (initial state)
- [ ] All buttons have correct `data-action` attributes

### Layout

- [ ] Body has `data-controller="store body-class usd wallet"`
- [ ] Body has wallet event actions
- [ ] Body has `class="theme-{theme-name}"`
- [ ] Nav has wallet connect/disconnect actions
- [ ] Wallet modal has `data-wallet-target="selector"`
- [ ] Wallet modal has `data-state="closed"`
- [ ] Wallet buttons have provider params
- [ ] Main content has `data-store-target="main"`

### Image Loading

- [ ] All images/iframes wrapped in `data-controller="image"` container
- [ ] Skeleton has `data-image-target="skeleton"`
- [ ] Image has `data-image-target="img"` or iframe has `data-image-target="media"`
- [ ] Load/error actions: `data-action="load->image#loaded error->image#error"`

### Pagination

- [ ] Pagination links have `data-action="click->store#paginate"`

---

## CSS Specificity

- [ ] Wallet visibility classes work:
  ```css
  .hide-on-connected { display: block; }
  .show-on-connected { display: none; }
  .wallet-connected .hide-on-connected { display: none; }
  .wallet-connected .show-on-connected { display: block; }
  ```

- [ ] Button class transitions work:
  ```css
  .theme-{name} .buy-button.hidden { display: none !important; }
  .theme-{name} .buy-button.inline-flex { display: inline-flex !important; }
  ```

- [ ] Modal state works:
  ```css
  [data-state="closed"] { display: none; }
  [data-state="open"] { display: flex; /* etc */ }
  ```

---

## Price Display

- [ ] All `formatSats()` calls use `.replace(' sats', '')`
- [ ] No hardcoded "BTC" or "sats" text after price values
- [ ] USD conversion elements have `data-usd-sats="<%= value %>"`

---

## Test IDs

Ensure these `data-testid` attributes exist for testing:

### Home Page
- [ ] `home-page` on section
- [ ] `collections-grid` on collections container
- [ ] `collection-card` on each collection
- [ ] `collection-title` on collection titles
- [ ] `collection-price` on collection prices
- [ ] `collection-thumb` on thumbnails

### Collection Page
- [ ] `inscriptions-page` on section
- [ ] `page-title` on heading
- [ ] `grid` on inscriptions grid
- [ ] `inscription-card` on each card
- [ ] `pagination` on pagination container
- [ ] `prev-page`, `next-page`, `page-link` on pagination links
- [ ] `empty-title` when no inscriptions

### Inscription Page
- [ ] `inscription-page` on section
- [ ] `page-title` on heading
- [ ] `media` on media container
- [ ] `details` on details section
- [ ] `detail-id`, `detail-number`, `detail-sat`, `detail-inscribed`
- [ ] `purchase-panel` on purchase section
- [ ] `price-sats` on price display
- [ ] `fees` on fees container
- [ ] `buy-button` on buy button
- [ ] `buy-success`, `buy-client-error` on message panels

### Layout
- [ ] `header-nav` on navigation
- [ ] `footer` on footer

---

## Build Verification

- [ ] `npm run build:css` succeeds
- [ ] `npm run build:templates` succeeds
- [ ] `npm run build` succeeds (full build)
- [ ] No console errors on page load

---

## Functional Testing

### Pages Load
- [ ] Home page (`/`) renders
- [ ] Activity page (`/activity`) renders
- [ ] Policy page (`/policy`) renders
- [ ] Collection page (`/{slug}`) renders
- [ ] Inscription page (`/{slug}/{id}`) renders

### Wallet Flow
- [ ] Connect button visible when disconnected
- [ ] Click connect opens wallet modal
- [ ] Modal closes on X click
- [ ] Modal closes on Escape key
- [ ] Wallet selection triggers connection
- [ ] After connect: prepare button visible, connect hidden
- [ ] Prepare auto-triggers on wallet already connected
- [ ] After prepare: buy button visible, prepare hidden
- [ ] Fees display populated after prepare

### Pagination
- [ ] Pagination links work via AJAX
- [ ] Page content updates without full reload
- [ ] URL updates on pagination

### Responsive
- [ ] Desktop (>1024px) layout works
- [ ] Tablet (768-1024px) layout works
- [ ] Mobile (<768px) layout works
- [ ] Wallet modal works on mobile

---

## Final Verification

- [ ] Theme matches proposal visually
- [ ] No broken images or iframes
- [ ] No JavaScript console errors
- [ ] All interactive elements work
- [ ] Commit changes with descriptive message
