---
'@backstage/plugin-scaffolder-react': minor
---

Conditional fields in a template step, defined with `dependencies` or `if`/`then`/`else`, can now depend on answers given in an earlier step. Fields that no longer apply after an answer changes are removed from the review step and are not passed to the template when it is created.
