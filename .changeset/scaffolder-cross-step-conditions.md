---
'@backstage/plugin-scaffolder-react': minor
---

Conditional template fields written with `dependencies` or `if`/`then` can now depend on answers given in earlier form steps. A field hidden by such a condition is no longer required, and its value is left out of the review step and the submitted values. A value entered in a secret field is the exception: it stays in the task's secrets even when its field is hidden, so guard any template step that uses it with the same condition. Conditions that read only fields of their own step behave as before.
