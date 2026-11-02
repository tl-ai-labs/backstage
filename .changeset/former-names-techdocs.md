---
'@backstage/plugin-techdocs': minor
---

The TechDocs reader now redirects a link to a former entity name to the docs of the renamed entity, and shows a notice that the entity was renamed. This works for entities that list their old names in the `backstage.io/former-names` annotation. The docs must already be published under the new name. `TechDocsReaderPageContent` also gained a `withRenamedNotice` prop, defaulting to `true`, which you can set to `false` when rendering it inside an entity page that already shows the notice.
