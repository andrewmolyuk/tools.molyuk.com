/**
 * Shared assertions for the suites in this folder.
 *
 * Deliberately tiny and dependency-free, to match the rest of the project: a test
 * runner that needs installing would be the first dependency added in the whole
 * repository. Each check reports itself so a failure names what was expected without
 * anyone re-reading the source.
 */

let passed = 0
let failed = 0
const failures = []

export function section(title) {
  console.log(`\n--- ${title} ---`)
}

export function eq(label, got, want) {
  const ok = String(got) === String(want)
  if (ok) {
    passed++
    console.log(`ok   ${label}: ${got}`)
  } else {
    failed++
    failures.push(label)
    console.log(`FAIL ${label}\n     got  ${got}\n     want ${want}`)
  }
  return ok
}

export function near(label, got, want, tolerance) {
  const ok = Math.abs(got - want) <= tolerance
  if (ok) {
    passed++
    console.log(`ok   ${label}: ${typeof got === 'number' ? got.toFixed(4) : got}`)
  } else {
    failed++
    failures.push(label)
    console.log(`FAIL ${label}\n     got  ${got}\n     want ~${want} (±${tolerance})`)
  }
  return ok
}

export function note(text) {
  console.log(`     ${text}`)
}

/** Machine-readable last line, so the runner can total the checks across suites. */
export function done() {
  console.log(`\n##RESULT passed=${passed} failed=${failed}`)
  if (failed) {
    console.log(`${failed} FAILURES: ${failures.join(', ')}`)
    process.exit(1)
  }
  console.log('ALL PASS')
  process.exit(0)
}
