---
'@backstage/plugin-scaffolder-react': minor
---

Added support for cross-step conditional fields in the Scaffolder form wizard. Template parameter steps can now use JSON Schema `dependencies` or `if`/`then`/`else` referencing fields from earlier steps by their plain property name. Conditional fields are evaluated against accumulated answers without re-rendering or re-validating earlier-step fields, and values from fields that become hidden after navigating back are omitted from the review step and submitted values.
