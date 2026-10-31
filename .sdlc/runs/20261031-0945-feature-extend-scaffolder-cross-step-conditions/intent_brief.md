# Intent Brief — feature-extend — Scaffolder conditional fields across wizard steps

## Context

Module: the Scaffolder form wizard, in plugins/scaffolder-react (Stepper, per-step schema extraction and validation, review step) and plugins/scaffolder (template form wiring and the template editor preview).

Constraints: form data is validated per step against that step's schema; the change must not break validation, back-navigation, the review step or existing same-step conditions. A previous attempt (PR #35196) was closed unmerged.

Seed description (user's words): Let a Scaffolder template show, hide or require fields based on answers given in an earlier step of the form wizard.

## Goal

New capability: conditional fields (JSON Schema dependencies, if/then) can depend on answers from an earlier step, not only the same step. Example: step 1 asks "Is this a mobile SDK?" and step 2 shows SDK-specific fields only when the answer is Yes. Requested in backstage/backstage#31895.

Before: the step-2 SDK fields show regardless of the step-1 answer (or never show).
After: the step-2 fields appear only when step 1 was answered Yes, and the Review step lists them only in that case.

## Files in scope

- plugins/scaffolder-react/src/next/components/Stepper/\*\* (Stepper.tsx, createAsyncValidators.ts, utils.ts and their tests)
- plugins/scaffolder-react/src/next/hooks/\*\* (useTemplateSchema.ts and tests)
- plugins/scaffolder-react/src/next/lib/\*\* (schema.ts and tests)
- plugins/scaffolder-react/src/next/components/ReviewState/\*\* (ReviewState.tsx, util.ts and tests)
- plugins/scaffolder-react/src/next/components/index.ts, plugins/scaffolder-react/src/next/index.ts (exports, only if needed)
- plugins/scaffolder/src/alpha/components/TemplateWizardPage/\*\* (template form wiring)
- plugins/scaffolder/src/alpha/components/TemplateEditorPage/\*\* (template editor preview)
- plugins/scaffolder-react/report*.api.md, plugins/scaffolder/report*.api.md (companion: API reports, only if the public API changes)
- docs/features/software-templates/input-examples.md, docs/features/software-templates/writing-templates.md (companion: template-author docs)
- .changeset/\*.md (companion: new changeset for @backstage/plugin-scaffolder-react and, if touched, @backstage/plugin-scaffolder)

## Files off-limits

- Existing AI setup: .claude/**, AGENTS.md, .cursor/rules/**, .github/copilot-instructions.md
- ESLint, Prettier and TypeScript config files (.eslintrc*, .prettierrc*, tsconfig\*.json)
- docs/releases/\*\*
- .gitignore, .env, .env.\*, .mcp.json
- node_modules/**, dist/**, dist-types/**, build/**, .yarn/**, .git/**
- Existing changesets in .changeset/ (only new files may be added)

## Acceptance criteria

- React Testing Library tests on the Stepper show a step-2 field appears only when a step-1 flag is set.
- Its required validation applies only then.
- Going back and changing the flag removes it from the review step.
- Existing Stepper tests pass.
- tsc and lint pass: `CI=true yarn test plugins/scaffolder-react plugins/scaffolder && yarn tsc && yarn lint:all`.
- Docs for template authors are updated.

## Non-goals

- No changes to the legacy (non-`next`) form system beyond what the shared code requires.
- No new template syntax beyond standard JSON Schema `dependencies` / `if`/`then`/`else` evaluated against answers from earlier steps.
- No backend / template-action changes.

## Gate 0 decisions (approved 2026-10-31)

- Intent: feature-extend · Policy: opus55-plus-flash38 · Auth mode: estimated (Claude Code subscription login for Opus)
- Stack: node-typescript (accepted) · Test command: `CI=true yarn test plugins/scaffolder-react plugins/scaffolder && yarn tsc && yarn lint:all`
- Existing AI setup: all OFF-LIMITS
- .gitignore `.sdlc/` entry: declined (n) — `.sdlc` is force-added at commit time
- Write contract frozen with the allowlist / off-limits above. Note: the contract allows `.changeset/*.md`; only NEW changeset files may be added — existing changesets must not be edited.
