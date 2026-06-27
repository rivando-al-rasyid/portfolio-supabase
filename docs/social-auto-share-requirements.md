# Social auto-share requirements

Auto-share runs server-side through the Next.js route:

```txt
POST /api/webhooks/social-share
```

The browser dashboard only saves platform credentials and creates queue rows. It does **not** call Facebook, Instagram, LinkedIn, or X directly.

## Supported platforms

Only these platforms are supported by the production auto-share sender:

| Platform | Required destination | Required token | Posting behavior |
| --- | --- | --- | --- |
| Facebook Page | Facebook Page ID | Page access token with Pages publishing permissions | Creates a Page feed post with `message` and `link`. |
| Instagram | Instagram Business IG User ID | Instagram Graph API access token with content publishing access | Creates an image media container from the blog/project image URL, waits briefly for it, then publishes it. |
| LinkedIn | LinkedIn Person URN, for example `urn:li:person:...` | OAuth access token with `w_member_social` | Creates a LinkedIn UGC post. If a URL exists, it creates an article share. |
| X | Optional account ID | OAuth user access token with `tweet.write` | Creates a post through X API v2. |

## Important platform notes

- Facebook posting uses the Meta Pages API. The Page token must belong to a user/app that can create content for that Page.
- Instagram cannot publish text-only CMS items through this sender. Add a public blog cover image or project image before publishing if Instagram is selected.
- LinkedIn self-serve member sharing expects a Person URN and `w_member_social` permission.
- X posting requires a user access token, not an app-only bearer token.

## Environment variables

```env
NEXT_PUBLIC_SUPABASE_URL=https://vvsuyntqnehrrrsnnlgo.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_6zFE4f7hcoejgByjC4Wqjw_pRZ3KQ7O
NEXT_PUBLIC_SITE_URL=http://localhost:3000

SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SOCIAL_SHARE_WEBHOOK_SECRET=change-this-secret
SOCIAL_SHARE_META_GRAPH_VERSION=v22.0
```

Use `SOCIAL_SHARE_WEBHOOK_SECRET` in your scheduler request:

```bash
curl -X POST "$NEXT_PUBLIC_SITE_URL/api/webhooks/social-share" \
  -H "content-type: application/json" \
  -H "x-webhook-secret: $SOCIAL_SHARE_WEBHOOK_SECRET" \
  -d '{"limit":10}'
```
