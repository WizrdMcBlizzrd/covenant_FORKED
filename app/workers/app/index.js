import { Hono } from 'hono'
import { homeController } from '../../controllers/home_controller.js'
import { policyController } from '../../controllers/policy_controller.js'
import { collectionController } from '../../controllers/collection_controller.js'
import { showCollectionInscriptionController } from '../../controllers/inscription_controller.js'
import { activityController } from '../../controllers/activity_controller.js'
import { executeSellController } from '../../controllers/sell_controller.js'
import { launchpadReserveController } from '../../controllers/launchpad_reserve_controller.js'
import { launchpadMintController } from '../../controllers/launchpad_mint_controller.js'
import { launchpadSalesController } from '../../controllers/launchpad_sales_controller.js'
import { launchpadProgressController } from '../../controllers/launchpad_progress_controller.js'
import { setupController } from '../../controllers/setup_controller.js'
import { runSyncCollectionsCron } from '../../crons/sync_collections_cron.js'
import { runOrdersCron } from '../../crons/orders_cron.js'
import { galleryController } from '../../controllers/gallery_controller.js'

export { LaunchpadReservationWorker } from '../launchpad/worker.js'

const app = new Hono()

app.onError((err, c) => {
  console.error(err?.message ? String(err.message) : String(err))
  return c.text('Internal Server Error', 500)
})

app.get('/', homeController)
app.get('/setup', setupController)
app.get('/policy', policyController)
app.get('/activity', activityController)
app.post('/sell/:slug', executeSellController)
app.post('/launchpad/:slug/reserve', launchpadReserveController)
app.post('/launchpad/:slug/mint', launchpadMintController)
app.get('/launchpad/:slug/sales', launchpadSalesController)
app.get('/launchpad/:slug/progress', launchpadProgressController)
app.get('/gallery', galleryController)



app.get('/api/knotzi-wallet', async (c) => {
  const address = String(c.req.query('address') || '').trim()

  const looksLikeBtcAddress =
    /^(bc1|tb1)[a-z0-9]{20,90}$/i.test(address) ||
    /^[13][a-km-zA-HJ-NP-Z1-9]{25,40}$/.test(address)

  if (!looksLikeBtcAddress) {
    return c.json({ error: 'Invalid Bitcoin address' }, 400)
  }

  const apiKey = c.env.ORDISCAN_API_KEY

  if (!apiKey) {
    return c.json({ error: 'Missing ORDISCAN_API_KEY secret' }, 500)
  }

  const url = `https://api.ordiscan.com/v1/address/${encodeURIComponent(address)}/inscription-ids`

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'X-API-KEY': apiKey,
      Accept: 'application/json'
    }
  })

  if (!response.ok) {
    const text = await response.text()
    return c.json({
      error: 'Wallet lookup failed',
      status: response.status,
      detail: text.slice(0, 500)
    }, 502)
  }

  const data = await response.json()

  const inscriptionIds = Array.isArray(data)
    ? data
    : Array.isArray(data.inscriptionIds)
      ? data.inscriptionIds
      : Array.isArray(data.inscription_ids)
        ? data.inscription_ids
        : Array.isArray(data.data)
          ? data.data
          : []

  return c.json({
    address,
    inscriptionIds
  }, {
    headers: {
      'Cache-Control': 'public, max-age=60'
    }
  })
})

app.get('/:collection', collectionController)
app.get('/:collection/:id', showCollectionInscriptionController)

export default {
  fetch: app.fetch,
  scheduled: (event, env, ctx) => {
    switch (event?.cron) {
      case '*/5 * * * *':
        runOrdersCron(event, env, ctx)
        return
      case '*/10 * * * *':
        runSyncCollectionsCron(event, env, ctx)
        return
      default:
        runOrdersCron(event, env, ctx)
        runSyncCollectionsCron(event, env, ctx)
        return
    }
  }
}
