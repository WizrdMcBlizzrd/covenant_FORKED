import { CONFIG, POLICY } from '../config.js'

async function checkDatabase(db) {
  const checks = []

  if (!db) {
    checks.push({ name: 'D1 Binding', ok: false, detail: 'DB binding not found' })
    return checks
  }

  checks.push({ name: 'D1 Binding', ok: true, detail: 'Connected' })

  const tables = [
    { name: 'orders', query: 'SELECT COUNT(*) as count FROM orders' },
    { name: 'inscription_metadata', query: 'SELECT COUNT(*) as count FROM inscription_metadata' },
    { name: 'collection_inscriptions', query: 'SELECT COUNT(*) as count FROM collection_inscriptions' }
  ]

  for (const table of tables) {
    try {
      const row = await db.prepare(table.query).first()
      const count = row?.count ?? 0
      checks.push({ name: `Table: ${table.name}`, ok: true, detail: `${count} ${count === 1 ? 'row' : 'rows'}` })
    } catch (error) {
      checks.push({ name: `Table: ${table.name}`, ok: false, detail: error?.message ?? String(error) })
    }
  }

  try {
    const pending = await db.prepare("SELECT COUNT(*) as count FROM orders WHERE status = 'pending'").first()
    const confirmed = await db.prepare("SELECT COUNT(*) as count FROM orders WHERE status = 'confirmed'").first()
    const failed = await db.prepare("SELECT COUNT(*) as count FROM orders WHERE status = 'failed'").first()
    checks.push({
      name: 'Order Breakdown',
      ok: true,
      detail: `${confirmed?.count ?? 0} confirmed, ${pending?.count ?? 0} pending, ${failed?.count ?? 0} failed`
    })
  } catch {
    // already caught above
  }

  return checks
}

async function checkApi(url, label) {
  if (!url) return { name: label, ok: false, detail: 'URL not configured' }

  try {
    const response = await fetch(url, { method: 'GET', signal: AbortSignal.timeout(5000) })
    if (response.ok) {
      return { name: label, ok: true, detail: `${response.status} OK` }
    }
    return { name: label, ok: false, detail: `HTTP ${response.status}` }
  } catch (error) {
    return { name: label, ok: false, detail: error?.message ?? String(error) }
  }
}

function checkConfig() {
  const checks = []

  checks.push({
    name: 'store.yml loaded',
    ok: Boolean(CONFIG),
    detail: CONFIG ? 'Loaded' : 'Failed to load'
  })

  checks.push({
    name: 'Theme',
    ok: Boolean(CONFIG?.theme),
    detail: CONFIG?.theme || 'Not set'
  })

  const apis = [
    ['ord_api_url', 'Ordinals API URL'],
    ['electrs_api_url', 'Electrs API URL'],
    ['mempool_space_api_url', 'Mempool Space API URL']
  ]

  for (const [key, label] of apis) {
    const value = CONFIG?.[key]
    checks.push({
      name: label,
      ok: Boolean(value),
      detail: value || 'Not configured'
    })
  }

  checks.push({
    name: 'Page Size',
    ok: Number.isInteger(CONFIG?.page_size) && CONFIG.page_size > 0,
    detail: CONFIG?.page_size ?? 'Not set'
  })

  checks.push({
    name: 'Artist Name',
    ok: Boolean(CONFIG?.artist_name),
    detail: CONFIG?.artist_name || 'Not set'
  })

  return checks
}

function checkPolicy() {
  const checks = []

  checks.push({
    name: 'policy.yml loaded',
    ok: Boolean(POLICY),
    detail: POLICY ? 'Loaded' : 'Failed to load'
  })

  const sellingCount = POLICY?.selling?.length ?? 0
  checks.push({
    name: 'Standard Collections',
    ok: true,
    detail: `${sellingCount} configured`
  })

  const hasLaunchpad = Boolean(POLICY?.launchpad)
  const launchpadCount = POLICY?.launchpad?.collections?.length ?? 0
  checks.push({
    name: 'Launchpad',
    ok: true,
    detail: hasLaunchpad ? `Enabled (${launchpadCount} collections)` : 'Disabled'
  })

  if (hasLaunchpad) {
    checks.push({
      name: 'Launchpad Seller Address',
      ok: Boolean(POLICY.launchpad.seller_address),
      detail: POLICY.launchpad.seller_address || 'Not set'
    })
  }

  const allCollections = [...(POLICY?.selling ?? []), ...(POLICY?.launchpad?.collections ?? [])]
  for (const collection of allCollections) {
    const issues = []
    if (!collection.payment_address) issues.push('missing payment_address')
    if (!collection.price_sats) issues.push('missing price_sats')
    if (!collection.parent_inscription_id && !collection.gallery_inscription_id && !collection.inscription_ids?.length) {
      issues.push('missing inscription source')
    }

    checks.push({
      name: `Collection: ${collection.title || collection.slug}`,
      ok: issues.length === 0,
      detail: issues.length === 0
        ? `${collection.price_sats} sats, payment to ${collection.payment_address}`
        : issues.join(', ')
    })
  }

  return checks
}

