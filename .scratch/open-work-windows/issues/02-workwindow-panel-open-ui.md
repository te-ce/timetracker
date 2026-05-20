Status: ready-for-agent

# WorkWindowPanel: open-window UI + "set to now" buttons

## What to build

Update `WorkWindowPanel` so users can add a WorkWindow with only a start time (end filled in later), and add "set to now" buttons for both start and end fields on the add form and the edit form.

End-to-end scope: UI form changes → mutation call → list display.

Behaviour:
- Add form: end field is optional. "Add" button enabled when start is set (end may be empty).
- Open window in list displays as `HH:MM – …` (em-dash + ellipsis when end is null).
- Edit form: end field is optional; save allowed with no end. Both start and end fields have a "Now" button that sets the field to current local `HH:MM`.
- Add form: both start and end fields have a "Now" button.

## Acceptance criteria

- [ ] Add form "Add" button enabled with only start set
- [ ] Saving with no end creates a WorkWindow with `end: null`
- [ ] "Now" button on start field (add form) sets start to current local HH:MM
- [ ] "Now" button on end field (add form) sets end to current local HH:MM
- [ ] "Now" button on start and end fields in edit mode
- [ ] Open window displays as `HH:MM – …` in the list
- [ ] Editing an open window and saving without end keeps `end: null`
- [ ] No TypeScript errors

## Blocked by

- `01-workwindow-nullable-end.md`
