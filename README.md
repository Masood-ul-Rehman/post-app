# Social Media Management App
  
This is a project built with [Chef](https://chef.convex.dev) using [Convex](https://convex.dev) as its backend.
  
This project is connected to the Convex deployment named [`usable-chihuahua-464`](https://dashboard.convex.dev/d/usable-chihuahua-464).
  
## Project structure
  
The frontend code is in the `app` directory and is built with [Vite](https://vitejs.dev/).
  
The backend code is in the `convex` directory.
  
`npm run dev` will start the frontend and backend servers.

## App authentication

Chef apps use [Convex Auth](https://auth.convex.dev/) with Anonymous auth for easy sign in. You may wish to change this before deploying your app.

## Social Media Integration Setup

This app supports both Facebook Pages and Instagram Basic Display API connections. Note that Instagram posting requires Facebook Graph API with Instagram Business accounts.

### Facebook Integration Setup

#### 1. Create a Facebook App

1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Create a new app or use an existing one
3. Add the following products to your app:
   - Facebook Login
   - Pages API

#### 2. Configure App Settings

1. In your Facebook App dashboard, go to **App Settings > Basic**
2. Note down your **App ID** and **App Secret**
3. Add your domain to **App Domains**
4. Add your redirect URI to **Valid OAuth Redirect URIs**:
   - For development: `http://localhost:5173/api/auth/accounts/facebook/callback`
   - For production: `https://yourdomain.com/api/auth/accounts/facebook/callback`

#### 3. Set Environment Variables

Set the following environment variables in your Convex deployment:

```bash
npx convex env set FACEBOOK_APP_ID "your_facebook_app_id"
npx convex env set FACEBOOK_APP_SECRET "your_facebook_app_secret"
npx convex env set FACEBOOK_REDIRECT_URI "https://yourdomain.com/api/auth/accounts/facebook/callback"
```

For local development, create a `.env.local` file in the root directory:

```env
VITE_FACEBOOK_CLIENT_ID=your_facebook_app_id
VITE_FACEBOOK_CLIENT_SECRET=your_facebook_app_secret
VITE_FACEBOOK_REDIRECT_URI=http://localhost:5173/api/auth/accounts/facebook/callback
```

### Instagram Integration Setup

#### 1. Create an Instagram App

1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Create a new app or use an existing one
3. Add the following products to your app:
   - Instagram Basic Display

#### 2. Configure App Settings

1. In your Instagram App dashboard, go to **App Settings > Basic**
2. Note down your **App ID** and **App Secret**
3. Add your domain to **App Domains**
4. Add your redirect URI to **Valid OAuth Redirect URIs**:
   - For development: `http://localhost:5173/api/auth/accounts/instagram/callback`
   - For production: `https://yourdomain.com/api/auth/accounts/instagram/callback`

#### 3. Set Environment Variables

Set the following environment variables in your Convex deployment:

```bash
npx convex env set INSTAGRAM_CLIENT_ID "your_instagram_app_id"
npx convex env set INSTAGRAM_CLIENT_SECRET "your_instagram_app_secret"
npx convex env set INSTAGRAM_REDIRECT_URI "https://yourdomain.com/api/auth/accounts/instagram/callback"
```

For local development, add to your `.env.local` file:

```env
VITE_INSTAGRAM_CLIENT_ID=your_instagram_app_id
VITE_INSTAGRAM_CLIENT_SECRET=your_instagram_app_secret
VITE_INSTAGRAM_REDIRECT_URI=http://localhost:5173/api/auth/accounts/instagram/callback
```

### Account Requirements

#### Facebook
- You need to be an admin of a Facebook Page
- Your app must have the following permissions:
  - `pages_manage_posts`
  - `pages_read_engagement`
  - `instagram_basic`
  - `instagram_content_publish`

#### Instagram
- Your Instagram account must be a **Business** or **Creator** account
- **Note**: Instagram Basic Display API only supports reading data, not posting
- For posting to Instagram, you need to use Facebook Graph API with Instagram Business accounts

### Testing the Integration

1. Start your development server: `npm run dev`
2. Click "Connect Facebook" to connect Facebook Pages
3. Click "Connect Instagram" to connect Instagram accounts (read-only)
4. Try creating posts for Facebook (Instagram posting is not supported with Basic Display API)

### Troubleshooting

**Facebook Connection Issues:**
- Ensure you're an admin of the Facebook Page
- Check that your app has the required permissions
- Verify the environment variables are set correctly

**Instagram Connection Issues:**
- Ensure your Instagram account is a Business/Creator account
- Check that your app has the required permissions
- Note that Instagram Basic Display API doesn't support posting

**Instagram Posting Limitation:**
- Instagram Basic Display API only supports reading user data
- For posting to Instagram, you need Facebook Graph API with Instagram Business accounts
- This requires connecting Instagram Business accounts through Facebook Pages

## Developing and deploying your app

Check out the [Convex docs](https://docs.convex.dev/) for more information on how to develop with Convex.
* If you're new to Convex, the [Overview](https://docs.convex.dev/understanding/) is a good place to start
* Check out the [Hosting and Deployment](https://docs.convex.dev/production/) docs for how to deploy your app
* Read the [Best Practices](https://docs.convex.dev/understanding/best-practices/) guide for tips on how to improve you app further

## HTTP API

User-defined http routes are defined in the `convex/router.ts` file. We split these routes into a separate file from `convex/http.ts` to allow us to prevent the LLM from modifying the authentication routes.
# post-app
