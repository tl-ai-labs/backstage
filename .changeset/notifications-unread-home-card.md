---
'@backstage/plugin-notifications': patch
---

The plugin now provides an Unread notifications home page widget for the new frontend system (extension `home-page-widget:notifications/unread-notifications`) that lists your latest unread notifications, lets you mark them as read and refreshes live through signals or every minute without them; the notifications page now highlights the notification given in the `id` query parameter, for example `/notifications?id=<id>`.
