#!/usr/bin/env node

// Derives a taproot private key (hex) from a BIP39 seed phrase.
// BIP86 path: m/86'/0'/ACCOUNT'/0/0
//
// Usage:
//   node seed-to-privkey.js "seed phrase here"
//   node seed-to-privkey.js "seed phrase here" 2

import { execSync } from "child_process"
import { mkdtempSync, rmSync } from "fs"
import { tmpdir } from "os"
import { join, resolve } from "path"
import { pathToFileURL } from "url"

const packages = ["@scure/bip39", "@scure/bip32", "@scure/btc-signer", "@scure/base"]

const tmp = mkdtempSync(join(tmpdir(), "seed-to-privkey-"))
execSync(`npm init -y && npm install --no-save ${packages.join(" ")}`, {
  cwd: tmp,
  stdio: "ignore"
})

const mod = (pkg) => import(pathToFileURL(resolve(tmp, "node_modules", pkg)).href)

const { mnemonicToSeedSync, validateMnemonic } = await mod("@scure/bip39/index.js")
const { wordlist } = await mod("@scure/bip39/wordlists/english.js")
const { HDKey } = await mod("@scure/bip32/index.js")
const { hex } = await mod("@scure/base/index.js")
const btc = await mod("@scure/btc-signer/index.js")
const { pubSchnorr } = await mod("@scure/btc-signer/utils.js")

rmSync(tmp, { recursive: true, force: true })

const mnemonic = process.argv[2]
const account = parseInt(process.argv[3] || "0", 10)

if (!mnemonic) {
  console.error('Usage: node seed-to-privkey.js "word1 word2 ... word12" [account]')
  process.exit(1)
}

if (isNaN(account) || account < 0) {
  console.error("Account must be a non-negative integer")
  process.exit(1)
}

if (!validateMnemonic(mnemonic, wordlist)) {
  console.error("Invalid mnemonic")
  process.exit(1)
}

const seed = mnemonicToSeedSync(mnemonic)
const master = HDKey.fromMasterSeed(seed)
const path = `m/86'/0'/0'/0/${account}`
const child = master.derive(path)

if (!child.privateKey) {
  console.error("Failed to derive private key")
  process.exit(1)
}

const privateKeyHex = hex.encode(child.privateKey)
const address = btc.p2tr(pubSchnorr(child.privateKey)).address

console.log(`\nPath:        ${path}`)
console.log(`Address:     ${address}`)
console.log(`Private key: ${privateKeyHex}`)
console.log("\nSet the private key as SELLING_WALLET_PRIVATE_KEY in .dev.vars.signing-agent\n")
