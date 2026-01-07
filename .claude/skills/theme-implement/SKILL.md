---
name: theme-implement
description: Implement themes from makeover proposals into the Covenant codebase. Handles Stimulus.js patterns, CSS specificity, and price formatting.
---

# Theme Implementation

Implement approved makeover themes into the Covenant codebase. This skill captures critical patterns learned from implementing themes like geocities-hellscape.

## Command

```
/theme-implement [theme-name]
```

## Prerequisites

- Approved proposal exists at `tmp/makeover/themes/{theme-name}.html`
- Development server running (`npm run dev`)
- Understanding of this codebase's Stimulus.js patterns

## File Structure

Every theme consists of:

```
app/themes/{theme-name}/
├── layout.html              # Main layout (header, nav, footer, modals)
├── home.html                # Home page with collections grid
├── inscription.html         # Inscription detail with buy flow
├── inscriptions.html        # Collection page with inscription grid
├── activity.html            # Transaction history
├── policy.html              # Policy/info page
└── partials/
    ├── inscription-card.html   # Card component for grids
    └── order.html              # Order status display

app/assets/stylesheets/
└── application.{theme-name}.tailwind.css   # Theme CSS with @theme variables
```

## Implementation Steps

### 1. Read Proposal and Extract Metadata

Read the proposal HTML and find the MAKEOVER_METADATA comment:

```html
<!--
MAKEOVER_METADATA
theme: theme-name
dna: H#-L#-G#-D#-C#-N#
styling_system: Tailwind
pages: home, inscriptions, inscription, activity, policy
-->
```

### 2. Create Theme Directory

```bash
mkdir -p app/themes/{theme-name}/partials
```

### 3. Extract and Adapt CSS

From the proposal's `<style>` tags, create the CSS file:

```css
/* app/assets/stylesheets/application.{theme-name}.tailwind.css */
@import "tailwindcss";

@source "../javascripts/**/*.js";
@source "../../../generated/themes.js";
@source "../../../config/*.yml";

@theme {
  /* Colors from proposal */
  --color-*: ...;

  /* Fonts */
  --font-*: ...;
}

/* Body theme class */
body.theme-{theme-name} {
  /* Base styles */
}

/* Component styles from proposal */
```

### 4. Implement Templates

Copy HTML structure from proposal, but **preserve Stimulus patterns exactly**. See CONTROLLERS.md for critical patterns.

### 5. Build and Test

```bash
npm run build:css
npm run build:templates
```

Test all pages: `/`, `/activity`, `/policy`, `/{collection}`, `/{collection}/{id}`

## Critical Lessons Learned

### CSS Specificity Override

When theme classes conflict with Tailwind utilities used by JavaScript, add explicit overrides:

```css
/* Button visibility - ensure JS class toggles work */
.theme-{name} .buy-button.hidden { display: none !important; }
.theme-{name} .buy-button.inline-flex { display: inline-flex !important; }
```

Without this, `.buy-button { display: block; }` overrides Tailwind's `hidden` class.

### Price Formatting

The `formatSats()` helper returns "1,234 sats". The Stimulus controller **already adds "BTC"** suffix when displaying totals.

**DO:** Use `.replace(' sats', '')` in templates to get just the number
**DON'T:** Add "BTC" or "sats" text in templates - causes duplication

```html
<!-- Correct -->
<span><%= formatSats(price).replace(' sats', '') %></span>

<!-- Wrong - will show "1,234 BTC BTC" -->
<span><%= formatSats(price) %> BTC</span>
```

### Button Initial States

The buy button flow has specific initial states:

| Button | Initial Class | Purpose |
|--------|---------------|---------|
| Connect | `hide-on-connected` | Shows when wallet disconnected |
| Prepare | `show-on-connected` | Shows when wallet connected |
| Buy | `hidden` | Hidden until prepare completes |

The `#setBuyState()` method in inscription_controller.js:
1. Removes `show-on-connected` from prepare button
2. Adds `hidden` to prepare button
3. Removes `hidden` from buy button
4. Adds `inline-flex` to buy button

### Spinner Handling

Some themes don't fit spinners. Keep the target elements but hide them:

```html
<span data-inscription-target="prepareSpinner" style="display: none;"></span>
<span data-inscription-target="buySpinner" style="display: none;"></span>
```

The Stimulus controller toggles `button-spinner-hidden` class, which won't conflict with `display: none`.

### Modal States

Wallet modal uses `data-state`:

```html
<div data-wallet-target="selector" data-state="closed">
```

CSS must handle both states:

```css
[data-state="closed"] { display: none; }
[data-state="open"] { display: flex; /* or block */ }
```

## Reference Files

| File | Purpose |
|------|---------|
| CONTROLLERS.md | Stimulus controller patterns |
| CHECKLIST.md | Pre-flight verification |
| TROUBLESHOOTING.md | Common issues and fixes |

## See Also

- `/makeover propose` - Generate proposals
- `app/themes/default/` - Reference implementation
- `inscription_controller.js` - Buy flow JavaScript
