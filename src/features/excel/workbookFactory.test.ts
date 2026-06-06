import { describe, it, expect, vi } from 'vitest'

vi.mock('../../infra/auth/msalInstance', () => ({ getAccessToken: vi.fn() }))
vi.mock('../../infra/auth/bootstrapConfig', () => ({ isLocalFolderMode: vi.fn().mockReturnValue(false) }))

import { createWorkbookService, buildWorkbookService, isExportReady } from './workbookFactory'
import { GraphApiWorkbookService } from './workbookService'

const BASE_CONFIG = {
  sollstunden: 8,
  autoCategory: null,
  federalState: null,
  sprintLengthDays: 14,
  sprintStartDate: null,
  customCategories: [],
}

describe('isExportReady (cloud mode)', () => {
  it('returns false when config is undefined', () => {
    expect(isExportReady(undefined, true)).toBe(false)
  })

  it('returns false when categoryMapping is empty', () => {
    expect(
      isExportReady(
        { ...BASE_CONFIG, sharepointUrl: 'https://sp.example.com', targetSheet: 'Sheet1', categoryMapping: {} },
        true,
      ),
    ).toBe(false)
  })

  it('returns false when not authenticated', () => {
    expect(
      isExportReady(
        {
          ...BASE_CONFIG,
          sharepointUrl: 'https://sp.example.com',
          targetSheet: 'Sheet1',
          categoryMapping: { CAT: 'T-1' },
        },
        false,
      ),
    ).toBe(false)
  })

  it('returns false when sharepointUrl missing', () => {
    expect(isExportReady({ ...BASE_CONFIG, targetSheet: 'Sheet1', categoryMapping: { CAT: 'T-1' } }, true)).toBe(false)
  })

  it('returns false when targetSheet missing', () => {
    expect(
      isExportReady({ ...BASE_CONFIG, sharepointUrl: 'https://sp.example.com', categoryMapping: { CAT: 'T-1' } }, true),
    ).toBe(false)
  })

  it('returns true when all required fields are present and authenticated', () => {
    expect(
      isExportReady(
        {
          ...BASE_CONFIG,
          sharepointUrl: 'https://sp.example.com',
          targetSheet: 'Sheet1',
          categoryMapping: { CAT: 'T-1' },
        },
        true,
      ),
    ).toBe(true)
  })
})

describe('buildWorkbookService (cloud mode)', () => {
  it('returns null when config is undefined', () => {
    expect(buildWorkbookService(undefined, true)).toBeNull()
  })

  it('returns null when sharepointUrl is missing', () => {
    expect(buildWorkbookService({ ...BASE_CONFIG }, true)).toBeNull()
  })

  it('returns null when not authenticated', () => {
    expect(buildWorkbookService({ ...BASE_CONFIG, sharepointUrl: 'https://sp.example.com' }, false)).toBeNull()
  })

  it('returns GraphApiWorkbookService when config is complete and authenticated', () => {
    const svc = buildWorkbookService({ ...BASE_CONFIG, sharepointUrl: 'https://sp.example.com' }, true)
    expect(svc).toBeInstanceOf(GraphApiWorkbookService)
  })
})

describe('createWorkbookService (cloud mode)', () => {
  it('throws when sharepointUrl is missing', () => {
    expect(() => createWorkbookService({ ...BASE_CONFIG }, true)).toThrow()
  })

  it('throws when not authenticated', () => {
    expect(() => createWorkbookService({ ...BASE_CONFIG, sharepointUrl: 'https://sp.example.com' }, false)).toThrow()
  })

  it('returns GraphApiWorkbookService when valid', () => {
    const svc = createWorkbookService({ ...BASE_CONFIG, sharepointUrl: 'https://sp.example.com' }, true)
    expect(svc).toBeInstanceOf(GraphApiWorkbookService)
  })
})
