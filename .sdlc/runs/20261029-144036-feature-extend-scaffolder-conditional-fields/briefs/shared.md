## Conventions

- Formatting is Prettier with the Backstage config (@backstage/cli/config/prettier): 2-space indent, single quotes, trailing commas, 80-column wrap, semicolons; every changed file must pass `yarn prettier --check` unchanged.
- Existing files keep their Apache 2.0 header and its original year; never touch a header line.
- Match each file's own style: lib/schema.ts exports arrow-function consts with explicit return types and keeps inner helpers as plain `function`s; ReviewState/util.ts uses exported plain `function` declarations.
- Use `JsonObject` / `JsonValue` from '@backstage/types' for schema and form data; add no new `any`.
- Never mutate an input schema, manifest or form state: build new objects and arrays (spread or copy) and return them.
- Add imports next to the file's existing imports of the same source, keeping the file's current import order; import json-schema-library as `Draft07 as JSONSchema` like the rest of the package.
- Add no export to any barrel (`next/lib/index.ts`, `next/components/ReviewState/index.ts`, `next/hooks/index.ts`, `next/index.ts`): new helpers are module-internal and the package's public API is unchanged.
- Tests run under Jest via backstage-cli: `describe` / `it('should ...')` with `expect`; prefer fewer, thorough tests with several assertions each.
- New React Testing Library assertions query through `screen`: `await screen.findBy*` for things that appear after an interaction, `screen.getBy*` for content of a synchronous render, `screen.queryBy*` with `.not.toBeInTheDocument()` for things that must be absent; avoid `waitFor`; add no test ids to implementation code.
- Wrap user interactions in existing Stepper tests' style: `await act(async () => { fireEvent.click(...) })`; match form fields by accessible name with a regular expression on their title (a required field's label gains an asterisk).
- Docs follow docs/contribute/doc-style-guide.md: address the reader as you, present tense, active voice, code style for keys and file names, `yaml` fenced examples, Docusaurus `:::note` admonitions.
- The changeset is written for adopters in plain language and names no code symbol, function, hook, component or schema keyword in code style.

## Decisions

