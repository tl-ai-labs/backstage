---
'@backstage/plugin-scaffolder-react': minor
---

Multi-step Scaffolder templates can now conditionally show and require fields in later parameter steps based on answers given in earlier steps, using JSON Schema `dependencies` or `if`/`then`/`else`. Fields whose condition depends on an answer from an earlier step are hidden in the form and omitted from the review step when that condition is not satisfied, while conditions within a single step behave as before. When you navigate back and change the answer that controls a condition, the values of the cross-step conditional fields that are no longer shown are cleared.
