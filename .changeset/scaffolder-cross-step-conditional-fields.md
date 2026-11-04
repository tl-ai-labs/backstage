---
'@backstage/plugin-scaffolder-react': minor
---

Software template steps can now conditionally show, hide, and require fields based on answers from earlier steps using JSON Schema conditionals such as `dependencies` and `if`/`then`/`else`. The review step also hides conditional fields whose conditions are not met.
