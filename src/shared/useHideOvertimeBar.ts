import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { UseMutationResult } from '@tanstack/react-query'
import type { ConfigRepository } from '../infra/repositories/types'
import { invalidateConfig } from './queryKeys'

/** Persists `showOvertimeBar: false` when the user dismisses the OvertimeBar. */
export function useHideOvertimeBar(configRepo: ConfigRepository): UseMutationResult<void, Error, void> {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const cfg = await configRepo.get()
      await configRepo.save({ ...cfg, showOvertimeBar: false })
    },
    onSuccess: () => invalidateConfig(queryClient),
  })
}
