# notifications

Welcome to the notifications plugin!

## Getting started

To install, please refer the [Getting Started](https://backstage.io/docs/notifications) Backstage Notifications and Signals documentation section.

Please mind installing the `@backstage/plugin-notifications-backend` and `@backstage/plugin-notifications-node` packages before this frontend plugin.

## Real-time notifications

To be able to get real-time notifications to the UI without need for the user to refresh the page, you also need to
add `@backstage/plugin-signals` package to your installation.

## Unread notifications card

In the new frontend system the plugin provides a home page widget that appears
under **Add Widget**, lists the latest unread notifications with mark-as-read,
and links each to the notifications page, where `?id=<id>` highlights it. See
the [Notifications Usage documentation](https://backstage.io/docs/notifications/usage)
for details on how it refreshes.
