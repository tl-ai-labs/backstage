---
'@backstage/plugin-home-react': patch
---

Card extensions now render when no app context is available, using the default progress indicator instead of throwing. Apps with an app context keep using their own progress component.
