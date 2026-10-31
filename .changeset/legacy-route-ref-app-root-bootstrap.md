---
'@backstage/core-plugin-api': patch
---

In apps built with the new frontend system, app root elements that build route links no longer fail with a 'No path for' error before sign-in completes; the link points nowhere (an empty string) until the app has finished loading and then updates to the correct path.
