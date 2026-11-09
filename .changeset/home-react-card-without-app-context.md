---
'@backstage/plugin-home-react': patch
---

Home page cards now render when no app context is available, for example in tests, by falling back to the default loading indicator. Apps with an app context keep using their configured loading indicator.
