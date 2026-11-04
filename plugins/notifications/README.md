# notifications

Welcome to the notifications plugin!

## Getting started

To install, please refer the [Getting Started](https://backstage.io/docs/notifications) Backstage Notifications and Signals documentation section.

Please mind installing the `@backstage/plugin-notifications-backend` and `@backstage/plugin-notifications-node` packages before this frontend plugin.

## Real-time notifications

To be able to get real-time notifications to the UI without need for the user to refresh the page, you also need to
add `@backstage/plugin-signals` package to your installation.

## Homepage Card

The plugin provides a `HomePageUnreadNotifications` card that shows the latest unread notifications for the signed-in user on the Backstage home page. Each item links to the notifications page and highlights the selected notification. The card refreshes live when `@backstage/plugin-signals` is installed. Otherwise it polls for new notifications every 10 seconds, which you can change with the `pollingIntervalMs` prop.

The card requires the `@backstage/plugin-home` package to be installed in your app.

### Legacy frontend system

Add the card to your home page:

```tsx
import { HomePageUnreadNotifications } from '@backstage/plugin-notifications';

export const homePage = (
  <Page themeId="home">
    <Content>
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <HomePageUnreadNotifications pollingIntervalMs={30000} />
        </Grid>
      </Grid>
    </Content>
  </Page>
);
```

### New frontend system

The plugin contributes the card as a home page widget with the extension ID `home-page-widget:notifications/unread-notifications`. It is installed automatically with the notifications plugin from `@backstage/plugin-notifications/alpha`, and the home page picks it up without further configuration.
