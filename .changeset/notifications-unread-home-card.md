---
'@backstage/plugin-notifications': patch
---

Added an **Unread notifications** home page card that lists the signed-in user's latest unread notifications and lets them mark each one as read. The card updates live when the signals plugin is installed, and otherwise reloads the list once a minute. In the new frontend system, the card is installed automatically as the `home-page-widget:notifications/unread-notifications` extension. In the old frontend system, add the new `UnreadNotificationsCard` component to your home page.

The notifications page now supports an `id` query parameter, for example `/notifications?id=<notification-id>`, which shows the selected notification highlighted above the notifications table. Each item in the home page card links to its notification this way.
