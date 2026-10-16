import { log } from './log'

const INTERACTIVE =
  'button, a, input, select, textarea, summary, [role="button"], [role="menuitem"], [role="tab"], [role="checkbox"], [role="switch"], [role="option"]'

function label(el: Element): string {
  const text = el.getAttribute('aria-label') ?? el.getAttribute('title') ?? el.textContent
  return text.replace(/\s+/g, ' ').trim().slice(0, 60)
}

function describe(el: Element): string {
  const tag = el.tagName.toLowerCase()
  const name = el.getAttribute('name')
  if (name) return `${tag}[name=${name}]`
  const text = label(el)
  if (text) return `${tag} "${text}"`
  return el.id ? `${tag}#${el.id}` : tag
}

function fieldValue(el: EventTarget): unknown {
  if (el instanceof HTMLInputElement) {
    if (el.type === 'password') return '[redacted]'
    if (el.type === 'checkbox' || el.type === 'radio') return el.checked
    return el.value
  }
  if (el instanceof HTMLSelectElement || el instanceof HTMLTextAreaElement) return el.value
  return undefined
}

/**
 * Logs every click on an interactive element, every committed field change, and
 * every uncaught error, so the log shows which user action came before the
 * repository calls it triggered. Returns an uninstall function.
 */
export function installActionLogging(win: Window): () => void {
  const route = () => win.location.hash || '#/'

  const onClick = (e: MouseEvent) => {
    const el = e.target instanceof Element ? e.target.closest(INTERACTIVE) : null
    if (el) log.info('ui:click', { target: describe(el), route: route() })
  }
  const onChange = (e: Event) => {
    if (e.target instanceof Element) {
      log.info('ui:change', { target: describe(e.target), value: fieldValue(e.target), route: route() })
    }
  }
  const onError = (e: ErrorEvent) => {
    log.error('ui:uncaughtError', { message: e.message, error: e.error })
  }
  const onRejection = (e: Event) => {
    log.error('ui:unhandledRejection', { error: Reflect.get(e, 'reason') })
  }

  win.document.addEventListener('click', onClick, true)
  win.document.addEventListener('change', onChange, true)
  win.addEventListener('error', onError)
  win.addEventListener('unhandledrejection', onRejection)
  return () => {
    win.document.removeEventListener('click', onClick, true)
    win.document.removeEventListener('change', onChange, true)
    win.removeEventListener('error', onError)
    win.removeEventListener('unhandledrejection', onRejection)
  }
}
