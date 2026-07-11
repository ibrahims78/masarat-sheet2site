---
name: Unification shared components
description: Three shared components extracted from duplicated code across admin + public form pages — where to add new field types, validation rules, and form rendering.
---

## Rule

Any new field type, property, or validation rule must be added to ONE place only — the shared component — and it propagates everywhere automatically.

## The Three Shared Components

### 1. FieldEditor (`client/src/components/fields/FieldEditor.tsx`)
- Used by: `ProjectSettings.tsx` (tab "fields") and `CreateProject.tsx` (wizard step 1)
- Companion: `client/src/lib/fieldEditorUtils.ts` — exports `FieldEditorField` interface, `FIELD_TYPES_AR/EN`, `getFieldTypes()`, `getCreateFieldTypes()`
- `FieldEditorField` is a superset type covering both ProjectField (from DB) and ParsedColumn (Excel wizard)
- `fieldTypeSet="full"` (default, all types) or `fieldTypeSet="create"` (subset without checkbox/heading — used in CreateProject)
- Props: field, index, allFields, isAr, onUpdate, onRemove, onMoveUp/Down, showIncludeCheckbox, expanded, onToggleExpand, fieldTypeSet, outerTestId

### 2. useProjectFormEngine (`client/src/hooks/useProjectFormEngine.ts`)
- Used by: `ProjectRegister.tsx`, `ProjectEditForm.tsx`, `ProjectParticipantForm.tsx`
- Returns: `{ isFieldVisible(f), fieldValidationRules(f) }`
- Internally runs the "clear hidden fields" useEffect — remove this effect from any page that adopts the hook
- `fieldValidationRules` now provides full validation (required + email pattern + admin-configured regex/min/max) across ALL three forms — previously only ProjectParticipantForm had this

### 3. DynamicFieldRenderer (`client/src/components/forms/DynamicFieldRenderer.tsx`)
- Used by: all three public form pages
- Props: field, register, errors, formValues, setValue, isAr, validationRules, uploadConfig, showReadOnly, labelClassName
- `uploadConfig: { url, folder, authSuffix? }` — each page passes its own auth context
- `showReadOnly=true` → renders isReadOnly fields as static display (used by ProjectEditForm)
- `labelClassName` override for per-form typography differences

### 4. FormStepper (`client/src/components/forms/FormStepper.tsx`)
- Used by: `ProjectRegister.tsx` and `ProjectParticipantForm.tsx`
- Props: steps (string[], without review), currentStep (0-indexed), isAr, progressPercent?, stepIcons?, reviewLabel?, onStepClick?
- Design: circle icons + connecting line + percentage bar below — the richer ProjectRegister style adopted as the standard
- `onStepClick` makes completed steps clickable (used by participant form to navigate back)
- `reviewLabel` auto-appended as the last step

### 5. FormSubmitted (`client/src/components/forms/FormSubmitted.tsx`)
- Used by: `ProjectRegister.tsx` (success with edit link) and `ProjectParticipantForm.tsx` (success + locked)
- Props: isAr, type ("success"|"locked"), title?, message?, editLink?, tokenHours?, editDeadline?, copied?, onCopyLink?, children
- The `children` slot allows per-form extra content (e.g., Telegram activation note) without coupling
- Functional differences stay outside this component (Telegram banner stays in participant form header)

## ParsedColumn (CreateProject) Interface Change

`ParsedColumn` in `CreateProject.tsx` now extends `FieldEditorField`. This means the wizard can configure:
- conditions, conditionOperator, validationMin/Max/Regex/Message, visibleTo, isReadOnly, isFullWidth
- Server route `POST /api/projects` maps all these fields in `fieldRows` (updated in Phase 2)

**Why:** Previously these advanced options were only configurable after project creation (in ProjectSettings). Now they can be set during initial project setup.

## Server Route Update (projects.ts)

`POST /api/projects` → `fieldRows` mapping now includes all advanced fields (conditions, validation*, visibleTo, isReadOnly, isFullWidth). The update is backward-compatible (all new fields default to null/false).
