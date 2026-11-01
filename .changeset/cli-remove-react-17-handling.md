---
'@backstage/cli-module-build': minor
'@backstage/cli-module-test-jest': minor
---

**BREAKING**: The frontend build and test tooling no longer detects whether React 18 is installed, and starting a frontend no longer prints warnings about React 16 and 17. Older versions of Backstage packages rely on that detection and fall back to legacy rendering, so upgrade them together with this release.
