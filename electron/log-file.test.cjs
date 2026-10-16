// @vitest-environment node
const fs = require('fs')
const os = require('os')
const path = require('path')
const { createLogFile } = require('./log-file.cjs')

function readLines(file) {
  return fs
    .readFileSync(file, 'utf8')
    .trim()
    .split('\n')
    .map((line) => JSON.parse(line))
}

describe('createLogFile', () => {
  let dir
  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tt-log-'))
  })
  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true })
  })

  it('appends each entry as one JSON line, creating the folder', () => {
    const logDir = path.join(dir, 'logs')
    const log = createLogFile(logDir)
    log.write({ ts: '2026-10-16T09:00:00.000Z', level: 'info', source: 'main', event: 'app:ready' })
    log.write({ ts: '2026-10-16T09:00:01.000Z', level: 'error', source: 'renderer', event: 'x', data: { a: 1 } })

    expect(readLines(path.join(logDir, 'timetracker.log'))).toEqual([
      { ts: '2026-10-16T09:00:00.000Z', level: 'info', source: 'main', event: 'app:ready' },
      { ts: '2026-10-16T09:00:01.000Z', level: 'error', source: 'renderer', event: 'x', data: { a: 1 } },
    ])
  })

  it('rotates to timetracker.1.log once the file passes maxBytes, keeping one old file', () => {
    const log = createLogFile(dir, { maxBytes: 100 })
    const entry = (n) => ({ ts: 't', level: 'info', source: 'main', event: `e${n}`, data: 'x'.repeat(60) })
    log.write(entry(1))
    log.write(entry(2))
    log.write(entry(3))

    expect(readLines(path.join(dir, 'timetracker.1.log')).map((e) => e.event)).toEqual(['e2'])
    expect(readLines(path.join(dir, 'timetracker.log')).map((e) => e.event)).toEqual(['e3'])
  })

  it('never throws when the folder cannot be written', () => {
    const blocker = path.join(dir, 'file')
    fs.writeFileSync(blocker, '')
    const log = createLogFile(path.join(blocker, 'logs'))
    expect(() => log.write({ ts: 't', level: 'info', source: 'main', event: 'e' })).not.toThrow()
  })
})