function checkBindings(env) {
  const checks = []

  checks.push({
    name: 'DB (D1)',
    ok: Boolean(env.DB),
    detail: env.DB ? 'Bound' : 'Missing'
  })

  checks.push({
    name: 'SIGNING_AGENT (DO)',
    ok: Boolean(env.SIGNING_AGENT),
    detail: env.SIGNING_AGENT ? 'Bound' : 'Missing'
  })

  checks.push({
    name: 'LAUNCHPAD_RESERVATIONS (DO)',
    ok: Boolean(env.LAUNCHPAD_RESERVATIONS),
    detail: env.LAUNCHPAD_RESERVATIONS ? 'Bound' : 'Missing'
  })

  checks.push({
    name: 'LAUNCHPAD_ADDRESS_LIMITER',
    ok: Boolean(env.LAUNCHPAD_ADDRESS_LIMITER),
    detail: env.LAUNCHPAD_ADDRESS_LIMITER ? 'Bound' : 'Missing (optional)'
  })

  checks.push({
    name: 'LAUNCHPAD_IP_LIMITER',
    ok: Boolean(env.LAUNCHPAD_IP_LIMITER),
    detail: env.LAUNCHPAD_IP_LIMITER ? 'Bound' : 'Missing (optional)'
  })

  const hasTurnstile = Boolean(env.TURNSTILE_CREDENTIALS)
  checks.push({
    name: 'Turnstile',
    ok: true,
    detail: hasTurnstile ? 'Configured' : 'Not configured (optional)'
  })

  return checks
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function renderSetupHtml({ configChecks, policyChecks, bindingChecks, dbChecks, apiChecks, collectionDbChecks }) {
  let sectionIndex = 0

  function renderRow(check, rowIndex) {
    const led = check.ok ? 'led-pass' : 'led-fail'
    const valueClass = check.ok ? 'val-pass' : 'val-fail'
    return `<div class="row" style="animation-delay:${rowIndex * 40}ms">
      <span class="led ${led}"></span>
      <span class="row-name">${escapeHtml(check.name)}</span>
      <span class="dots"></span>
      <span class="row-val ${valueClass}">${escapeHtml(String(check.detail))}</span>
    </div>`
  }

  function renderSection(label, tag, checks) {
    if (checks.length === 0) return ''
    const allOk = checks.every(c => c.ok)
    const idx = sectionIndex++
    const rows = checks.map((c, i) => renderRow(c, i)).join('')

    return `<section class="section" style="animation-delay:${idx * 120}ms">
      <div class="section-head">
        <span class="section-tag">${escapeHtml(tag)}</span>
        <h2 class="section-label">${escapeHtml(label)}</h2>
        <span class="section-status ${allOk ? 'status-pass' : 'status-fail'}">${allOk ? 'ALL PASS' : 'HAS ERRORS'}</span>
      </div>
      <div class="section-body">${rows}</div>
    </section>`
  }

  const totalChecks = [...configChecks, ...policyChecks, ...bindingChecks, ...dbChecks, ...apiChecks, ...collectionDbChecks]
  const passCount = totalChecks.filter(c => c.ok).length
  const failCount = totalChecks.filter(c => !c.ok).length
  const allGood = failCount === 0

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Covenant - Setup Diagnostics</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=Space+Grotesk:wght@500;700&display=swap" rel="stylesheet" />
  <style>
    :root {
      --bg: #0a0a0f;
      --surface: #111118;
      --border: #1e1e2a;
      --border-bright: #2a2a3a;
      --text: #b8b8c8;
      --text-dim: #5a5a70;
      --pass: #22c55e;
      --pass-dim: #166534;
      --pass-glow: rgba(34, 197, 94, 0.15);
      --fail: #ef4444;
      --fail-dim: #7f1d1d;
      --fail-glow: rgba(239, 68, 68, 0.15);
      --accent: #f59e0b;
      --mono: 'IBM Plex Mono', monospace;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: var(--mono);
      background: var(--bg);
      color: var(--text);
      line-height: 1.6;
      min-height: 100vh;
    }

    body::before {
      content: '';
      position: fixed;
      inset: 0;
      background: repeating-linear-gradient(
        0deg,
        transparent,
        transparent 2px,
        rgba(255, 255, 255, 0.008) 2px,
        rgba(255, 255, 255, 0.008) 4px
      );
      pointer-events: none;
      z-index: 100;
    }

    .wrap {
      max-width: 740px;
      margin: 0 auto;
      padding: 48px 24px 64px;
    }

    /* header */
    .header {
      margin-bottom: 48px;
      animation: fadeUp 0.5s ease both;
    }

    .header-top {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 20px;
    }

    .header-top a {
      color: var(--text-dim);
      text-decoration: none;
      font-size: 12px;
      letter-spacing: 0.05em;
      transition: color 0.2s;
    }

    .header-top a:hover { color: var(--accent); }

    .header-top .sep {
      color: var(--border-bright);
      font-size: 11px;
    }

    .title {
      font-family: var(--mono);
      font-size: 14px;
      font-weight: 600;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: var(--text-dim);
      margin-bottom: 24px;
    }

    .summary {
      display: flex;
      gap: 2px;
      align-items: stretch;
      height: 40px;
    }

    .summary-block {
      display: flex;
      align-items: center;
      padding: 0 16px;
      font-size: 13px;
      font-weight: 500;
      letter-spacing: 0.03em;
    }

    .summary-pass {
      background: var(--pass-glow);
      border: 1px solid var(--pass-dim);
      color: var(--pass);
      border-radius: 6px 0 0 6px;
    }

    .summary-fail {
      background: ${allGood ? 'var(--surface)' : 'var(--fail-glow)'};
      border: 1px solid ${allGood ? 'var(--border)' : 'var(--fail-dim)'};
      color: ${allGood ? 'var(--text-dim)' : 'var(--fail)'};
      border-radius: 0 6px 6px 0;
    }

    .summary-num {
      font-size: 18px;
      font-weight: 600;
      margin-right: 6px;
    }

    /* sections */
    .section {
      margin-bottom: 32px;
      animation: fadeUp 0.4s ease both;
    }

    .section-head {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 0;
      border-bottom: 1px solid var(--border);
      margin-bottom: 2px;
    }

    .section-tag {
      font-size: 10px;
      font-weight: 600;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: var(--bg);
      background: var(--accent);
      padding: 2px 7px;
      border-radius: 3px;
      flex-shrink: 0;
    }

    .section-label {
      font-size: 13px;
      font-weight: 500;
      color: var(--text);
      flex: 1;
      min-width: 0;
    }

    .section-status {
      font-size: 10px;
      font-weight: 600;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      flex-shrink: 0;
    }

    .status-pass { color: var(--pass); }
    .status-fail { color: var(--fail); }

    .section-body {
      border: 1px solid var(--border);
      border-top: none;
      border-radius: 0 0 6px 6px;
      overflow: hidden;
      background: var(--surface);
    }

    /* rows */
    .row {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 14px;
      font-size: 12.5px;
      border-bottom: 1px solid var(--border);
      animation: fadeIn 0.3s ease both;
    }

    .row:last-child { border-bottom: none; }

    .row:hover { background: rgba(255, 255, 255, 0.015); }

    .led {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      flex-shrink: 0;
    }

    .led-pass {
      background: var(--pass);
      box-shadow: 0 0 6px var(--pass), 0 0 2px var(--pass);
    }

    .led-fail {
      background: var(--fail);
      box-shadow: 0 0 6px var(--fail), 0 0 2px var(--fail);
      animation: pulse-fail 2s ease-in-out infinite;
    }

    .row-name {
      white-space: nowrap;
      font-weight: 500;
      color: var(--text);
      flex-shrink: 0;
    }

    .dots {
      flex: 1;
      min-width: 20px;
      border-bottom: 1px dotted var(--border-bright);
      height: 1px;
      align-self: flex-end;
      margin-bottom: 5px;
    }

    .row-val {
      text-align: right;
      word-break: break-all;
      max-width: 55%;
      flex-shrink: 1;
    }

    .val-pass { color: var(--text-dim); }
    .val-fail { color: var(--fail); }

    /* footer */
    .footer {
      margin-top: 48px;
      padding-top: 16px;
      border-top: 1px solid var(--border);
      animation: fadeUp 0.5s ease both;
      animation-delay: 0.6s;
    }

    .footer a {
      color: var(--text-dim);
      text-decoration: none;
      font-size: 12px;
      letter-spacing: 0.04em;
      transition: color 0.2s;
    }

    .footer a:hover { color: var(--accent); }

    @keyframes fadeUp {
      from { opacity: 0; transform: translateY(8px); }
      to { opacity: 1; transform: translateY(0); }
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes pulse-fail {
      0%, 100% { box-shadow: 0 0 6px var(--fail), 0 0 2px var(--fail); }
      50% { box-shadow: 0 0 10px var(--fail), 0 0 4px var(--fail); }
    }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="header">
      <div class="header-top">
        <a href="/">covenant</a>
        <span class="sep">/</span>
        <a href="/setup">setup</a>
      </div>
      <div class="title">Deployment Diagnostics</div>
      <div class="summary">
        <div class="summary-block summary-pass"><span class="summary-num">${passCount}</span> passed</div>
        <div class="summary-block summary-fail"><span class="summary-num">${failCount}</span> failed</div>
      </div>
    </div>

    ${renderSection('Configuration', 'yml', configChecks)}
    ${renderSection('Policy', 'yml', policyChecks)}
    ${renderSection('Worker Bindings', 'env', bindingChecks)}
    ${renderSection('Database', 'd1', dbChecks)}
    ${renderSection('Collection Inventory', 'sync', collectionDbChecks)}
    ${renderSection('API Connectivity', 'net', apiChecks)}

    <div class="footer">
      <a href="/">&larr; back to store</a>
    </div>
  </div>
</body>
</html>`
}

export async function setupController(c) {
  const env = c.env

  const configChecks = checkConfig()
  const policyChecks = checkPolicy()
  const bindingChecks = checkBindings(env)

  const [dbChecks, ...apiResults] = await Promise.all([
    checkDatabase(env.DB),
    checkApi(CONFIG?.ord_api_url, 'Ordinals API'),
    checkApi(`${CONFIG?.electrs_api_url}/fee-estimates`, 'Electrs API'),
    checkApi(`${CONFIG?.mempool_space_api_url}/v1/prices`, 'Mempool Space API')
  ])

  const collectionDbChecks = []

  if (env.DB) {
    const allCollections = [...(POLICY?.selling ?? []), ...(POLICY?.launchpad?.collections ?? [])]

    for (const collection of allCollections) {
      try {
        const row = await env.DB.prepare(
          'SELECT COUNT(*) as count FROM collection_inscriptions WHERE collection_slug = ?1'
        ).bind(collection.slug).first()

        const soldRow = await env.DB.prepare(
          "SELECT COUNT(*) as count FROM orders WHERE collection_slug = ?1 AND status = 'confirmed'"
        ).bind(collection.slug).first()

        const inventoryCount = row?.count ?? 0
        const soldCount = soldRow?.count ?? 0

        collectionDbChecks.push({
          name: collection.title || collection.slug,
          ok: inventoryCount > 0,
          detail: `${inventoryCount} inscriptions synced, ${soldCount} sold`
        })
      } catch (error) {
        collectionDbChecks.push({
          name: collection.title || collection.slug,
          ok: false,
          detail: error?.message ?? String(error)
        })
      }
    }
  }

  const html = renderSetupHtml({
    configChecks,
    policyChecks,
    bindingChecks,
    dbChecks,
    apiChecks: apiResults,
    collectionDbChecks
  })

  return c.html(html, 200, {
    'content-type': 'text/html; charset=utf-8',
    'cache-control': 'no-store'
  })
}
