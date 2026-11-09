## Conventions

- TypeScript with ESM imports; match the style of the file being edited (single quotes, trailing commas, 2-space indent, 80-column Prettier wrapping); run Prettier on every changed file.
- Never change the existing Apache 2.0 header or its year; a new .ts/.tsx file starts with the Apache 2.0 header with `Copyright 2026 The Backstage Authors`.
- Schema walkers use the local `isObject(value): value is JsonObject` guard and `JsonObject` / `JsonValue` from `@backstage/types`; never mutate an input schema, build new objects with spread or Object.fromEntries.
- Helpers added by this change are module-internal: do not add them to any `index.ts` barrel, `src/alpha.ts` or `src/index.ts`, and add no TSDoc release tag to them.
- No new dependencies; use only `json-schema-library` (Draft07), `@rjsf/*` 5.24.13 and lodash already in plugins/scaffolder-react/package.json.
- Tests run on Jest via `CI=1 yarn test <file>`; name cases `it('should ...')` inside the file's existing `describe`; prefer few thorough cases with several `expect`s each.
- React tests: use `renderInTestApp` from `@backstage/test-utils` wrapped in `SecretsContextProvider` for Stepper, plain `render` from `@testing-library/react` for ReviewState; query by role and accessible name; prefer `screen` and `await screen.findBy*` over `waitFor`; wrap user events in `await act(async () => { fireEvent... })` as the existing Stepper tests do; never add test IDs to implementation.
- Docs follow docs/contribute/doc-style-guide.md: sentence-case headings, second person, present tense, short paragraphs, fenced `yaml` code blocks, no emojis.
- Changeset messages are adopter-facing plain language and never name internal functions, files or variables.

## Decisions

- Cross-step `if`/`then`/`else` rendering and built-in validation: No transform: the Stepper already passes the full `stepsState` as rjsf `formData`, so rjsf `retrieveSchema` and ajv evaluate `if` against every earlier answer; the change only adds tests proving it. (not Pre-resolving `if`/`then` in the Stepper before rendering) — Same evaluation path as the backend (full answer set against the step schema) and zero risk to same-step behaviour.
- Cross-step `dependencies` rendering: A pure helper `expandCrossStepDependencies` in Stepper/utils.ts appends, for each `dependencies` key that is not a property of the step and not declared by another conditional branch of the step, an equivalent `{ if, then }` entry to the step's `allOf`, keeping the original `dependencies` untouched; the Stepper passes its result as the rjsf `schema`. (not Injecting the earlier-step key as a hidden property of the later step; not Removing the original `dependencies` after rewriting) — rjsf skips a dependency whose key is not in the step's `properties`; `if`/`then` is evaluated against full form data, and keeping the original `dependencies` keeps ajv validation identical to the backend (NFR-2).
- Telling conditional and cross-step conditional fields apart: Internal helpers in next/lib/schema.ts (not re-exported from next/lib/index.ts): `getConditionalPropertyNames(schema)` for the Stepper rewrite, and `getCrossStepConditions(schema)` returning `{ keys, fields }` (earlier-step names the step's conditions read, and the fields declared only under those conditions) for the Review step. (not Separate walkers in Stepper and ReviewState) — One definition of a cross-step condition (it reads a name the step does not declare) keeps rendering and review in agreement.
- Review step ownership of an answer: `findSchemaForKey` keeps today's per-step data (the step's own `dependencies` keys) and adds only the answers named by that step's cross-step condition keys, never the looked-up key; the Review step drops an answer only when no step resolves it and it is a cross-step conditional field; every same-step conditional answer is resolved and listed (including the stale-value fallback) exactly as today. (not Resolving with the full form state minus the key (changes same-step resolution and hides stale same-step answers); not Dropping any unresolved answer declared in any conditional branch (changes same-step Review output)) — The brief keeps the Review step and same-step conditions unchanged; only conditions on earlier-step answers may change what the Review step lists.
- Stale answers of hidden conditional fields (Q-1, A-1 accepted): Hide stale answers of hidden cross-step conditional fields from the default Review step only; stale same-step answers stay listed as today, and `stepsState` and the values passed to `onCreate` stay exactly as today. (not Pruning stale answers from form state on change; not Pruning stale answers from the Create payload) — Pruning changes same-step behaviour and what custom review components receive; the backend accepts the extra property because step schemas do not set `additionalProperties: false`.
- Custom field-extension validators: createAsyncValidators.ts is not changed; rjsf hands `handleNext` the full form data (the Stepper strips `omitExtraData`/`liveOmit`), so json-schema-library already resolves cross-step conditions; a test pins this. (not Merging `stepsState` into the data passed to the validators in `handleNext`) — The data is already the full answer set; changing `handleNext` adds risk with no behaviour gain.
- Public API and release: No exported or alpha signature changes, so no API report regeneration; one new changeset `.changeset/scaffolder-cross-step-conditional-fields.md` bumps only `@backstage/plugin-scaffolder-react` as `minor`; plugins/scaffolder (TemplateWizardPage, TemplateEditorPage) is not edited because both render the Stepper. (not Adding `@backstage/plugin-scaffolder` to the changeset) — Both consumers inherit the behaviour through the Stepper with no wiring change (FR-10, FR-12).
- Template-author docs placement: New subsection in docs/features/software-templates/input-examples.md directly after `### Multiple conditional fields with custom ordering`; writing-templates.md is not edited. (not Adding a link in writing-templates.md) — writing-templates.md has no section describing conditional parameters to link from (FR-11 makes the link conditional on one existing).

## Files of this change

- `plugins/scaffolder-react/src/next/lib/schema.ts` (U01, edit) — import: `import { getConditionalPropertyNames, getCrossStepConditions } from '../../lib/schema';`
  - `function getConditionalPropertyNames(schema: JsonObject): string[]`
  - `function getCrossStepConditions(schema: JsonObject): { keys: string[]; fields: string[] }`
- `plugins/scaffolder-react/src/next/components/Stepper/utils.ts` (U02, edit) — import: `import { expandCrossStepDependencies } from './utils';`
  - `function expandCrossStepDependencies(schema: JsonObject): JsonObject`
- `plugins/scaffolder-react/src/next/components/Stepper/Stepper.tsx` (U03, edit)
- `plugins/scaffolder-react/src/next/components/ReviewState/util.ts` (U04, edit) — import: `import { isJsonObject, formatKey, findSchemaForKey } from './util';`
  - `function findSchemaForKey(key: string, schemas: ParsedTemplateSchema[], formState: Partial<{ [key: string]: JsonValue }>): ParsedTemplateSchema | null`
- `plugins/scaffolder-react/src/next/components/ReviewState/ReviewState.tsx` (U05, edit)
- `docs/features/software-templates/input-examples.md` (U06, edit)
- `.changeset/scaffolder-cross-step-conditional-fields.md` (U07, create)
- `plugins/scaffolder-react/src/next/lib/schema.test.ts` (U08, edit)
- `plugins/scaffolder-react/src/next/components/Stepper/utils.test.ts` (U09, edit)
- `plugins/scaffolder-react/src/next/components/Stepper/Stepper.test.tsx` (U10, edit)
- `plugins/scaffolder-react/src/next/components/Stepper/createAsyncValidators.test.ts` (U11, edit)
- `plugins/scaffolder-react/src/next/components/ReviewState/util.test.ts` (U12, edit)
- `plugins/scaffolder-react/src/next/components/ReviewState/ReviewState.test.tsx` (U13, edit)
