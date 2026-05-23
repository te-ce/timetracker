import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { QUERY_KEYS } from '../hooks/queryKeys'
import type { ConfigRepository } from '../repositories/types'

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
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.config })
    },
  })

  function handleSave() {
    mutation.mutate(value)
  }

  const isDirty = draft !== null && draft.trim() !== currentUrl

  return (
    <section aria-label="SharePoint workbook settings" className="flex flex-col gap-3">
      <h3 className="text-sm font-semibold text-gray-700">SharePoint Workbook</h3>
      <p className="text-xs text-gray-500">
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
          className="flex-1 rounded border px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
        />
        {isDirty && (
          <button
            onClick={handleSave}
            disabled={mutation.isPending}
            className="rounded bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
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
        <p className="truncate text-xs text-green-700">✓ {config.sharepointUrl}</p>
      )}
    </section>
  )
}
