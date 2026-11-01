---
'@backstage/plugin-home-react': patch
---

Home page cards that use a custom `Renderer` no longer need app context to render. While such a card loads, it shows a generic progress indicator instead of the app's progress component.
