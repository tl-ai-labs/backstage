---
'@backstage/plugin-scaffolder-react': minor
---

Scaffolder form wizard steps now support cross-step conditional fields (`dependencies`, `if`/`then`/`else`, `allOf`, `oneOf`, and `anyOf`) based on answers from earlier steps, including conditional `required` validation, `ReviewState` resolution, and pruning of inactive conditional values on back-navigation.
