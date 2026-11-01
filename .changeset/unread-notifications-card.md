---
'@backstage/plugin-notifications': patch
---

Added an **Unread notifications** home page widget for the new frontend system. It lists your latest unread notifications with a mark-as-read action and a link to each one, and updates live through signals, or every 60 seconds when signals are not installed. The notifications page now shows and highlights the notification given by `?id=<id>`, even when the current filters or pagination would hide it.
