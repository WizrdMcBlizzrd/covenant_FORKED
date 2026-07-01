import { renderPage } from '../themes/theme.js'
import { htmlResponse } from './html_response.js'
import { assets } from '../../generated/assets.js'

export async function galleryController(c) {
  const html = renderPage({
    viewName: 'gallery.html',
    vars: {
      title: 'Bitcoin Knotzi Gallery',
      assets
    }
  })

  return htmlResponse(c, html, {
    cacheControl: 'public, max-age=0, s-maxage=30'
  })
}
