# Instagram profile photos

Configure an Instagram API with Instagram Login app in Meta’s developer dashboard. This flow requests only instagram_business_basic and imports the authorized account’s profile photo; it does not store the access token or post content.

Add these values privately to .env (do not put secrets into chat or Git):

- INSTAGRAM_APP_ID: Instagram app ID
- INSTAGRAM_APP_SECRET: Instagram app secret
- INSTAGRAM_REDIRECT_URI: exact approved callback, ending /api/account/social/instagram/callback

Register the identical callback in Meta. Use the site’s configured origin; Meta may require an HTTPS origin. Set NEXT_PUBLIC_SITE_URL to that same origin when configuring a hosted test environment. Complete Meta access/review requirements for the intended users. Eligible Instagram Business or Creator accounts connect from Dashboard → Profile photo → Social profile photo → Instagram. Personal accounts can upload a photo instead.

After configuring environment values, run bash "Start Model Escape.command" to recreate the application with them. Admins can upload images or select a saved social photo; account owners authorize their own Instagram connection.

Sources: https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/ and https://www.postman.com/meta/instagram/
