---
'@backstage/plugin-notifications': patch
---

Added an unread notifications card for the home page, available as `UnreadNotificationsCard` in the old frontend system and as a home page widget in the new frontend system. The card refreshes through signals or polling, and opening a notification from it highlights that notification on the notifications page.
