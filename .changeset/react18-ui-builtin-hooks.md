---
'@backstage/ui': patch
---

Uses the hooks built into React 18 instead of polyfills, and no longer depends on `use-sync-external-store`. The generated element ids that link popovers, tooltips, tables and table pagination to their labels and descriptions now use the React id format.
