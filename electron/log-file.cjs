const fs = require('fs')
const path = require('path')

// JSON lines, one entry per line, so `tail -f` and `jq` work on it directly.
// ponytail: one rotated file (timetracker.1.log); keep more generations if 2×maxBytes of history is too short.
function createLogFile(dir, { maxBytes = 5 * 1024 * 1024 } = {}) {
  const file = path.join(dir, 'timetracker.log')

  function write(entry) {
    const line = `${JSON.stringify(entry)}\n`
    try {
      fs.mkdirSync(dir, { recursive: true })
      let size = 0
      try {
        size = fs.statSync(file).size
      } catch {
        // No file yet.
      }
      if (size > 0 && size + Buffer.byteLength(line) > maxBytes) {
        fs.renameSync(file, path.join(dir, 'timetracker.1.log'))
      }
      fs.appendFileSync(file, line)
    } catch {
      // Logging must never take the app down.
    }
  }

  function readLines(f) {
    let raw
    try {
      raw = fs.readFileSync(f, 'utf8')
    } catch {
      return []
    }
    return raw.split('\n').flatMap((line) => {
      if (!line) return []
      try {
        return [JSON.parse(line)]
      } catch {
        // A crash mid-append can leave a partial last line.
        return []
      }
    })
  }

  // Oldest first: rotated file, then the current one.
  function read() {
    return [...readLines(path.join(dir, 'timetracker.1.log')), ...readLines(file)]
  }

  return { write, read, file }
}

module.exports = { createLogFile }
