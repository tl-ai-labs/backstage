---
'@backstage/plugin-notifications': patch
---

Added an unread notifications card for the home page, available as a home page widget in the new frontend system. The card lists your latest unread notifications, lets you mark them as read, and stays up to date through signals, or by polling when signals are not installed. The notifications page now highlights the notification given by the `id` query parameter.
