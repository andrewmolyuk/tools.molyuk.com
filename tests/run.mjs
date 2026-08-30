/**
 * Runs every suite in this folder and totals the checks.
 *
 * Each suite is a separate process: they set up global state (a crypto polyfill, a DOM
 * shim) and a shared process would let one suite's setup silently satisfy another's
 * requirements. The total it writes is what the site displays, so the number on the page
 * is a count of checks that actually ran and passed, not a figure anyone typed in.
 */

import { spawnSync } from 'node:child_process'
import { readdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..')
const verbose = process.argv.includes('--verbose')

const suites = readdirSync(here)
  .filter((name) => name.endsWith('.test.mjs'))
  .sort()

let passed = 0
let failed = 0
const broken = []

for (const suite of suites) {
  const result = spawnSync(
    process.execPath,
    ['--experimental-strip-types', '--import', join(here, 'register.mjs'), join(here, suite)],
    { cwd: root, encoding: 'utf8' },
  )
  const output = `${result.stdout ?? ''}${result.stderr ?? ''}`
  const summary = output.match(/##RESULT passed=(\d+) failed=(\d+)/)

  if (!summary) {
    // No summary line means the suite crashed before it could report.
    failed++
    broken.push(suite)
    console.log(`CRASH ${suite}`)
    console.log(output.split('\n').slice(-12).join('\n'))
    continue
  }

  const suitePassed = Number(summary[1])
  const suiteFailed = Number(summary[2])
  passed += suitePassed
  failed += suiteFailed
  if (suiteFailed) broken.push(suite)

  const label = suiteFailed ? 'FAIL' : 'ok  '
  console.log(`${label} ${suite.replace('.test.mjs', '').padEnd(20)} ${suitePassed} checks${suiteFailed ? `, ${suiteFailed} failed` : ''}`)
  if (verbose || suiteFailed) {
    console.log(
      output
        .split('\n')
        .filter((line) => (suiteFailed ? !line.startsWith('ok ') : true))
        .map((line) => `     ${line}`)
        .join('\n'),
    )
  }
}

console.log(`\n${suites.length} suites, ${passed} checks passed${failed ? `, ${failed} failed` : ''}`)

if (failed) {
  console.log(`failing suites: ${broken.join(', ')}`)
  process.exit(1)
}

// Written so the page can state a number it did not invent. Committed, so a clean
// checkout builds without having to run the suite first.
const summaryFile = join(root, 'src', 'generated', 'tests.json')
writeFileSync(summaryFile, `${JSON.stringify({ suites: suites.length, checks: passed }, null, 2)}\n`)
console.log(`src/generated/tests.json: ${passed} checks across ${suites.length} suites`)
