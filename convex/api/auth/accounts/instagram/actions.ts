import { httpAction } from "../../../../_generated/server";
import { api } from "../../../../_generated/api";
import { internal } from "../../../../_generated/api";

// Instagram OAuth callback endpoint
export const instagramCallbackAction = httpAction(async (ctx, request) => {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");
  const error_description = url.searchParams.get("error_description");

  console.log("Instagram callback parameters:", {
    code: code ? "✓ Present" : "✗ Missing",
    state,
    error,
    error_description,
  });

  // Check for OAuth errors
  if (error) {
    const errorHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Instagram Connection Error</title>
        <style>
          body { 
            font-family: Arial, sans-serif; 
            padding: 20px; 
            display: flex; 
            justify-content: center; 
            align-items: center; 
            min-height: 100vh; 
            margin: 0;
            background-color: #f3f4f6;
          }
          .container {
            background: white;
            padding: 2rem;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            text-align: center;
          }
          .error-icon {
            color: #ef4444;
            font-size: 48px;
            margin-bottom: 1rem;
          }
          h1 { color: #ef4444; margin-bottom: 1rem; }
          .close-button {
            background: #6b7280;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 5px;
            cursor: pointer;
            font-size: 14px;
            margin-top: 1rem;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="error-icon">✗</div>
          <h1>Instagram Connection Failed</h1>
          <p><strong>Error:</strong> ${error}</p>
          <p><strong>Description:</strong> ${error_description || "Unknown error"}</p>
          <button class="close-button" onclick="window.close()">Close Window</button>
        </div>
        <script>
          window.opener && window.opener.postMessage({
            type: 'INSTAGRAM_ACCOUNT_ERROR',
            state: "${state}",
            error: "${error}: ${error_description || "Unknown error"}"
          }, '*');
        </script>
      </body>
      </html>
    `;
    return new Response(errorHtml, {
      headers: { "Content-Type": "text/html" },
    });
  }

  // Check for authorization code
  if (!code) {
    const errorHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Instagram Connection Error</title>
        <style>
          body { 
            font-family: Arial, sans-serif; 
            padding: 20px; 
            display: flex; 
            justify-content: center; 
            align-items: center; 
            min-height: 100vh; 
            margin: 0;
            background-color: #f3f4f6;
          }
          .container {
            background: white;
            padding: 2rem;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            text-align: center;
          }
          .error-icon {
            color: #ef4444;
            font-size: 48px;
            margin-bottom: 1rem;
          }
          h1 { color: #ef4444; margin-bottom: 1rem; }
          .close-button {
            background: #6b7280;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 5px;
            cursor: pointer;
            font-size: 14px;
            margin-top: 1rem;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="error-icon">✗</div>
          <h1>Instagram Connection Error</h1>
          <p>Authorization code not found. Please try connecting again.</p>
          <button class="close-button" onclick="window.close()">Close Window</button>
        </div>
        <script>
          window.opener && window.opener.postMessage({
            type: 'INSTAGRAM_ACCOUNT_ERROR',
            state: "${state}",
            error: "Authorization code not found"
          }, '*');
        </script>
      </body>
      </html>
    `;
    return new Response(errorHtml, {
      headers: { "Content-Type": "text/html" },
    });
  }

  try {
    // Check for required environment variables
    const clientId = process.env.INSTAGRAM_CLIENT_ID;
    const clientSecret = process.env.INSTAGRAM_CLIENT_SECRET;
    const redirectUri = process.env.INSTAGRAM_REDIRECT_URI;

    console.log("Environment variables check:", {
      clientId: clientId ? "✓ Set" : "✗ Missing",
      clientSecret: clientSecret ? "✓ Set" : "✗ Missing",
      redirectUri: redirectUri ? "✓ Set" : "✗ Missing",
    });

    if (!clientId || !clientSecret || !redirectUri) {
      const missingVars = [];
      if (!clientId) missingVars.push("INSTAGRAM_CLIENT_ID");
      if (!clientSecret) missingVars.push("INSTAGRAM_CLIENT_SECRET");
      if (!redirectUri) missingVars.push("INSTAGRAM_REDIRECT_URI");

      throw new Error(
        `Missing environment variables: ${missingVars.join(", ")}. Please run: npx convex env set ${missingVars[0]} your_value`
      );
    }

    console.log("Starting Instagram token exchange...");

    // Step 1: Exchange authorization code for short-lived access token
    const tokenResponse = await fetch(
      "https://api.instagram.com/oauth/access_token",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          grant_type: "authorization_code",
          redirect_uri: redirectUri,
          code: code,
        }),
      }
    );

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error("Instagram token exchange error:", errorText);
      throw new Error(`Failed to exchange code for token: ${errorText}`);
    }

    const tokenData = await tokenResponse.json();
    console.log("Instagram token response:", {
      hasAccessToken: !!tokenData.access_token,
      userId: tokenData.user_id,
    });

    const { access_token: shortLivedToken, user_id } = tokenData;

    // Step 2: Exchange short-lived token for long-lived token
    // Log the full URL and token for debugging
    const longLivedTokenUrl =
      `https://graph.instagram.com/v17.0/access_token?` +
      `grant_type=ig_exchange_token&` +
      `client_secret=${clientSecret}&` +
      `access_token=${shortLivedToken}`;
    console.log("Long-lived token URL:", longLivedTokenUrl);
    console.log("Short-lived token:", shortLivedToken);

    console.log("Getting long-lived access token...");
    const longLivedTokenResponse = await fetch(longLivedTokenUrl);

    if (!longLivedTokenResponse.ok) {
      const errorText = await longLivedTokenResponse.text();
      console.error("Long-lived token error:", errorText);
      throw new Error(`Failed to get long-lived access token: ${errorText}`);
    }

    const longLivedTokenData = await longLivedTokenResponse.json();
    const longLivedToken = longLivedTokenData.access_token;
    const expiresIn = longLivedTokenData.expires_in;
    console.log(
      "Long-lived token obtained successfully, expires in:",
      expiresIn,
      "seconds"
    );

    // Step 3: Get user profile information
    console.log("Fetching Instagram user profile...");
    const profileResponse = await fetch(
      `https://graph.instagram.com/me?fields=id,username,account_type,media_count&access_token=${longLivedToken}`
    );

    if (!profileResponse.ok) {
      const errorText = await profileResponse.text();
      console.error("Profile fetch error:", errorText);
      throw new Error(`Failed to fetch Instagram profile: ${errorText}`);
    }

    const profileData = await profileResponse.json();
    console.log("Instagram profile data:", profileData);

    // Check if it's a business account
    if (profileData.account_type !== "BUSINESS") {
      const errorHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Instagram Connection Error</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; background-color: #f3f4f6; }
            .container { background: white; padding: 2rem; border-radius: 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1); text-align: center; }
            .error-icon { color: #ef4444; font-size: 48px; margin-bottom: 1rem; }
            h1 { color: #ef4444; margin-bottom: 1rem; }
            .close-button { background: #6b7280; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; font-size: 14px; margin-top: 1rem; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="error-icon">✗</div>
            <h1>Instagram Connection Error</h1>
            <p>Your Instagram account type is <b>${profileData.account_type}</b>. Only <b>Business</b> accounts are supported.</p>
            <p>Please convert your Instagram account to a Business account and try again.</p>
            <button class="close-button" onclick="window.close()">Close Window</button>
          </div>
          <script>
            window.opener && window.opener.postMessage({
              type: 'INSTAGRAM_ACCOUNT_ERROR',
              state: "${state}",
              error: 'Account type "${profileData.account_type}" is not supported. Please convert your Instagram account to a Business account first.'
            }, '*');
          </script>
        </body>
        </html>
      `;
      return new Response(errorHtml, {
        headers: { "Content-Type": "text/html" },
      });
    }

    // Prepare account data for the frontend
    const accountData = {
      igBusinessId: profileData.id,
      accountName: profileData.username,
      accountType: "instagram",
      accessToken: longLivedToken,
      expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
      permissions: [
        "instagram_business_basic",
        "instagram_business_manage_messages",
        "instagram_business_manage_comments",
        "instagram_business_content_publish",
        "instagram_business_manage_insights",
      ],
      metadata: {
        accountType: profileData.account_type,
        mediaCount: profileData.media_count,
      },
      // Required for metaAccounts
      pageId: profileData.id, // Use IG id as pageId fallback
      userAccountId: profileData.id, // Use IG id as userAccountId fallback
      pagePermissions: [
        "instagram_business_basic",
        "instagram_business_manage_messages",
        "instagram_business_manage_comments",
        "instagram_business_content_publish",
        "instagram_business_manage_insights",
      ],
      username: profileData.username,
      instagramAccount: {
        id: profileData.id,
        username: profileData.username,
        name: profileData.username,
      },
    };

    console.log(
      "Sending successful connection data for:",
      profileData.username
    );

    const successHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Instagram Connected</title>
        <style>
          body { 
            font-family: Arial, sans-serif; 
            padding: 20px; 
            display: flex; 
            justify-content: center; 
            align-items: center; 
            min-height: 100vh; 
            margin: 0;
            background-color: #f3f4f6;
          }
          .container {
            background: white;
            padding: 2rem;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            text-align: center;
          }
          .success-icon {
            color: #10b981;
            font-size: 48px;
            margin-bottom: 1rem;
          }
          h1 { color: #10b981; margin-bottom: 1rem; }
          .close-button {
            background: #10b981;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 5px;
            cursor: pointer;
            font-size: 14px;
            margin-top: 1rem;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="success-icon">✓</div>
          <h1>Instagram Connected!</h1>
          <p>Successfully connected @${profileData.username}</p>
          <button class="close-button" onclick="window.close()">Close Window</button>
        </div>
        <script>
          window.opener && window.opener.postMessage({
            type: 'INSTAGRAM_ACCOUNT_CONNECTED',
            state: "${state}",
            data: ${JSON.stringify(accountData)}
          }, '*');
          
          // Auto-close after 2 seconds
          setTimeout(() => {
            window.close();
          }, 2000);
        </script>
      </body>
      </html>
    `;

    return new Response(successHtml, {
      headers: { "Content-Type": "text/html" },
    });
  } catch (error) {
    console.error("Instagram OAuth error:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);

    const errorHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Instagram Connection Error</title>
        <style>
          body { 
            font-family: Arial, sans-serif; 
            padding: 20px; 
            display: flex; 
            justify-content: center; 
            align-items: center; 
            min-height: 100vh; 
            margin: 0;
            background-color: #f3f4f6;
          }
          .container {
            background: white;
            padding: 2rem;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            text-align: center;
          }
          .error-icon {
            color: #ef4444;
            font-size: 48px;
            margin-bottom: 1rem;
          }
          h1 { color: #ef4444; margin-bottom: 1rem; }
          .close-button {
            background: #6b7280;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 5px;
            cursor: pointer;
            font-size: 14px;
            margin-top: 1rem;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="error-icon">✗</div>
          <h1>Instagram Connection Error</h1>
          <p>${errorMessage}</p>
          <button class="close-button" onclick="window.close()">Close Window</button>
        </div>
        <script>
          window.opener && window.opener.postMessage({
            type: 'INSTAGRAM_ACCOUNT_ERROR',
            state: "${state}",
            error: ${JSON.stringify(errorMessage)}
          }, '*');
        </script>
      </body>
      </html>
    `;

    return new Response(errorHtml, {
      headers: { "Content-Type": "text/html" },
    });
  }
});
