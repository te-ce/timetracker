import { GraphApiWorkbookService, LocalFolderWorkbookService } from './workbookService'
import { getAccessToken } from '../auth/msalInstance'
import { isLocalFolderMode } from '../auth/bootstrapConfig'
import type { AppConfig } from '../repositories/types'
import type { WorkbookService } from './workbookService'

const localFolder = isLocalFolderMode()

export function createWorkbookService(config: AppConfig, isAuthenticated: boolean): WorkbookService {
  if (localFolder) {
    if (!config.localExcelFile) throw new Error('No local Excel file selected.')
    return new LocalFolderWorkbookService(config.localExcelFile)
  }
  if (!config.sharepointUrl || !isAuthenticated) throw new Error('SharePoint URL or auth missing.')
  return new GraphApiWorkbookService(config.sharepointUrl, getAccessToken)
}

export function isExportReady(config: AppConfig | undefined, isAuthenticated: boolean): boolean {
  if (!config) return false
  const hasMapping = Object.keys(config.categoryMapping ?? {}).length > 0
  if (localFolder) return !!config.localExcelFile && !!config.targetSheet && hasMapping
  return !!config.sharepointUrl && !!config.targetSheet && hasMapping && isAuthenticated
}
