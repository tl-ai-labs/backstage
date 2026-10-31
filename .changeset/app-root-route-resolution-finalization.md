---
'@backstage/frontend-app-api': patch
---

Apps now notify already rendered app root elements when the app is finalized, so their route links resolve without a remount.
