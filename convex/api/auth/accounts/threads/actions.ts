import { httpAction } from "../../../../_generated/server";
import { api } from "../../../../_generated/api";

export const threadsCallbackAction = httpAction(async (ctx, request) => {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");
  const error_description = url.searchParams.get("error_description");

  console.log("Threads callback parameters:", {
    code: code ? "✓ Present" : "✗ Missing",
    state,
    error,
    error_description
  });

  // Handle OAuth errors
  if (error) {
    console.error("Threads OAuth error:", error, error_description);
    return new Response(
      generateCallbackHTML({
        success: false,
        error: error || undefined,
        message: error_description || undefined
      }),
      {
        status: 400,
        headers: { "Content-Type": "text/html" }
      }
    );
  }

  // Validate required parameters
  if (!code || !state) {
    console.error("Missing OAuth parameters:", { code: !!code, state: !!state });
    return new Response(
      generateCallbackHTML({
        success: false,
        error: "missing_parameters",
        message: "Missing required OAuth parameters"
      }),
      {
        status: 400,
        headers: { "Content-Type": "text/html" }
      }
    );
  }

  try {
    // Environment variables check
    const clientId = process.env.THREADS_CLIENT_ID;
    const clientSecret = process.env.THREADS_CLIENT_SECRET;
    const redirectUri = process.env.THREADS_REDIRECT_URI;

    console.log("Environment variables check:", {
      clientId: clientId ? "✓ Set" : "✗ Missing",
      clientSecret: clientSecret ? "✓ Set" : "✗ Missing",
      redirectUri: redirectUri ? "✓ Set" : "✗ Missing"
    });

    if (!clientId || !clientSecret || !redirectUri) {
      throw new Error("Missing required environment variables");
    }

    // Step 1: Exchange authorization code for short-lived access token
    console.log("Step 1: Exchanging code for short-lived token...");
    const tokenExchangeParams = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
      code: code
    });

    console.log("Token exchange request params:", {
      client_id: clientId,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
      code: code ? "present" : "missing"
    });

    const tokenResponse = await fetch("https://graph.threads.net/oauth/access_token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: tokenExchangeParams.toString()
    });

    const tokenText = await tokenResponse.text();
    console.log("Token exchange response status:", tokenResponse.status);
    // Convert headers to a plain object for logging
    const headersObj: Record<string, string> = {};
    for (const [key, value] of tokenResponse.headers as any) {
      headersObj[key] = value;
    }
    console.log("Token exchange response headers:", headersObj);
    console.log("Token exchange raw response:", tokenText);

    if (!tokenResponse.ok) {
      throw new Error(`Token exchange failed: ${tokenResponse.status} - ${tokenText}`);
    }

    let tokenData;
    try {
      tokenData = JSON.parse(tokenText);
    } catch (e) {
      // Handle URL-encoded response
      const params = new URLSearchParams(tokenText);
      tokenData = {
        access_token: params.get("access_token"),
        user_id: params.get("user_id")
      };
    }

    console.log("Token exchange success:", {
      hasAccessToken: !!tokenData.access_token,
      hasUserId: !!tokenData.user_id,
      userId: tokenData.user_id
    });

    if (!tokenData.access_token || !tokenData.user_id) {
      throw new Error("Invalid token response: missing access_token or user_id");
    }

    // Step 2: Exchange short-lived token for long-lived token
    console.log("Step 2: Exchanging for long-lived token...");
    const longLivedTokenParams = new URLSearchParams({
      grant_type: "th_exchange_token",
      client_secret: clientSecret,
      access_token: tokenData.access_token
    });

    const longLivedUrl = `https://graph.threads.net/access_token?${longLivedTokenParams.toString()}`;

    const longLivedResponse = await fetch(longLivedUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      }
    });

    const longLivedText = await longLivedResponse.text();
    console.log("Long-lived token response status:", longLivedResponse.status);
    console.log("Long-lived token raw response:", longLivedText);

    let longLivedData;
    if (longLivedResponse.ok) {
      try {
        longLivedData = JSON.parse(longLivedText);
      } catch (e) {
        const params = new URLSearchParams(longLivedText);
        longLivedData = {
          access_token: params.get("access_token"),
          expires_in: params.get("expires_in")
        };
      }
      console.log("Long-lived token success:", {
        hasAccessToken: !!longLivedData.access_token,
        expiresIn: longLivedData.expires_in
      });
    } else {
      console.warn("Long-lived token exchange failed, using short-lived token");
      longLivedData = {
        access_token: tokenData.access_token,
        expires_in: 3600 // 1 hour default for short-lived tokens
      };
    }

    // Step 3: Get user profile information
    console.log("Step 3: Fetching user profile...");
    const finalToken = longLivedData.access_token;
    const profileUrl = `https://graph.threads.net/v1.0/me?fields=id,username,threads_profile_picture_url,threads_biography&access_token=${finalToken}`;

    console.log("Profile request URL:", profileUrl.replace(finalToken, "***TOKEN***"));

    const profileResponse = await fetch(profileUrl, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${finalToken}`
      }
    });

    const profileText = await profileResponse.text();
    console.log("Profile response status:", profileResponse.status);
    console.log("Profile raw response:", profileText);

    if (!profileResponse.ok) {
      throw new Error(`Profile fetch failed: ${profileResponse.status} - ${profileText}`);
    }

    const profileData = JSON.parse(profileText);
    console.log("Profile data:", {
      id: profileData.id,
      username: profileData.username,
      hasProfilePicture: !!profileData.threads_profile_picture_url
    });

    // Step 4: Save to database
    console.log("Step 4: Saving to database...");
    let userId: string | undefined = undefined;
    try {
      if (state) {
        const stateObj = JSON.parse(decodeURIComponent(state));
        userId = stateObj.userId;
      }
    } catch (e) {
      console.error("Failed to parse userId from state", e);
    }
    if (!userId) {
      throw new Error("User ID not found in OAuth state");
    }

    await ctx.runMutation(api.userAccounts.mutations.saveThreadsConnection, {
      userId: userId,
      threadsData: {
        threadsId: profileData.id,
        username: profileData.username,
        profilePictureUrl: profileData.threads_profile_picture_url,
        biography: profileData.threads_biography,
        accessToken: finalToken,
        expiresAt: Date.now() + (parseInt(longLivedData.expires_in) * 1000),
        scopes: "threads_basic,threads_content_publish"
      }
    });

    // Debug: Add account to metaAccounts
    console.log("Calling addAccount for metaAccounts...", {
      userId: userId,
      pageId: profileData.id,
      userAccountId: profileData.id,
      accountName: profileData.username,
      accountType: "threads",
      accessToken: finalToken,
      pagePermissions: undefined,
      username: profileData.username,
      instagramAccount: undefined
    });
    const metaAccountResult = await ctx.runMutation(api.metaAccounts.mutations.addAccount, {
      userId: userId,
      pageId: profileData.id,
      userAccountId: profileData.id,
      accountName: profileData.username,
      accountType: "threads",
      accessToken: finalToken,
      pagePermissions: undefined,
      username: profileData.username,
      instagramAccount: undefined
    });
    console.log("addAccount call finished. Result:", metaAccountResult);

    console.log("Database save successful");

    // Return success response
    return new Response(
      generateCallbackHTML({
        success: true,
        user: profileData.username && profileData.threads_profile_picture_url ? {
          username: profileData.username,
          avatar: profileData.threads_profile_picture_url
        } : undefined,
        error: undefined,
        message: undefined
      }),
      {
        headers: { "Content-Type": "text/html" }
      }
    );

  } catch (error) {
    console.error("Threads OAuth Error:", error);
    if (error instanceof Error) {
      console.error("Error stack:", error.stack);
    }
    return new Response(
      generateCallbackHTML({
        success: false,
        error: "oauth_error",
        message: error instanceof Error ? error.message : "Authentication failed"
      }),
      {
        status: 500,
        headers: { "Content-Type": "text/html" }
      }
    );
  }
});

// Helper function to generate callback HTML
interface CallbackUser {
  username: string;
  avatar: string;
}
interface CallbackHTMLArgs {
  success: boolean;
  user?: CallbackUser;
  error?: string;
  message?: string;
}
function generateCallbackHTML({ success, user, error, message }: CallbackHTMLArgs) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Threads Authorization</title>
      <style>
        body { 
          font-family: Arial, sans-serif; 
          display: flex; 
          justify-content: center; 
          align-items: center; 
          height: 100vh; 
          margin: 0; 
          background-color: #f5f5f5;
        }
        .container { 
          text-align: center; 
          background: white; 
          padding: 2rem; 
          border-radius: 10px; 
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .success { color: #22c55e; }
        .error { color: #ef4444; }
        .loading { color: #6b7280; }
      </style>
    </head>
    <body>
      <div class="container">
        ${success ?
      `<div class="success">
            <h2>✅ Threads Connected Successfully!</h2>
            <p>Welcome @${user?.username || 'User'}!</p>
            <p class="loading">Redirecting back to your app...</p>
          </div>` :
      `<div class="error">
            <h2>❌ Connection Failed</h2>
            <p>${message || 'Something went wrong'}</p>
            <p class="loading">Redirecting back to your app...</p>
          </div>`
    }
      </div>
      <script>
        // Send result to parent window
        if (window.opener) {
          window.opener.postMessage({
            type: 'THREADS_AUTH_SUCCESS',
            success: ${success},
            user: ${JSON.stringify(user)},
            error: ${JSON.stringify(error)}
          }, '*');
        }
        
        // Close popup after 3 seconds
        setTimeout(() => {
          window.close();
        }, 3000);
      </script>
    </body>
    </html>
  `;
}

// Alternative method: Direct token refresh
export const refreshThreadsToken = httpAction(async (ctx, request) => {
  try {
    const { access_token } = await request.json();

    const refreshParams = new URLSearchParams({
      grant_type: "th_refresh_token",
      access_token: access_token
    });

    const refreshUrl = `https://graph.threads.net/refresh_access_token?${refreshParams.toString()}`;

    const refreshResponse = await fetch(refreshUrl, {
      method: "GET"
    });

    const refreshData = await refreshResponse.json();

    if (!refreshResponse.ok) {
      throw new Error(`Token refresh failed: ${refreshData.error?.message || 'Unknown error'}`);
    }

    return new Response(JSON.stringify(refreshData), {
      headers: { "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error("Token refresh error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
});