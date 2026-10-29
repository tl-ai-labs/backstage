---
'@backstage/ui': patch
---

The `useBreakpoint` hook now uses React's built-in `useSyncExternalStore` subscription, and the separate `use-sync-external-store` shim package is no longer installed as a dependency.

**Affected components:** useBreakpoint
