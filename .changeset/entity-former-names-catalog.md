---
'@backstage/plugin-catalog': minor
---

Opening an entity page by a former name now redirects to the renamed entity, keeping the sub-route, query, and hash of the original URL, and shows a notice naming the former ref. This works in both the old and new frontend systems. Pages behave as before when the catalog backend does not support the lookup.
