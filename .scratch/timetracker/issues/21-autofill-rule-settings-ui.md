Status: ready-for-agent

# #21 AutoFillRule settings UI

## What to build

Settings page section for managing auto-fill rules. CRUD interface: create new rules (pick category, hours, recurrence pattern, optional label), list existing rules, edit, delete.

## Acceptance criteria

- [ ] Settings view shows "Auto-Fill Rules" section with list of existing rules
- [ ] "Add rule" form: category selector (fixed + dynamic), hours input, pattern picker, optional label
- [ ] Pattern picker: toggle between "Every workday" and "Weekly" (with day checkboxes + interval input)
- [ ] Existing rules shown as list with edit/delete actions
- [ ] Rules persisted via AutoFillRuleRepository
- [ ] Component tests: add rule flow, delete rule, list display

## Blocked by

- #20 AutoFillRule domain + materialization
