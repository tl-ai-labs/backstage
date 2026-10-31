---
'@backstage/plugin-scaffolder-react': minor
---

Conditional fields in Scaffolder templates can now depend on answers given in earlier steps of the form. Conditions written with `dependencies` or `if`/`then`/`else` are evaluated against the answers of all previous steps, fields that are required inside such a condition are only required while it holds, and the review step only lists conditional fields whose condition holds.
