---
'@backstage/catalog-model': minor
---

Added the `backstage.io/former-names` well-known annotation (`ANNOTATION_FORMER_NAMES`) and the `parseFormerEntityRefs` helper. Entities can list the refs they were previously known by, and the default entity validation reports invalid items, such as a former ref of a different kind or the entity's own ref, as processing errors.
