---
'@backstage/plugin-catalog': minor
---

When an entity page URL does not match any entity, the page now checks whether a renamed entity lists that ref in its `backstage.io/former-names` annotation. If so, it redirects to the entity's current URL, keeping the selected tab and query parameters, and shows a notice that the entity was renamed. This works in both the old and the new frontend system, and normal page loads make no extra request.
