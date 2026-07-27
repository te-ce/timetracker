import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { QUERY_KEYS, invalidateConfig } from '../../shared/queryKeys'
import type { ConfigRepository } from '../../infra/repositories/types'

interface Props {
  repository: ConfigRepository
}

export function SharePointSettings({ repository }: Props) {
  const queryClient = useQueryClient()
  const { data: config } = useQuery({ queryKey: QUERY_KEYS.config, queryFn: () => repository.get() })
  const [draft, setDraft] = useState<string | null>(null)

  const currentUrl = config?.sharepointUrl ?? ''
  const value = draft ?? currentUrl

  const mutation = useMutation({
    mutationFn: async (url: string) => {
      const current = await repository.get()
      await repository.save({ ...current, sharepointUrl: url.trim() || null })
    },
    onSuccess: () => {
      setDraft(null)
      invalidateConfig(queryClient)
    },
  })

  function handleSave() {
    mutation.mutate(value)
  }

  const isDirty = draft !== null && draft.trim() !== currentUrl

  return (
    <section aria-label="SharePoint workbook settings" className="flex flex-col gap-3">
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">SharePoint Workbook</h3>
      <p className="text-xs text-gray-500 dark:text-gray-400">
        Paste the SharePoint URL of your Excel workbook. Used for sprint export.
      </p>
      <div className="flex gap-2">
        <input
          type="url"
          aria-label="SharePoint workbook URL"
          placeholder="https://company.sharepoint.com/sites/…/timetracking.xlsx"
          value={value}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => {
            if (isDirty) handleSave()
          }}
          className="flex-1 rounded border px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 dark:placeholder-gray-400 dark:focus:ring-indigo-500"
        />
        {isDirty && (
          <button
            type="button"
            onClick={handleSave}
            disabled={mutation.isPending}
            className="rounded bg-indigo-600 dark:bg-indigo-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 dark:hover:bg-indigo-400 disabled:opacity-50"
          >
            Save
          </button>
        )}
      </div>
      {mutation.isError && (
        <p role="alert" className="text-xs text-red-600">
          Failed to save URL. Please try again.
        </p>
      )}
      {config?.sharepointUrl && (
        <p className="truncate text-xs text-green-700 dark:text-emerald-400">✓ {config.sharepointUrl}</p>
      )}
    </section>
  )
}
