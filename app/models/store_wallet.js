import * as btc from "@scure/btc-signer"
import { hex } from "@scure/base"
import { pubSchnorr } from '@scure/btc-signer/utils.js'

export class StoreWallet {
  #p2tr
  #privateKeyBytes

  static fromEnv(env) {
    const privateKey = env.SELLING_WALLET_PRIVATE_KEY
    if (!privateKey) throw new Error("Missing SELLING_WALLET_PRIVATE_KEY")

    return new StoreWallet({ privateKey })
  }

  constructor({ privateKey }) {
    this.#privateKeyBytes = hex.decode(privateKey)
    this.#p2tr = btc.p2tr(pubSchnorr(this.#privateKeyBytes))
  }

  get taprootAddress() {
    return this.#p2tr.address
  }

  get tapInternalKey() {
    return this.#p2tr.tapInternalKey
  }

  signTxInput(tx, inputIndex) {
    tx.signIdx(this.#privateKeyBytes, inputIndex)
  }
}
