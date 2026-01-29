import { Collection } from '../models/collection.js'
import { renderLaunchpadProgress } from '../helpers/launchpad.js'
import { htmlResponse } from './html_response.js'
import { countPendingByCollection } from '../models/db/orders.js'
import { countAvailableInscriptions } from '../models/db/inscriptions.js'
import { LAUNCHPAD_CACHE_TTL_SECONDS } from '../utils/launchpad_cache.js'

export async function launchpadProgressController(c) {
  const slug = c.req.param('slug')
  const collection = Collection.lookup(slug)

  if (!collection.isLaunchpad) {
    return c.text('Not Found', 404)
  }

  const cache = caches.default
  const cacheKey = new Request(c.req.url, { method: 'GET' })
  const cached = await cache.match(cacheKey)
  if (cached) return cached

  const [parentInscription, availableCount, pendingCount] = await Promise.all([
    collection.parentInscription({ db: c.env.DB }),
    countAvailableInscriptions({ db: c.env.DB, collectionSlug: collection.slug }),
    countPendingByCollection({ db: c.env.DB, collectionSlug: collection.slug })
  ])

  const html = renderLaunchpadProgress({ collection, parentInscription, availableCount, pendingCount })
  const response = htmlResponse(c, html, {
    cacheControl: `public, max-age=0, s-maxage=${LAUNCHPAD_CACHE_TTL_SECONDS}, stale-while-revalidate=${LAUNCHPAD_CACHE_TTL_SECONDS}`
  })
  c.executionCtx.waitUntil(cache.put(cacheKey, response.clone()))
  return response
}
