---
'@backstage/plugin-scaffolder-react': minor
---

Conditional fields in a Scaffolder template step, using `dependencies` or `if`/`then`/`else`, can now depend on answers given in an earlier step of the form. Values from conditional fields that are no longer shown, for example after going back and changing an earlier answer, are now left out of the review step and the submitted values.
