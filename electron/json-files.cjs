const fs = require('fs')
const path = require('path')

// Only a missing file reads as null. Anything else (corrupt JSON, EACCES,
// EBUSY) throws so the renderer never mistakes it for "empty" and writes a
// fresh file over the real data.
function readJsonFile(filePath) {
  let raw
  try {
    raw = fs.readFileSync(filePath, 'utf8')
  } catch (e) {
    if (e.code === 'ENOENT') return null
    throw e
  }
  try {
    return JSON.parse(raw)
  } catch (e) {
    throw new Error(`Corrupt JSON in ${filePath}`, { cause: e })
  }
}

// Write to a sibling temp file and rename over the target: a crash mid-write
// leaves the old file intact instead of a truncated one.
function writeJsonFileAtomic(filePath, json) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  const tmpPath = `${filePath}.${process.pid}.${Date.now()}.tmp`
  try {
    fs.writeFileSync(tmpPath, json)
    fs.renameSync(tmpPath, filePath)
  } catch (e) {
    fs.rmSync(tmpPath, { force: true })
    throw e
  }
}

function deleteFile(filePath) {
  try {
    fs.unlinkSync(filePath)
  } catch (e) {
    if (e.code !== 'ENOENT') throw e
  }
}

// A configured data folder that is gone (unmounted drive, renamed folder)
// must surface as an error, not be silently recreated empty.
function localFolderFile(basePath, key) {
  if (!fs.existsSync(basePath)) throw new Error(`Local data folder not found: ${basePath}`)
  const filename = key.endsWith('.json') ? key : `${key}.json`
  return path.join(basePath, filename)
}

module.exports = { readJsonFile, writeJsonFileAtomic, deleteFile, localFolderFile }
