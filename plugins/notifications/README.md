# notifications

Welcome to the notifications plugin!

## Getting started

To install, please refer the [Getting Started](https://backstage.io/docs/notifications) Backstage Notifications and Signals documentation section.

Please mind installing the `@backstage/plugin-notifications-backend` and `@backstage/plugin-notifications-node` packages before this frontend plugin.

## Real-time notifications

To be able to get real-time notifications to the UI without need for the user to refresh the page, you also need to
add `@backstage/plugin-signals` package to your installation.

## Home page card

The plugin provides an **Unread notifications** card for the home page. It lists the signed-in user's latest unread notifications, lets them mark notifications as read, and links each one to the notifications page with that notification highlighted. With the new frontend system, the card is installed automatically as a home page widget. With the old frontend system, add the `UnreadNotificationsCard` component to your home page. See the [Getting Started](https://backstage.io/docs/notifications) documentation for details.

You can also link to a specific notification by adding its ID to the notifications page URL, for example `/notifications?id=<notification-id>`.
