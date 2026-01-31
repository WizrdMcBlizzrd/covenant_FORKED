#!/usr/bin/env node
import dotenv from 'dotenv'
import fs from 'node:fs/promises'

dotenv.config({ path: '.dev.vars.app' })

const DEFAULT_COUNT = 10000
const DEFAULT_BATCH = 25
const DEFAULT_TIMEOUT_MS = 120000
const DEFAULT_MIN_BYTES = 60
const DEFAULT_MODEL = 'grok-4-1-fast-non-reasoning'
const DEFAULT_OUT = 'app/assets/javascripts/spam.js'
const DEFAULT_TEMPERATURE = 1.3

function getArg(flag, fallback = null) {
  const idx = process.argv.indexOf(flag)
  if (idx === -1) return fallback
  const next = process.argv[idx + 1]
  if (!next || next.startsWith('--')) return fallback
  return next
}

function toInt(value, fallback) {
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

function toFloat(value, fallback) {
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function ensureDir(path) {
  const parts = path.split('/').slice(0, -1)
  if (parts.length === 0) return Promise.resolve()
  return fs.mkdir(parts.join('/'), { recursive: true })
}

async function loadExisting(path) {
  try {
    const content = await fs.readFile(path, 'utf8')
    const match = content.match(/export const SPAM_LINES = (\[[\s\S]*\])/)
    if (match) return JSON.parse(match[1])
    const data = JSON.parse(content)
    return Array.isArray(data) ? data : []
  } catch {
    return []
  }
}

async function saveLines(path, lines) {
  await ensureDir(path)
  const payload = `export const SPAM_LINES = ${JSON.stringify(Array.from(lines), null, 2)}\n`
  await fs.writeFile(path, payload, 'utf8')
}

function isAsciiPrintable(value) {
  return /^[\x20-\x7E]+$/.test(value)
}

function cleanLine(line) {
  return line
    .replace(/^\s*[-*•\d]+[.)\s]+/, '')
    .replace(/\s*\([^)]{0,30}\)\s*$/, '')
    .replace(/^\*+|\*+$/g, '')
    .replace(/^["']+|["']+$/g, '')
    .trim()
}


function buildPrompt({ count, minBytes }) {
  return [
    `Generate ${count} one-liners that sound like Bitcoin maximalists complaining about ordinals and spam.`,
    `Tone: righteous indignation, technical grievances, culture war energy. Like tweets from hardcore Bitcoiners who hate inscriptions.`,
    `Topics: UTXO bloat, wasted block space, relay policy, fee market distortion, attack on Bitcoin, miners enabling spam, nodes under attack.`,
    `Sound authentic - like real crypto twitter discourse. Vary between serious and sardonic.`,
    `No real names. No quotes. No numbering. ASCII only. ${minBytes}+ chars each.`,
    `Output raw lines separated by newlines.`
  ].join(' ');
}

async function requestBatch({ baseUrl, apiKey, model, temperature, count, minBytes, maxOutputTokens, timeoutMs }) {
  const body = {
    model,
    messages: [
      {
        role: 'system',
        content: 'You generate short, realistic, original one-line statements. Follow constraints exactly.'
      },
      {
        role: 'user',
        content: buildPrompt({ count, minBytes })
      }
    ],
    temperature,
    max_tokens: maxOutputTokens
  }

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  let response
  try {
    response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: controller.signal
    })
  } finally {
    clearTimeout(timeout)
  }

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`xAI API error ${response.status}: ${text}`)
  }

  const json = await response.json()
  if (Array.isArray(json.choices) && json.choices[0]?.message?.content) {
    return String(json.choices[0].message.content)
  }

  return ''
}

async function main() {
  const apiKey = process.env.XAI_API_KEY
  if (!apiKey) {
    console.error('Missing XAI_API_KEY')
    process.exit(1)
  }

  const count = toInt(getArg('--count'), DEFAULT_COUNT)
  const batch = toInt(getArg('--batch'), DEFAULT_BATCH)
  const minBytes = toInt(getArg('--min-bytes'), DEFAULT_MIN_BYTES)
  const model = getArg('--model', DEFAULT_MODEL)
  const out = getArg('--out', DEFAULT_OUT)
  const temperature = toFloat(getArg('--temperature'), DEFAULT_TEMPERATURE)
  const maxOutputTokensArg = toInt(getArg('--max-output-tokens'), null)
  const timeoutMs = toInt(getArg('--timeout'), DEFAULT_TIMEOUT_MS)
  const baseUrl = process.env.XAI_BASE_URL || 'https://api.x.ai/v1'

  const encoder = new TextEncoder()
  const existing = await loadExisting(out)
  const lines = new Set(existing)
  console.log(`Loaded ${lines.size} existing lines from ${out}`)

  if (lines.size >= count) {
    console.log(`Already have ${lines.size}/${count} lines, nothing to do`)
    return
  }

  const maxBatchesArg = toInt(getArg('--max-batches'), null)
  const maxBatches = Math.max(1, maxBatchesArg ?? Math.ceil(count / batch) * 2)

  for (let i = 0; i < maxBatches && lines.size < count; i++) {
    const remaining = count - lines.size
    const requestCount = Math.min(batch, remaining)
    const maxOutputTokens = maxOutputTokensArg ?? Math.max(800, requestCount * 25)
    console.log(`Batch ${i + 1}/${maxBatches} - requesting ${requestCount} lines (max_tokens: ${maxOutputTokens})...`)
    const text = await requestBatch({
      baseUrl,
      apiKey,
      model,
      temperature,
      count: requestCount,
      minBytes,
      maxOutputTokens,
      timeoutMs
    })

    const rawLines = text.split('\n').map(cleanLine).filter(Boolean)
    for (const line of rawLines) {
      if (!isAsciiPrintable(line)) continue
      if (encoder.encode(line).length < minBytes) continue
      lines.add(line)
      if (lines.size >= count) break
    }

    await saveLines(out, lines)
    console.log(`Collected ${lines.size}/${count} lines (saved)`)
  }

  if (lines.size < count) {
    console.error(`Only generated ${lines.size} valid lines (requested ${count}).`)
  } else {
    console.log(`Done! ${lines.size} lines saved to ${out}`)
  }
}

main().catch((error) => {
  console.error(error?.message || error)
  process.exit(1)
})
