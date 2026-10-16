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

  return { write, file }
}

module.exports = { createLogFile }
