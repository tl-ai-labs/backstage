---
'@backstage/plugin-scaffolder-react': minor
---

Conditional fields in a Scaffolder template form can now depend on answers given in an earlier step of the form, using either `dependencies` or `if`/`then`/`else`. For example, a field in the second step can be shown and required only when a checkbox in the first step is selected.

Values of conditional fields whose condition no longer holds, for example because the user went back and changed an earlier answer, are now left out of the review step and the submitted values. This also applies to conditions within a single step.
