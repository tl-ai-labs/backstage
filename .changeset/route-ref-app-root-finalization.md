---
'@backstage/frontend-plugin-api': patch
---

Route links used in app root elements, such as a global banner, now update to
the correct link once the app has finished loading after sign-in, instead of
staying unresolved. Route resolution API implementations can now optionally
report whether the app is still starting up and notify when it is ready.
