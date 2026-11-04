---
'@backstage/plugin-notifications': patch
---

Added an unread notifications card for the Backstage home page, available both as a home page card for existing apps and as a widget for apps using the new frontend system. The card shows the latest unread notifications for the signed-in user and updates live as notifications arrive or are read. When live updates are unavailable, it refreshes periodically instead. Each notification can be marked as read directly from the card, and selecting a notification opens the notifications page with that item highlighted.
