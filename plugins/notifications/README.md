# notifications

Welcome to the notifications plugin!

## Getting started

To install, please refer the [Getting Started](https://backstage.io/docs/notifications) Backstage Notifications and Signals documentation section.

Please mind installing the `@backstage/plugin-notifications-backend` and `@backstage/plugin-notifications-node` packages before this frontend plugin.

## Real-time notifications

To be able to get real-time notifications to the UI without need for the user to refresh the page, you also need to
add `@backstage/plugin-signals` package to your installation.

## Home page card

In the frontend system, `@backstage/plugin-notifications/alpha` registers the `UnreadNotificationsCard` home page widget (`home-page-widget:notifications/unread-notifications`). When the notifications plugin is installed alongside `@backstage/plugin-home/alpha`, users can add the **Unread notifications** card to their customizable home page to view recent unread notifications, mark individual notifications as read, or navigate to the notifications page.
