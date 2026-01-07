# Stimulus Controller Patterns

This document details every Stimulus controller pattern that themes must preserve exactly. Breaking these patterns will break functionality.

---

## Inscription Controller

**File:** `app/assets/javascripts/controllers/inscription_controller.js`
**Purpose:** Handles the entire purchase flow

### Targets

Every target attribute **must** exist in the template:

```javascript
static targets = [
  'form',              // The purchase form
  'connectButton',     // "Connect wallet" button
  'prepareButton',     // "Prepare Purchase" button
  'prepareSpinner',    // Spinner inside prepare button
  'prepareLabel',      // Text label in prepare button
  'buyButton',         // "Complete Purchase" button
  'buySpinner',        // Spinner inside buy button
  'buyLabel',          // Text label in buy button
  'optionalPayment',   // Optional payment checkboxes
  'fees',              // Fees container
  'feeRate',           // Fee rate display
  'fee',               // Network fee display
  'total',             // Total cost display
  'successPanel',      // Success message container
  'successTitle',      // Success title text
  'successLink',       // Link to mempool.space
  'errorPanel',        // Error message container
  'errorTitle',        // Error title text
  'errorMessage'       // Error message text
]
```

### Values

Data values passed from server:

```html
<section
  data-controller="inscription"
  data-inscription-price-value="<%= checkout.priceSats %>"
  data-inscription-inscription-metadata-value="<%= JSON.stringify(inscription.metadata) %>"
  data-inscription-payment-address-value="<%= config.payment_address %>"
>
```

### Actions

Event bindings:

```html
<!-- Section level -->
data-action="wallet:connected@window->inscription#onWalletConnected wallet:disconnected@window->inscription#onWalletDisconnected"

<!-- Prepare button -->
data-action="click->inscription#prepare"

<!-- Buy button -->
data-action="click->inscription#buy"

<!-- Optional payment checkbox -->
data-action="inscription#calculateCost"
```

### Button State Machine

```
                    ┌─────────────────┐
                    │  Page Load      │
                    └────────┬────────┘
                             │
              ┌──────────────┴──────────────┐
              │                             │
              ▼                             ▼
     ┌────────────────┐           ┌────────────────┐
     │ Wallet         │           │ Wallet         │
     │ Disconnected   │           │ Connected      │
     └────────┬───────┘           └────────┬───────┘
              │                             │
              ▼                             ▼
     ┌────────────────┐           ┌────────────────┐
     │ Show: Connect  │           │ Auto-trigger   │
     │ Hide: Prepare  │           │ prepare()      │
     │ Hide: Buy      │           └────────┬───────┘
     └────────────────┘                    │
                                           ▼
                                  ┌────────────────┐
                                  │ #setPreparingState()
                                  │ - Disable prepare
                                  │ - Show spinner
                                  │ - "Preparing..."
                                  └────────┬───────┘
                                           │
                                           ▼
                                  ┌────────────────┐
                                  │ #setBuyState()  │
                                  │ - Hide prepare │
                                  │ - Show buy     │
                                  └────────────────┘
```

### Class Transitions

**#setBuyState() does:**
```javascript
this.prepareButtonTarget.classList.remove('show-on-connected')
this.prepareButtonTarget.classList.add('hidden')
this.buyButtonTarget.classList.remove('hidden', 'purchase-success')
this.buyButtonTarget.classList.add('inline-flex')
```

**CSS must support these exact classes:**
- `hidden` - Tailwind utility, `display: none`
- `inline-flex` - Tailwind utility, `display: inline-flex`
- `show-on-connected` - Custom class for wallet-aware visibility
- `purchase-success` - Custom class for success state styling

### Spinner Classes

The controller toggles `button-spinner-hidden`:

```javascript
this.prepareSpinnerTarget.classList.remove('button-spinner-hidden')  // Show
this.prepareSpinnerTarget.classList.add('button-spinner-hidden')     // Hide
```

If theme doesn't use spinners, hide with inline style:
```html
<span data-inscription-target="prepareSpinner" style="display: none;"></span>
```

---

## Wallet Controller

**File:** `app/assets/javascripts/controllers/wallet_controller.js`
**Purpose:** Wallet connection modal and auth

### Targets

```javascript
static targets = ['selector', 'xverse', 'unisat']
```

### Modal State

Uses `data-state` attribute:

```html
<div data-wallet-target="selector" data-state="closed">
```

**Required CSS:**
```css
[data-state="closed"] {
  display: none;
}

[data-state="open"] {
  display: flex;  /* or appropriate display */
  position: fixed;
  inset: 0;
  z-index: 10000;
  align-items: center;
  justify-content: center;
}
```

### Actions

```html
<!-- Open modal -->
data-action="wallet#select"

<!-- Close modal -->
data-action="wallet#close"

<!-- Authorize with provider -->
data-action="wallet#authorize:prevent"
data-wallet-provider-param="xverse"  <!-- or "unisat" -->

<!-- Logout -->
data-action="wallet#logout:prevent"

<!-- Close on Escape -->
data-action="keydown.esc@window->wallet#close"
```

---

## Body-Class Controller

**File:** `app/assets/javascripts/controllers/body_class_controller.js`
**Purpose:** Toggle body classes on wallet connection

### Actions

