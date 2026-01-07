# Troubleshooting Guide

Common issues encountered during theme implementation and their solutions.

---

## Button State Issues

### Problem: Buy button not appearing after prepare

**Symptom:** After connecting wallet and prepare completes, the buy button stays hidden.

**Cause:** CSS specificity. Your theme's `.buy-button { display: block; }` overrides Tailwind's `hidden` class.

**Solution:** Add explicit overrides in your theme CSS:

```css
.theme-{name} .buy-button.hidden {
  display: none !important;
}

.theme-{name} .buy-button.inline-flex {
  display: inline-flex !important;
}
```

---

### Problem: "Preparing..." spinner shows on page load

**Symptom:** Page loads with "Preparing..." text and spinner visible instead of "Buy Now" or similar.

**Cause:** The prepare button has `show-on-connected` class and wallet is already connected, so it shows. Then `onWalletConnected()` runs and calls `prepare()` which shows spinner.

**Solution:** This is expected behavior. If you don't want spinners:

```html
<span data-inscription-target="prepareSpinner" style="display: none;"></span>
<span data-inscription-target="buySpinner" style="display: none;"></span>
```

The controller toggles `button-spinner-hidden` class which won't conflict with `display: none`.

---

### Problem: Both connect and prepare buttons visible

**Symptom:** Both buttons show at the same time.

**Cause:** Missing or incorrect wallet visibility classes.

**Solution:** Ensure CSS has:

```css
.hide-on-connected {
  display: block;  /* or appropriate */
}

.show-on-connected {
  display: none;
}

.wallet-connected .hide-on-connected {
  display: none;
}

.wallet-connected .show-on-connected {
  display: block;  /* or inline-flex, etc. */
}
```

And buttons have correct classes:
- Connect button: `class="hide-on-connected"`
- Prepare button: `class="show-on-connected"`

---

## Price Display Issues

### Problem: Price shows "1,234 BTC BTC"

**Symptom:** Duplicate "BTC" suffix on prices.

**Cause:** The Stimulus controller (and/or formatSats helper) already adds "BTC". Template also adds it.

**Solution:** Remove "BTC" from template, use `.replace(' sats', '')`:

```html
<!-- Wrong -->
<span><%= formatSats(price) %> BTC</span>

<!-- Right -->
<span><%= formatSats(price).replace(' sats', '') %></span>
```

---

### Problem: Price shows "sats" instead of expected format

**Symptom:** Prices display as "1,234 sats" when you want just the number.

**Cause:** `formatSats()` returns "X sats" format by default.

**Solution:** Use `.replace(' sats', '')` to strip the suffix:

```html
<span><%= formatSats(collection.price_sats).replace(' sats', '') %></span>
```

---

## Modal Issues

### Problem: Wallet modal doesn't open

**Symptom:** Clicking connect button does nothing.

**Cause:** Missing `data-action` or wrong modal structure.

**Solution:** Verify:

1. Connect button has `data-action="wallet#select"`:
```html
<a data-action="wallet#select">Connect Wallet</a>
```

2. Modal has correct target and state:
```html
<div data-wallet-target="selector" data-state="closed">
```

3. CSS handles `data-state`:
```css
[data-state="closed"] { display: none; }
[data-state="open"] { display: flex; }
```

---

### Problem: Modal doesn't close

**Symptom:** Modal opens but won't close.

**Cause:** Missing close action or Escape handler.

**Solution:** Ensure:

1. Close button has action:
```html
<button data-action="wallet#close">X</button>
```

2. Body has escape handler:
```html
<body data-action="... keydown.esc@window->wallet#close">
```

3. Clicking overlay closes (if desired):
```html
<div class="overlay" data-action="click->wallet#close">
```

---

## Build Issues

### Problem: CSS changes not appearing

**Symptom:** Made CSS changes but they don't show in browser.

**Cause:** Build not run or cached assets.

**Solution:**
1. Run `npm run build:css`
2. Hard refresh browser (Cmd+Shift+R)
3. Check that `public/` has updated CSS file
4. Verify `config/store.yml` has correct `theme:` value

---

### Problem: Template changes not appearing

