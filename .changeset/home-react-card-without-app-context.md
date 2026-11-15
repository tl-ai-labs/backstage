---
'@backstage/plugin-home-react': patch
---

Home page cards no longer fail to render when no app context is available, for example when you render a card on its own in tests. In that case, cards show the default progress indicator while they load.
