---
'@backstage/plugin-home-react': patch
---

Home page card extensions no longer require the legacy app context to render their loading state, so they can be used in the new frontend system and in tests without it.
