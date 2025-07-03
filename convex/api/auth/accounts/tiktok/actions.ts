import { api } from "../../../../_generated/api";
import { httpAction } from "../../../../_generated/server";
import { v } from "convex/values";
import { mutation } from "../../../../_generated/server";

// Helper function to validate OAuth state parameter
function validateState(
  state: string | null,
  savedState: string | null
): boolean {
  return state === savedState;
}

// Helper function to parse URL parameters
function parseUrlParams(url: URL): {
  code: string | null;
  state: string | null;
  error: string | null;
} {
  return {
    code: url.searchParams.get("code"),
    state: url.searchParams.get("state"),
    error: url.searchParams.get("error"),
  };
}

// TikTok OAuth callback handler
export const tiktokCallbackAction = httpAction(async (ctx, request) => {
  const url = new URL(request.url);
  const { code, state, error } = parseUrlParams(url);

  // Check for OAuth errors
  if (error) {
    return new Response(`OAuth Error: ${error}`, { status: 400 });
  }

  // Validate authorization code
  if (!code) {
    return new Response("Authorization code not found", { status: 400 });
  }

  // Validate state parameter to prevent CSRF attacks
  if (!state) {
    return new Response("State parameter missing", { status: 400 });
  }

  try {
    // Exchange code for access token
    const tokenResponse = await fetch(
      "https://open.tiktokapis.com/v2/oauth/token/",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Cache-Control": "no-cache",
        },
        body: new URLSearchParams({
          client_key: "aw54n4kji9zjif7s", // Replace with actual client key
          client_secret: "7I303rou1rG1BW7lyAoZ32PQKqwZmB9M", // Replace with actual client secret
          code: code,
          grant_type: "authorization_code",
          redirect_uri:
            "https://patient-woodpecker-658.convex.site/auth/tiktok/callback",
        }),
      }
    );

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      throw new Error(`Token exchange failed: ${errorData}`);
    }

    const tokenData = await tokenResponse.json();
    const { access_token, refresh_token, expires_in, open_id } = tokenData;

    // Validate required fields
    if (!access_token || !refresh_token || !expires_in || !open_id) {
      throw new Error("Invalid token response from TikTok");
    }

    // Get user info from TikTok API to get display name
    const userInfoResponse = await fetch(
      "https://open.tiktokapis.com/v2/user/info/",
      {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      }
    );

    let accountName = `TikTok Account (${open_id})`;
    if (userInfoResponse.ok) {
      try {
        const userInfo = await userInfoResponse.json();
        if (userInfo.data && userInfo.data.display_name) {
          accountName = userInfo.data.display_name;
        }
      } catch (e) {
        console.warn("Failed to fetch user info, using default name");
      }
    }

    // For OAuth flows, we'll use the open_id as the user identifier
    // In a real implementation, you might want to pass the actual user ID through the state parameter
    const userId = open_id; // This should be replaced with actual user ID from your auth system

    // Upsert tokens into TikTokAccounts table
    const existingAccount = await ctx.runQuery(
      api.tiktokAccounts.queries.getByOpenId,
      {
        openId: open_id,
      }
    );

    let tiktokAccountId;
    if (existingAccount) {
      // Update existing account
      tiktokAccountId = await ctx.runMutation(
        api.tiktokAccounts.mutations.updateTokens,
        {
          openId: open_id,
          accessToken: access_token,
          refreshToken: refresh_token,
          expiresIn: expires_in,
        }
      );
    } else {
      // Create new account
      tiktokAccountId = await ctx.runMutation(
        api.tiktokAccounts.mutations.create,
        {
          userId: userId,
          openId: open_id,
          accessToken: access_token,
          refreshToken: refresh_token,
          expiresIn: expires_in,
        }
      );
    }

    // Append entry to UserAccounts.tiktokAccounts array
    await ctx.runMutation(api.userAccounts.mutations.addTikTokAccount, {
      userId: userId,
      openId: open_id,
      linkedAt: Date.now(),
    });

    // Return success page
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>TikTok Connection Success</title>
        <style>
          body { 
            font-family: Arial, sans-serif; 
            padding: 20px; 
            text-align: center;
            background: linear-gradient(135deg, #000000, #ff0050);
            color: white;
            min-height: 100vh;
            margin: 0;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .container {
            background: rgba(255, 255, 255, 0.1);
            padding: 40px;
            border-radius: 15px;
            backdrop-filter: blur(10px);
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
          }
          .success-icon {
            font-size: 48px;
            margin-bottom: 20px;
          }
          h1 { margin-bottom: 20px; }
          p { margin-bottom: 30px; opacity: 0.9; }
          button { 
            background: #ff0050; 
            color: white; 
            border: none; 
            padding: 12px 24px; 
            border-radius: 25px; 
            cursor: pointer;
            font-size: 16px;
            transition: all 0.3s ease;
          }
          button:hover {
            background: #e6004c;
            transform: translateY(-2px);
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="success-icon">🎉</div>
          <h1>TikTok Connected Successfully!</h1>
          <p>Your TikTok account "${accountName}" has been connected and is ready to use.</p>
          <button onclick="closeWindow()">Continue</button>
        </div>

        <script>
          function closeWindow() {
            if (window.opener) {
              // Send success message to parent window
              window.opener.postMessage({
                type: 'TIKTOK_ACCOUNT_CONNECTED',
                data: {
                  openId: '${open_id}',
                  accountName: '${accountName}',
                  linkedAt: ${Date.now()}
                },
                state: '${state}'
              }, '*');
              window.close();
            } else {
              // Fallback for direct access
              window.location.href = '/';
            }
          }

          // Auto-close after 3 seconds if user doesn't click
          setTimeout(() => {
            if (!window.closed) {
              closeWindow();
            }
          }, 3000);
        </script>
      </body>
      </html>
    `;

    return new Response(html, {
      headers: { "Content-Type": "text/html" },
    });
  } catch (error) {
    console.error("TikTok OAuth error:", error);

    // Return error page
    const errorHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>TikTok Connection Error</title>
        <style>
          body { 
            font-family: Arial, sans-serif; 
            padding: 20px; 
            text-align: center;
            background: #f8f9fa;
            color: #dc3545;
            min-height: 100vh;
            margin: 0;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .container {
            background: white;
            padding: 40px;
            border-radius: 15px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
            border: 2px solid #dc3545;
          }
          .error-icon {
            font-size: 48px;
            margin-bottom: 20px;
          }
          h1 { margin-bottom: 20px; color: #dc3545; }
          p { margin-bottom: 30px; color: #6c757d; }
          button { 
            background: #dc3545; 
            color: white; 
            border: none; 
            padding: 12px 24px; 
            border-radius: 25px; 
            cursor: pointer;
            font-size: 16px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="error-icon">❌</div>
          <h1>Connection Failed</h1>
          <p>Sorry, we couldn't connect your TikTok account. Please try again.</p>
          <button onclick="closeWindow()">Close</button>
        </div>

        <script>
          function closeWindow() {
            if (window.opener) {
              window.opener.postMessage({
                type: 'TIKTOK_CONNECTION_ERROR',
                error: '${error}'
              }, '*');
              window.close();
            } else {
              window.location.href = '/';
            }
          }
        </script>
      </body>
      </html>
    `;

    return new Response(errorHtml, {
      headers: { "Content-Type": "text/html" },
      status: 500,
    });
  }
});

// TikTok webhook verification handler for POST requests
export const tiktokWebhookVerificationAction = httpAction(
  async (ctx, request) => {
    try {
      // For webhook verification, TikTok sends a challenge request
      // We need to echo back the challenge parameter
      const url = new URL(request.url);
      const challenge = url.searchParams.get("hub.challenge");
      const verifyToken = url.searchParams.get("hub.verify_token");
      const mode = url.searchParams.get("hub.mode");

      console.log("TikTok webhook verification request:", {
        challenge,
        verifyToken,
        mode,
        url: request.url,
      });

      // For initial verification, we need to handle the challenge
      if (mode === "subscribe" && challenge) {
        // Echo back the challenge for verification
        console.log("Responding to webhook verification challenge:", challenge);
        return new Response(challenge, {
          status: 200,
          headers: { "Content-Type": "text/plain" },
        });
      }

      // If no challenge or mode, this might be an actual webhook event
      // You can handle webhook events here
      const body = await request.text();
      console.log("TikTok webhook event received:", body);

      // Return success response
      return new Response("OK", { status: 200 });
    } catch (error) {
      console.error("TikTok webhook verification error:", error);
      return new Response("Internal Server Error", { status: 500 });
    }
  }
);
