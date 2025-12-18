let cachedTaprootAddress = null
let taprootAddressLoad = null

async function loadSellerTaprootAddress(env) {
  const id = env.SIGNING_AGENT.idFromName('sell-address')
  const durableObject = env.SIGNING_AGENT.get(id)
  const response = await durableObject.fetch('https://signing-agent/sell/address', { method: 'GET' })

  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(typeof data?.error === 'string' ? data.error : 'Unable to fetch sell address')

  const taprootAddress = typeof data?.taprootAddress === 'string' ? data.taprootAddress : null
  if (!taprootAddress) throw new Error('Invalid sell address response')

  return taprootAddress
}

export async function getSellerTaprootAddress(env) {
  if (cachedTaprootAddress) return cachedTaprootAddress
  if (!taprootAddressLoad) taprootAddressLoad = loadSellerTaprootAddress(env)

  try {
    cachedTaprootAddress = await taprootAddressLoad
    return cachedTaprootAddress
  } finally {
    taprootAddressLoad = null
  }
}
