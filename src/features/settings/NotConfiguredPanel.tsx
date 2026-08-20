import { clearBootstrapConfig } from '../../infra/auth/bootstrapConfig'

export function NotConfiguredPanel() {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 rounded-lg border border-amber-200 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/30 px-3 py-2">
        <span className="text-sm">💾</span>
        <span className="text-xs text-amber-800 dark:text-amber-400">
          Microsoft not configured — running in local-only mode
        </span>
      </div>
      <button
        type="button"
        onClick={() => {
          clearBootstrapConfig()
          window.location.reload()
        }}
        className="self-start rounded-lg bg-indigo-600 dark:bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 dark:hover:bg-indigo-400"
      >
        Configure Microsoft Azure AD
      </button>
    </div>
  )
}
