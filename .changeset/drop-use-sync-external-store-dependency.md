---
'@backstage/frontend-plugin-api': patch
'@backstage/plugin-app': patch
---

Removed the `use-sync-external-store` dependency, as React's built-in `useSyncExternalStore` hook is used instead.
