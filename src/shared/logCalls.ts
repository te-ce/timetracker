import { log } from './log'

// ponytail: name-prefix heuristic for reads; tag methods explicitly if a read gets misnamed.
const READ = /^(get|find|list|load|read|is|has)/

/**
 * Wraps every method of `target` so each call is logged as `<name>.<method>`
 * with its arguments, duration, and error if it failed. Reads log at debug.
 */
export function logCalls<T extends object>(
  target: T,
  name: string,
  pickArgs: (args: unknown[]) => unknown = (args) => args,
): T {
  return new Proxy(target, {
    get(t, prop, receiver) {
      const value: unknown = Reflect.get(t, prop, receiver)
      if (typeof value !== 'function' || typeof prop !== 'string') return value
      const event = `${name}.${prop}`
      const level = READ.test(prop) ? 'debug' : 'info'
      return (...args: unknown[]) => {
        const started = performance.now()
        const done = (error?: unknown) => {
          const data = { args: pickArgs(args), ms: Math.round(performance.now() - started) }
          if (error === undefined) log[level](event, data)
          else log.error(event, { ...data, error })
        }
        let result: unknown
        try {
          result = Reflect.apply(value, t, args)
        } catch (e) {
          done(e)
          throw e
        }
        if (!(result instanceof Promise)) {
          done()
          return result
        }
        return result.then(
          (v: unknown) => {
            done()
            return v
          },
          (e: unknown) => {
            done(e)
            throw e
          },
        )
      }
    },
  })
}
