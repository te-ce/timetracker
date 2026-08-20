import type React from 'react'
import { IconBolt } from './IconBolt'
import { IconCalendar } from './IconCalendar'
import { IconChart } from './IconChart'
import { IconDay } from './IconDay'
import { IconSettings } from './IconSettings'
import { IconTable } from './IconTable'

export const NAV_ITEMS: { label: string; icon: React.ReactNode; to: string }[] = [
  { label: 'Day', icon: <IconDay />, to: '/' },
  { label: 'Month', icon: <IconCalendar />, to: '/month' },
  { label: 'Table', icon: <IconTable />, to: '/table' },
  { label: 'Sprint', icon: <IconBolt />, to: '/sprint' },
  { label: 'Stats', icon: <IconChart />, to: '/stats' },
  { label: 'Settings', icon: <IconSettings />, to: '/settings' },
]
