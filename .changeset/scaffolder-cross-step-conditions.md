---
'@backstage/plugin-scaffolder-react': minor
---

Fields in a later step of the template form can now be shown, hidden and required based on answers given in an earlier step, using the same conditions that are already supported within a single step. The review step now leaves out a value whose field is hidden because its condition no longer holds, whether the condition is in the same step or an earlier one, so some existing templates show fewer entries in the review step. These hidden values are still submitted with the rest of the form.
