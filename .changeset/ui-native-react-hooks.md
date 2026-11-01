---
'@backstage/ui': patch
---

Switched to the `useId` and `useSyncExternalStore` hooks from React and removed the `use-sync-external-store` dependency. Generated element ids in the affected components now use the format from React, which can change snapshots that include them.

**Affected components:** Popover, Tooltip, Table, TablePagination
