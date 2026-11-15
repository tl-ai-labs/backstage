---
'@backstage/plugin-notifications': patch
---

Added `UnreadNotificationsCard` and `HomePageUnreadNotifications` (plus a new-frontend-system home-page widget) to display the signed-in user's latest unread notifications with mark-as-read, live updates via signals with a polling fallback, and deep-linking to `/notifications?id=` where the matching notification is highlighted.
