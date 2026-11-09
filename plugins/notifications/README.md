# notifications

Welcome to the notifications plugin!

## Getting started

To install, please refer the [Getting Started](https://backstage.io/docs/notifications) Backstage Notifications and Signals documentation section.

Please mind installing the `@backstage/plugin-notifications-backend` and `@backstage/plugin-notifications-node` packages before this frontend plugin.

## Real-time notifications

To be able to get real-time notifications to the UI without need for the user to refresh the page, you also need to
add `@backstage/plugin-signals` package to your installation.

## Home page card

In apps using the new frontend system with `@backstage/plugin-home` installed, the plugin adds an **Unread notifications** card to the home page widget list (extension ID `home-page-widget:notifications/unread-notifications`). It shows your five latest unread notifications, lets you mark each as read, refreshes live when `@backstage/plugin-signals` is installed, and otherwise refreshes every 60 seconds. For more details, see [the usage guide](https://backstage.io/docs/notifications/usage).

## Link to a notification

Navigating to `/notifications?id=<notification-id>` opens the notifications page with that notification highlighted when it is in the current list. The home page card uses these links.