**Symptom:** Changed HTML template but page looks the same.

**Cause:** Templates compile to JavaScript functions.

**Solution:**
1. Run `npm run build:templates`
2. Check `generated/themes.js` was updated
3. Restart dev server if needed

---

### Problem: Build fails with syntax error

**Symptom:** `npm run build:css` or `npm run build:templates` fails.

**Cause:** Syntax error in CSS or template.

**Solution:**
1. Check error message for file and line
2. Common EJS issues:
   - Missing `%>` closing tag
   - Unclosed `<% if %>` block
   - Typo in variable name
3. Common CSS issues:
   - Missing semicolon
   - Unclosed brace
   - Invalid Tailwind v4 syntax

---

## Pagination Issues

### Problem: Pagination does full page reload

**Symptom:** Clicking page numbers reloads entire page instead of AJAX update.

**Cause:** Missing `data-action` on pagination links.

**Solution:** Add to all pagination links:

```html
<a href="..." data-action="click->store#paginate">Page 2</a>
```

---

### Problem: Pagination not updating URL

**Symptom:** Content updates but URL stays the same.

**Cause:** This is expected behavior - the store controller updates content via AJAX but may not update URL.

**Solution:** If URL update is needed, the store controller would need modification (not typically required).

---

## Image Loading Issues

### Problem: Images never appear (stuck on skeleton)

**Symptom:** Skeleton loaders stay visible, images don't show.

**Cause:** Missing image controller targets or actions.

**Solution:** Ensure structure:

```html
<div data-controller="image">
  <div data-image-target="skeleton" class="..."></div>
  <img
    src="..."
    class="opacity-0 transition-opacity duration-300"
    data-image-target="img"
    data-action="load->image#loaded error->image#error"
  />
</div>
```

For iframes, use `data-image-target="media"` instead of `img`.

---

### Problem: Images flash before skeleton

**Symptom:** Image briefly visible, then skeleton, then image again.

**Cause:** Image loads before JavaScript initializes.

**Solution:** Add initial opacity-0 class to images:

```html
<img class="opacity-0 transition-opacity duration-300" ... />
```

---

## Layout Issues

### Problem: Theme styles not applying

**Symptom:** Page renders but looks unstyled or uses wrong theme.

**Cause:** Theme class missing from body or wrong theme in config.

**Solution:**
1. Check `config/store.yml` has `theme: {theme-name}`
2. Check body has `class="theme-{theme-name}"`
3. Check CSS file exists at `app/assets/stylesheets/application.{theme-name}.tailwind.css`

---

### Problem: Z-index issues with modals

**Symptom:** Modal appears behind other elements.

**Cause:** Insufficient z-index or stacking context issues.

**Solution:** Ensure modal has high z-index:

```css
[data-state="open"] {
  z-index: 10000;
  position: fixed;
}
```

---

## Console Errors

### Problem: "Cannot read property of undefined" for Stimulus target

**Symptom:** JavaScript error referencing a Stimulus target.

**Cause:** Target element missing from template.

**Solution:** Check that all required targets exist. See CONTROLLERS.md for full list. Common missing targets:
- `data-inscription-target="form"`
- `data-inscription-target="fees"`
- `data-store-target="main"`

---

### Problem: "Controller not found" error

**Symptom:** Stimulus controller doesn't initialize.

**Cause:** Controller name mismatch or body missing controller declaration.

**Solution:** Ensure body has all controllers:

```html
<body data-controller="store body-class usd wallet">
```

---

## Quick Fixes Reference

| Symptom | Quick Fix |
|---------|-----------|
| Buy button won't show | Add `.buy-button.hidden { display: none !important }` |
| "BTC BTC" in prices | Remove extra "BTC", use `.replace(' sats', '')` |
| Modal won't open | Add `data-action="wallet#select"` to connect button |
| Modal won't close | Add `data-action="wallet#close"` to close button |
| Styles not loading | Run `npm run build:css`, check theme name |
| Templates not updating | Run `npm run build:templates` |
| Spinner on page load | Hide spinner with `style="display: none;"` |
| Both buttons visible | Check `.hide-on-connected` / `.show-on-connected` CSS |
