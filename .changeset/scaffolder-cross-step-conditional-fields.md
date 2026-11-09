---
'@backstage/plugin-scaffolder-react': minor
---

Fields in a later step of the template form can now be shown, required, and listed on the Review step based on an answer given in an earlier step, using `if`/`then`/`else` or `dependencies` in the step schema. When the earlier answer no longer satisfies the condition, for example after going back and changing it, the Review step leaves out such a later-step field; conditional fields that depend on answers in the same step are shown in the Review step as before.
