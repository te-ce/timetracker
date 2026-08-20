import { GraphApiWorkbookService, LocalFolderWorkbookService } from './workbookService'
import { getAccessToken } from '../../infra/auth/msalInstance'
import { isLocalFolderMode } from '../../infra/auth/bootstrapConfig'
import type { AppConfig } from '../../infra/repositories/types'
import type { WorkbookService } from './workbookService'

const localFolder = isLocalFolderMode()

type WorkbookSource =
  | { ready: true; mode: 'local'; localExcelFile: string }
  | { ready: true; mode: 'graph'; sharepointUrl: string }
  | { ready: false }

function resolveWorkbookSource(config: AppConfig | undefined, isAuthenticated: boolean): WorkbookSource {
  if (!config) return { ready: false }
  if (localFolder) {
    if (!config.localExcelFile) return { ready: false }
    return { ready: true, mode: 'local', localExcelFile: config.localExcelFile }
  }
  if (!config.sharepointUrl || !isAuthenticated) return { ready: false }
  return { ready: true, mode: 'graph', sharepointUrl: config.sharepointUrl }
}

function buildFromSource(source: WorkbookSource): WorkbookService | null {
  if (!source.ready) return null
  return source.mode === 'local'
    ? new LocalFolderWorkbookService(source.localExcelFile)
    : new GraphApiWorkbookService(source.sharepointUrl, getAccessToken)
}

export function createWorkbookService(config: AppConfig, isAuthenticated: boolean): WorkbookService {
  const source = resolveWorkbookSource(config, isAuthenticated)
  if (!source.ready) {
    throw new Error(localFolder ? 'No local Excel file selected.' : 'SharePoint URL or auth missing.')
  }
  const service = buildFromSource(source)
  if (!service) throw new Error('Could not build a workbook service.')
  return service
}

export function buildWorkbookService(config: AppConfig | undefined, isAuthenticated: boolean): WorkbookService | null {
  return buildFromSource(resolveWorkbookSource(config, isAuthenticated))
}

export function isExportReady(config: AppConfig | undefined, isAuthenticated: boolean): boolean {
  const source = resolveWorkbookSource(config, isAuthenticated)
  if (!source.ready) return false
  const hasMapping = Object.keys(config?.categoryMapping ?? {}).length > 0
  return !!config?.targetSheet && hasMapping
}
