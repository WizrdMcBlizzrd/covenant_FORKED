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

function renderSetupHtml({ configChecks, policyChecks, bindingChecks, dbChecks, apiChecks, collectionDbChecks }) {
  function icon(ok) {
    return ok ? '&#x2705;' : '&#x274C;'
  }

  function renderSection(title, checks) {
    const rows = checks.map(check => `
      <tr>
        <td style="padding:6px 12px;border-bottom:1px solid #333">${icon(check.ok)}</td>
        <td style="padding:6px 12px;border-bottom:1px solid #333;font-weight:600">${escapeHtml(check.name)}</td>
        <td style="padding:6px 12px;border-bottom:1px solid #333;color:${check.ok ? '#86efac' : '#fca5a5'};word-break:break-all">${escapeHtml(String(check.detail))}</td>
      </tr>
    `).join('')

    const allOk = checks.every(c => c.ok)
    const headerColor = allOk ? '#86efac' : '#fca5a5'

    return `
      <div style="margin-bottom:32px">
        <h2 style="font-size:18px;margin-bottom:12px;color:${headerColor}">${icon(allOk)} ${escapeHtml(title)}</h2>
        <table style="width:100%;border-collapse:collapse;background:#1a1a2e;border-radius:8px;overflow:hidden">
          <thead>
            <tr style="background:#16213e">
              <th style="padding:8px 12px;text-align:left;width:40px"></th>
              <th style="padding:8px 12px;text-align:left">Check</th>
              <th style="padding:8px 12px;text-align:left">Status</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `
  }

  const totalChecks = [...configChecks, ...policyChecks, ...bindingChecks, ...dbChecks, ...apiChecks, ...collectionDbChecks]
  const passCount = totalChecks.filter(c => c.ok).length
  const failCount = totalChecks.filter(c => !c.ok).length
  const summaryColor = failCount === 0 ? '#86efac' : '#fca5a5'

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Covenant Setup</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f0f23; color: #e2e8f0; padding: 24px; line-height: 1.5; }
    a { color: #93c5fd; }
  </style>
</head>
<body>
  <div style="max-width:800px;margin:0 auto">
    <div style="margin-bottom:32px">
      <h1 style="font-size:28px;font-weight:700;margin-bottom:8px">Covenant Setup</h1>
      <p style="color:${summaryColor};font-size:16px;font-weight:600">${passCount} passed, ${failCount} failed</p>
      <p style="color:#94a3b8;font-size:13px;margin-top:4px">This page checks your deployment configuration, database, bindings, and API connectivity.</p>
    </div>

    ${renderSection('Configuration (store.yml)', configChecks)}
    ${renderSection('Policy (policy.yml)', policyChecks)}
    ${renderSection('Worker Bindings', bindingChecks)}
    ${renderSection('Database (D1)', dbChecks)}
    ${renderSection('Collection Inventory', collectionDbChecks)}
    ${renderSection('API Connectivity', apiChecks)}

    <div style="margin-top:40px;padding-top:16px;border-top:1px solid #333;color:#64748b;font-size:13px">
      <a href="/">← Back to store</a>
    </div>
  </div>
</body>
</html>`
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
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
