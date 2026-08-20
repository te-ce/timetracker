import type { PendingDelete } from './pendingDelete'
import { ConfirmDialog } from '../../shared/ConfirmDialog'
import { categoryDisplay } from './categoryLabel'

export interface DeleteConfirmDialogProps {
  deleting: PendingDelete | null
  categoryDescriptions?: Record<string, string> | undefined
  preferCategoryDescriptionAsPrimary?: boolean | undefined
  onConfirm: (deleting: PendingDelete) => void
  onCancel: () => void
}

export function DeleteConfirmDialog({
  deleting,
  categoryDescriptions,
  preferCategoryDescriptionAsPrimary,
  onConfirm,
  onCancel,
}: DeleteConfirmDialogProps) {
  if (!deleting) return null
  const title = deleting.kind === 'period' ? 'Delete work period?' : 'Delete subtask?'
  const message =
    deleting.kind === 'period'
      ? `Delete the work period ${deleting.period.start} – ${deleting.period.end ?? 'now'}?`
      : `Delete the ${categoryDisplay(deleting.subtask.category, categoryDescriptions ?? {}, preferCategoryDescriptionAsPrimary ?? false).primary} subtask?`
  return (
    <ConfirmDialog
      title={title}
      message={message}
      confirmLabel="Delete"
      danger
      onConfirm={() => onConfirm(deleting)}
      onCancel={onCancel}
    />
  )
}
