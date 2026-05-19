# Architecture Deepening

## Goal

Reduce architectural friction in the timetracker codebase by consolidating shallow modules, fixing dead seams, and improving locality. Each issue is an independent vertical slice that can be implemented and merged on its own.

## Principles

- **Depth over breadth**: prefer fewer, deeper modules with small interfaces and rich implementations.
- **Locality**: changes, bugs, and knowledge about a concept should concentrate in one place.
- **Leverage**: callers get a lot of behaviour for a small interface cost.
- **Deletion test**: if removing a module scatters complexity across callers, it's earning its keep.

## Scope

Five independent refactoring issues, ordered by expected leverage:

1. Generic JSON-collection repository (consolidate 5 repositories)
2. DaySummary domain module (consolidate per-day computation)
3. Wire dead seams in MonthGrid (dayTypes, autoCategoryOverrides)
4. Mutation invalidation hooks (centralise cache invalidation)
5. Wire resolveAutoCategory in DayView (fix dead override map)