- Where cross-step dependencies get fixed for rendering and validation: useTemplateSchema passes each step's extracted rjsf schema through a new module-internal helper `liftCrossStepDependencies` in next/lib/schema.ts; `mergedSchema` stays the raw step schema and Stepper.tsx is not edited. (not Merging earlier steps' schemas into the current step's schema in Stepper; not Rewriting mergedSchema as well; not A new public hook or option on Stepper) — rjsf already receives the whole form state; it only skips a dependency whose key is not one of the step's own properties, so rewriting the rjsf schema alone fixes render and ajv validation while mergedSchema keeps feeding the review and custom validators unchanged.
- Which dependency keys are lifted: Only top-level `dependencies` entries whose key is absent from the step's top-level `properties`, and only when `properties` is an object; boolean dependency values are left in place. (not Lifting every dependency; not Also lifting dependencies nested inside properties) — These are exactly the keys rjsf's processDependencies skips; same-step dependencies and steps without properties keep a byte-identical schema, so existing tests and templates behave as today (NFR-1).
- Shape of a lifted dependency: Each lifted key K becomes one entry `{ if: { required: [K] }, then: X }` appended after the schema's existing `allOf` entries; array value D gives X = `{ required: D }`; object value gives X = the value without `oneOf`, and each `oneOf` branch whose properties declare K becomes `{ if: { properties: { K: branch.properties[K] }, required: [K] }, then: branch without properties[K] }` appended to X's `allOf`. (not Keeping `oneOf` inside `then` (rjsf renders a top-level oneOf as a branch selector); not Emitting `if` without `required` (passes vacuously before the earlier answer exists)) — Verified against @rjsf/utils 5.24.13 retrieveSchema and the ajv8 validator: active branch fields render and their `required` is enforced, inactive or unanswered branches add nothing.
- Root-level if/then/else and allOf conditions: No code change: rjsf, ajv and json-schema-library already resolve them against the whole form state that Stepper passes to each step; new tests pin the behaviour. — Probed: a step-2 root `if` naming a step-1 field renders and validates correctly today; only tests and docs were missing.
- Custom field validators: createAsyncValidators.ts is not edited; it resolves the step's raw mergedSchema with the full form data through json-schema-library, which runs a ui:field validator only when its branch is active; a new unit test pins FR-4. — An inactive branch's key resolves to a plain inferred schema without `ui:field`, so its validator is skipped already.
- Review step lookup: findSchemaForKey resolves `#/<key>` against each step's mergedSchema with the whole form state as data and `additionalProperties: false` added to a copy of the schema (left untouched when the author's `additionalProperties` is an object); a JsonError or undefined result means not found. (not Keeping the dependencies-only data subset; not Comparing against rjsf's retrieveSchema) — With full data json-schema-library resolves dependencies and if/then/else exactly as the form does, and forbidding extra properties stops it inventing a schema for an undeclared key.
- Review step keys that resolve in no step (Gate 1 decision 1): ReviewState omits a key that no step resolves when some step's mergedSchema declares it inside a conditional subschema (`dependencies` values, `then`, `else`, `allOf`/`anyOf`/`oneOf` entries, recursively); a key declared nowhere is still shown under its formatted key name. — Applies uniformly to same-step and cross-step conditions as decided at Gate 1, while query-string values keep today's display (FR-10).
- Submitted data (Gate 1 decision 2): Stepper's onCreate keeps sending the whole form state, including values of fields whose branch is inactive. — Stripping them changes what existing templates submit; docs tell authors that hidden values are still sent.
- Public API and the scaffolder plugin: No new or changed export from @backstage/plugin-scaffolder-react; no edit under plugins/scaffolder (TemplateWizardPage goes through Workflow and TemplateEditorForm renders Stepper, both of which call useTemplateSchema). — FR-7, FR-12 and NFR-2; no report\*.api.md change is needed.
- Docs placement: A new section in docs/features/software-templates/input-examples.md directly after 'Multiple conditional fields with custom ordering'; writing-templates.md is not edited. — input-examples.md is where conditional fields are already documented, so the cross-step example sits beside the same-step ones.
- Release notes and environment: One new changeset .changeset/scaffolder-cross-step-conditions.md bumping only '@backstage/plugin-scaffolder-react' as minor; no environment variable is added or read. — Only scaffolder-react source changes; the feature is pure frontend schema handling.

## Files of this change

- `plugins/scaffolder-react/src/next/lib/schema.ts` (U01, edit) — import: `import { liftCrossStepDependencies } from '../lib/schema';`
  - `function liftCrossStepDependencies(schema: JsonObject): JsonObject`
- `plugins/scaffolder-react/src/next/hooks/useTemplateSchema.ts` (U02, edit)
- `plugins/scaffolder-react/src/next/components/ReviewState/util.ts` (U03, edit) — import: `import { isJsonObject, formatKey, findSchemaForKey, isDeclaredInConditionalBranch } from './util';`
  - `function findSchemaForKey(key: string, schemas: ParsedTemplateSchema[], formState: Partial<{ [key: string]: JsonValue }>): ParsedTemplateSchema | null`
  - `function isDeclaredInConditionalBranch(key: string, schemas: ParsedTemplateSchema[]): boolean`
- `plugins/scaffolder-react/src/next/components/ReviewState/ReviewState.tsx` (U04, edit)
- `plugins/scaffolder-react/src/next/lib/schema.test.ts` (U05, edit)
- `plugins/scaffolder-react/src/next/hooks/useTemplateSchema.test.tsx` (U06, edit)
- `plugins/scaffolder-react/src/next/components/Stepper/createAsyncValidators.test.ts` (U07, edit)
- `plugins/scaffolder-react/src/next/components/ReviewState/util.test.ts` (U08, edit)
- `plugins/scaffolder-react/src/next/components/ReviewState/ReviewState.test.tsx` (U09, edit)
- `plugins/scaffolder-react/src/next/components/Stepper/Stepper.test.tsx` (U10, edit)
- `docs/features/software-templates/input-examples.md` (U11, edit)
- `.changeset/scaffolder-cross-step-conditions.md` (U12, create)
