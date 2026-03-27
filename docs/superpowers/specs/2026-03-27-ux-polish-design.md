# UX/UI Polish — Design Spec

## Goal

Improve the overall UX quality of the frontend: proper cursor styles, interactive feedback, toast notifications, styled form validation, modal polish with dirty check, and button loading states.

## Scope

### 1. Foundation — Interactive States

**All clickable elements get `cursor-pointer`:**
- `button.tsx` — add `cursor-pointer` to base styles
- `select.tsx` — add `cursor-pointer`
- `type-select.tsx` — already has button, inherits from above
- `icon-picker.tsx` — clickable icon buttons
- `data-table.tsx` — clickable rows (already conditional, verify)

**Active state on buttons:**
- Add `active:scale-[0.98]` for tactile click feedback
- Add `transition-all` (upgrade from `transition-colors`)

**Hover consistency:**
- Standardize on `hover:bg-muted` for neutral interactive elements
- Keep variant-specific hover for buttons (e.g., `hover:bg-primary/90`)

### 2. Toast System

**New component:** `components/ui/toast.tsx`

**Architecture:**
- `ToastProvider` context wraps the app in `layout.tsx`
- `useToast()` hook returns `{ toast }` function
- `toast({ title, variant })` — variant: `success`, `error`, `info`
- Toasts render in bottom-right corner, stack vertically
- Auto-dismiss after 4 seconds, with manual close button
- Animate in (slide from right) and out (fade)

**Integration points:**
- Settings save → success toast
- User CRUD → success/error toast
- ThingType CRUD → success/error toast
- Backup export/restore → success/error toast
- Scanner start → success/error toast
- Thing/Local/Group/Network CRUD → success/error toast
- Replace all inline `setSaveMessage` / `console.error` patterns

**Toast appearance:**
- Success: green left border, check icon
- Error: red left border, X icon
- Info: blue left border, info icon
- Dark card background matching theme, subtle shadow

### 3. Form Validation

**Upgrade Input component:**
- Keep `error` prop (already exists)
- Add `aria-invalid={!!error}` and `aria-describedby` for accessibility
- Error icon inside input (right side) when error is set
- Ensure `border-destructive` + `ring-destructive` on error (already done)

**Upgrade Select component:**
- Add `error` prop (missing today)
- Same visual treatment as Input: red border + error message below

**Remove native validation:**
- Remove `required` HTML attribute from form inputs
- Handle validation in submit handlers instead
- Show field-level errors using component `error` prop
- Common validations: required fields, password match, min length

**Validation strategy:**
- Validate on submit (not on blur — keeps it simple)
- Clear field error when user starts typing in that field
- Show all errors at once on submit attempt

### 4. Modal Polish

**Animations:**
- Backdrop: fade in (`animate-fadeIn`)
- Content: fade + scale up from 95% (`animate-scaleIn`)
- Exit: reverse animations (fade out, scale down)

**Scroll lock:**
- When modal opens: `document.body.style.overflow = 'hidden'`
- When modal closes: restore original overflow
- Cleanup on unmount

**Dirty check (unsaved changes confirmation):**
- Add optional `isDirty` prop to Modal
- When `isDirty` is true and user clicks outside or presses ESC:
  - Show inline confirmation: "You have unsaved changes. Discard?"
  - Two buttons: "Keep Editing" / "Discard"
- When `isDirty` is false: close immediately (current behavior)
- Each form page passes `isDirty` computed from comparing initial vs current form state

### 5. Button Loading State

**Upgrade Button component:**
- Add `loading` prop
- When `loading=true`: show spinner icon before text, disable button
- Spinner: small `animate-spin` circle matching text color
- Replaces the pattern of `disabled={saving}` + `{saving ? 'Saving...' : 'Save'}`
- New usage: `<Button loading={saving}>Save</Button>`
- Button text stays the same (no more "Saving..."/"Creating..." ternaries)

## CSS Utilities

Add to `globals.css`:

```css
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes scaleIn {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}

@keyframes slideInRight {
  from { opacity: 0; transform: translateX(100%); }
  to { opacity: 1; transform: translateX(0); }
}

@keyframes fadeOut {
  from { opacity: 1; }
  to { opacity: 0; }
}
```

## Files Changed

### New files
- `frontend/src/components/ui/toast.tsx` — Toast component + ToastProvider + useToast hook

### Modified UI components
- `frontend/src/components/ui/button.tsx` — cursor-pointer, active state, loading prop
- `frontend/src/components/ui/input.tsx` — aria attributes, error icon
- `frontend/src/components/ui/select.tsx` — cursor-pointer, error prop
- `frontend/src/components/ui/modal.tsx` — animations, scroll lock, isDirty prop
- `frontend/src/components/ui/icon-picker.tsx` — cursor-pointer on buttons
- `frontend/src/app/globals.css` — animation keyframes
- `frontend/src/app/layout.tsx` — wrap with ToastProvider

### Modified pages (toast + validation integration)
- All 13 pages — replace inline messages with toast, add form validation
- Settings, Things, Locals, Groups, Scanner, Notifications, Setup, Login

## Out of Scope
- Skeleton loaders (future)
- Card shadows/elevation (future)
- Keyboard navigation on TypeSelect (future)
- Focus trap in modals (future)
- Column sorting in DataTable (future)