```html
<body
  data-controller="body-class"
  data-action="wallet:connected@window->body-class#setConnected wallet:disconnected@window->body-class#setDisconnected"
>
```

### What It Does

When wallet connects: `document.body.classList.add('wallet-connected')`
When wallet disconnects: `document.body.classList.remove('wallet-connected')`

### Visibility Classes

Themes use these patterns for wallet-aware UI:

```css
/* Default: hide connected-only elements */
.show-on-connected {
  display: none;
}

.hide-on-connected {
  display: block;
}

/* When wallet connected: flip visibility */
.wallet-connected .show-on-connected {
  display: block;  /* or inline-flex, etc. */
}

.wallet-connected .hide-on-connected {
  display: none;
}
```

---

## Image Controller

**File:** `app/assets/javascripts/controllers/image_controller.js`
**Purpose:** Handle image/iframe loading states

### Targets

```javascript
static targets = ['skeleton', 'img', 'media']
```

### Actions

```html
<!-- On image element -->
data-action="load->image#loaded error->image#error"

<!-- On iframe element -->
data-action="load->image#loaded error->image#error"
```

### What It Does

On load: Hides skeleton, shows image with opacity transition
On error: Handles gracefully

### Template Pattern

```html
<div data-controller="image">
  <div class="skeleton" data-image-target="skeleton"></div>
  <img
    src="..."
    class="opacity-0 transition-opacity duration-300"
    data-image-target="img"
    data-action="load->image#loaded error->image#error"
  />
</div>
```

---

## Store Controller

**File:** `app/assets/javascripts/controllers/store_controller.js`
**Purpose:** AJAX pagination for collection pages

### Targets

```javascript
static targets = ['main']
```

### Actions

```html
<!-- Pagination link -->
data-action="click->store#paginate"
```

### What It Does

Intercepts pagination clicks, fetches page via AJAX, replaces main content.

---

## USD Controller

**File:** `app/assets/javascripts/controllers/usd_controller.js`
**Purpose:** Convert sats to USD display

### Data Attribute

```html
<div data-usd-sats="50000"></div>
```

Elements with `data-usd-sats` get USD conversion appended.

---

## Required Template Structure

### Inscription Page Minimum

```html
<section
  data-testid="inscription-page"
  data-controller="inscription"
  data-action="wallet:connected@window->inscription#onWalletConnected wallet:disconnected@window->inscription#onWalletDisconnected"
  data-inscription-price-value="<%= checkout.priceSats %>"
  data-inscription-inscription-metadata-value="<%= JSON.stringify(inscription.metadata) %>"
  data-inscription-payment-address-value="<%= config.payment_address %>"
>
  <!-- Content -->

  <form data-inscription-target="form">
    <!-- Optional payments with data-inscription-target="optionalPayment" -->

    <!-- Fees section -->
    <div data-inscription-target="fees">
      <span data-inscription-target="fee">-</span>
      <span data-inscription-target="feeRate">-</span>
      <span data-inscription-target="total">-</span>
    </div>

    <!-- Connect button (wallet disconnected) -->
    <button
      class="hide-on-connected"
      data-inscription-target="connectButton"
      data-action="wallet#select"
    >Connect Wallet</button>

    <!-- Prepare button (wallet connected, initial state) -->
    <button
      class="show-on-connected"
      data-inscription-target="prepareButton"
      data-action="click->inscription#prepare"
    >
      <span data-inscription-target="prepareSpinner"></span>
      <span data-inscription-target="prepareLabel">Prepare Purchase</span>
    </button>

    <!-- Buy button (hidden until prepared) -->
    <button
      class="hidden"
      data-testid="buy-button"
      data-inscription-target="buyButton"
      data-action="click->inscription#buy"
    >
      <span data-inscription-target="buySpinner"></span>
      <span data-inscription-target="buyLabel">Complete Purchase</span>
    </button>
  </form>

  <!-- Success panel -->
  <div data-inscription-target="successPanel" class="hidden">
    <span data-inscription-target="successTitle"></span>
    <a data-inscription-target="successLink" href=""></a>
  </div>

  <!-- Error panel -->
  <div data-inscription-target="errorPanel" class="hidden">
    <span data-inscription-target="errorTitle"></span>
    <span data-inscription-target="errorMessage"></span>
  </div>
</section>
```

### Layout Minimum

```html
<body
  data-controller="store body-class usd wallet"
  data-action="wallet:connected@window->body-class#setConnected wallet:disconnected@window->body-class#setDisconnected keydown.esc@window->wallet#close"
  class="theme-{name}"
>
  <!-- Navigation with wallet actions -->
  <a data-action="wallet#select" class="hide-on-connected">Connect</a>
  <a data-action="wallet#logout:prevent" class="show-on-connected">Disconnect</a>

  <!-- Wallet Modal -->
  <div data-wallet-target="selector" data-state="closed">
    <button data-action="wallet#close">Close</button>
    <button data-wallet-target="xverse" data-action="wallet#authorize:prevent" data-wallet-provider-param="xverse">Xverse</button>
    <button data-wallet-target="unisat" data-action="wallet#authorize:prevent" data-wallet-provider-param="unisat">Unisat</button>
  </div>

  <!-- Main content -->
  <main data-store-target="main">
    <%- body %>
  </main>
</body>
```
