---
'@backstage/catalog-model': minor
---

Added the `backstage.io/former-names` annotation, so an entity can declare the names it used to have. The new `ANNOTATION_FORMER_NAMES` constant holds the annotation key, and the new `parseEntityFormerRefs` function reads an entity's annotation and returns the former entity refs it declares, along with any entries that are not valid.
