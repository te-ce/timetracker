import { InMemoryConfigRepository } from './config-repository'

describe('InMemoryConfigRepository', () => {
  it('update applies concurrent patches of different fields to the latest config', async () => {
    const repo = new InMemoryConfigRepository()
    await Promise.all([repo.update(() => ({ autoCategory: 'Dev' })), repo.update(() => ({ sprintLengthDays: 14 }))])
    const config = await repo.get()
    expect(config.autoCategory).toBe('Dev')
    expect(config.sprintLengthDays).toBe(14)
  })
})
