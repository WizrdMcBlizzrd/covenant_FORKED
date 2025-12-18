import { POLICY, POLICY_YAML } from '../config.js'
import { renderPolicy } from '../helpers/policy.js'
import { htmlResponse } from './html_response.js'
import { getSellerTaprootAddress } from '../utils/sell_address.js'

export async function policyController(c) {
  const walletAddress = await getSellerTaprootAddress(c.env)
  const html = renderPolicy({ policy: POLICY, policyYaml: POLICY_YAML, walletAddress })

  return htmlResponse(c, html)
}
