---
'@backstage/plugin-home-react': patch
---

Home page cards created with `createCardExtension` no longer require the app's component registry to be available, and show a default progress indicator while their content loads when it is not.
