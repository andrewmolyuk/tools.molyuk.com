import { parseCron, nextRuns, describeValues, CronError } from '../src/tools/cron/cron.ts'
import { done, eq } from './harness.mjs'

const iso = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
const runs = (expr, from, n=5) => nextRuns(parseCron(expr), new Date(from), n).map(iso)

console.log('--- field parsing ---')
eq('*/15 minutes', parseCron('*/15 * * * *').minute.values.join(','), '0,15,30,45')
eq('list', parseCron('1,2,3 * * * *').minute.values.join(','), '1,2,3')
eq('range', parseCron('0 9-17 * * *').hour.values.join(','), '9,10,11,12,13,14,15,16,17')
eq('range with step', parseCron('0 0-23/6 * * *').hour.values.join(','), '0,6,12,18')
eq('step from value', parseCron('5/20 * * * *').minute.values.join(','), '5,25,45')
eq('month names', parseCron('0 0 1 jan,jul *').month.values.join(','), '1,7')
eq('day names', parseCron('0 0 * * mon-fri').dayOfWeek.values.join(','), '1,2,3,4,5')
eq('sunday as 7 normalises to 0', parseCron('0 0 * * 7').dayOfWeek.values.join(','), '0')
eq('@daily', parseCron('@daily').hour.values.join(','), '0')
eq('@weekly dow', parseCron('@weekly').dayOfWeek.values.join(','), '0')

console.log('\n--- rejects bad input ---')
for (const bad of ['* * * *', '60 * * * *', '* 24 * * *', '0 0 32 * *', '0 0 * 13 *', '0 0 * * 8', 'x * * * *', '*/0 * * * *', '0 5-3 * * *', '']) {
  let threw = false
  try { parseCron(bad) } catch (e) { threw = e instanceof CronError }
  eq(`rejects ${JSON.stringify(bad)}`, threw, true)
}

console.log('\n--- next runs ---')
eq('every 15 min', runs('*/15 * * * *', '2026-03-10T09:07:00', 3).join(' | '), '2026-03-10 09:15 | 2026-03-10 09:30 | 2026-03-10 09:45')
eq('daily at 03:30', runs('30 3 * * *', '2026-03-10T09:07:00', 2).join(' | '), '2026-03-11 03:30 | 2026-03-12 03:30')
eq('same day if still ahead', runs('30 23 * * *', '2026-03-10T09:07:00', 1).join(''), '2026-03-10 23:30')
eq('weekdays 9am', runs('0 9 * * mon-fri', '2026-03-13T12:00:00', 3).join(' | '), '2026-03-16 09:00 | 2026-03-17 09:00 | 2026-03-18 09:00')
eq('feb 29 leap only', runs('0 0 29 2 *', '2026-01-01T00:00:00', 2).join(' | '), '2028-02-29 00:00 | 2032-02-29 00:00')
eq('@yearly', runs('@yearly', '2026-06-01T00:00:00', 2).join(' | '), '2027-01-01 00:00 | 2028-01-01 00:00')

console.log('\n--- the dom/dow OR rule ---')
// Both restricted: runs on the 1st OR any Monday. 2026-06-01 is itself a Monday.
eq('dom OR dow', runs('0 0 1 * mon', '2026-06-02T00:00:00', 4).join(' | '),
   '2026-06-08 00:00 | 2026-06-15 00:00 | 2026-06-22 00:00 | 2026-06-29 00:00')
eq('dom OR dow includes the 1st', runs('0 0 1 * mon', '2026-06-30T00:00:00', 2).join(' | '),
   '2026-07-01 00:00 | 2026-07-06 00:00')
// Only dow restricted: dom is * so it must not narrow anything.
eq('dow only', runs('0 0 * * sat', '2026-06-02T00:00:00', 2).join(' | '), '2026-06-06 00:00 | 2026-06-13 00:00')
// Only dom restricted.
eq('dom only', runs('0 0 15 * *', '2026-06-02T00:00:00', 2).join(' | '), '2026-06-15 00:00 | 2026-07-15 00:00')

console.log('\n--- no match within the horizon returns empty, does not hang ---')
const t0 = Date.now()
eq('feb 30 never runs', runs('0 0 30 2 *', '2026-01-01T00:00:00', 1).length, 0)
console.log(`  (took ${Date.now()-t0}ms)`)

console.log('\n--- describeValues ---')
eq('all', describeValues(parseCron('* * * * *').minute, 60), '*')
eq('collapses runs', describeValues(parseCron('0 9-17 * * *').hour, 24), '9-17')
eq('mixed', describeValues(parseCron('0,1,2,30 * * * *').minute, 60), '0-2,30')
eq('singles', describeValues(parseCron('*/15 * * * *').minute, 60), '0,15,30,45')

done()
