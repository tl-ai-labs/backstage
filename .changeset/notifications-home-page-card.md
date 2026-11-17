---
'@backstage/plugin-notifications': patch
---

Added an "Unread notifications" card for the home page. It lists your latest unread notifications, lets you mark them as read, and updates live when signals are available, or periodically otherwise. It is available for both the old and the new frontend system. The notifications page now also highlights the notification given by the `id` query parameter, so notifications can be linked to directly.
