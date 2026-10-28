// @vitest-environment node
const fs = require('fs')
const os = require('os')
const path = require('path')
const { resolveConfigPath } = require('./json-files.cjs')

describe('resolveConfigPath', () => {
  let dir
  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tt-cfg-'))
    fs.mkdirSync(path.join(dir, 'storage'))
  })
  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true })
  })

  it('points at config.json in the local data folder when local-folder mode is on', () => {
    const folder = path.join(dir, 'OneDrive')
    fs.mkdirSync(folder)
    fs.writeFileSync(path.join(dir, 'storage', 'local-folder-mode'), 'true')
    fs.writeFileSync(path.join(dir, 'storage', 'local-folder-path'), JSON.stringify(folder))

    expect(resolveConfigPath(path.join(dir, 'storage'))).toBe(path.join(folder, 'config.json'))
  })

  it('falls back to config.json in storage when local-folder mode is off', () => {
    expect(resolveConfigPath(path.join(dir, 'storage'))).toBe(path.join(dir, 'storage', 'config.json'))
  })
})
