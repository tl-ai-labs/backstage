---
'@backstage/plugin-scaffolder-react': minor
---

Scaffolder template forms can now show, hide, or require fields based on answers given in earlier steps of the wizard, using standard JSON Schema `dependencies` and `if`/`then`/`else` conditions, and the review step accurately reflects these conditions. When an answer's governing condition stops holding, that answer is now removed from the form data, so it no longer appears on the review step and is no longer submitted.
