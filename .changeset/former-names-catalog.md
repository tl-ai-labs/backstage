---
'@backstage/plugin-catalog': minor
---

The entity page now redirects a link to a former entity name to the renamed entity and shows a notice that the entity was renamed. This works in both the legacy and the new frontend system. An entity declares its former names with the `backstage.io/former-names` annotation.

The processing errors panel now also shows catalog processing warnings, such as invalid or contested former names, in addition to errors. The `hasCatalogProcessingErrors` helper also returns true when an entity has catalog processing warnings, so `EntitySwitch` conditions using it will render the panel for warnings as well.
