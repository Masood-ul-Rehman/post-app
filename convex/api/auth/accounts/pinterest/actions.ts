import { httpAction } from "../../../../_generated/server";

// Pinterest OAuth callback endpoint
export const pinterestCallbackAction = httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const error = url.searchParams.get("error");
    const error_description = url.searchParams.get("error_description");

    console.log("Pinterest callback parameters:", {
        code,
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
        <title>Pinterest Connection Error</title>
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
          <h1>Pinterest Connection Failed</h1>
          <p><strong>Error:</strong> ${error}</p>
          <p><strong>Description:</strong> ${error_description || "Unknown error"}</p>
          <button class="close-button" onclick="window.close()">Close Window</button>
        </div>
        <script>
          window.opener && window.opener.postMessage({
            type: 'PINTEREST_ACCOUNT_ERROR',
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
        <title>Pinterest Connection Error</title>
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
          <h1>Pinterest Connection Error</h1>
          <p>Authorization code not found. Please try connecting again.</p>
          <button class="close-button" onclick="window.close()">Close Window</button>
        </div>
        <script>
          window.opener && window.opener.postMessage({
            type: 'PINTEREST_ACCOUNT_ERROR',
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
        const clientId = process.env.PINTEREST_CLIENT_ID;
        const clientSecret = process.env.PINTEREST_CLIENT_SECRET;
        const redirectUri = process.env.PINTEREST_REDIRECT_URI;

        console.log("Environment variables check:", {
            clientId: clientId ? "✓ Set" : "✗ Missing",
            clientSecret: clientSecret ? "✓ Set" : "✗ Missing",
            redirectUri: redirectUri ? "✓ Set" : "✗ Missing",
        });

        if (!clientId || !clientSecret || !redirectUri) {
            const missingVars = [];
            if (!clientId) missingVars.push("PINTEREST_CLIENT_ID");
            if (!clientSecret) missingVars.push("PINTEREST_CLIENT_SECRET");
            if (!redirectUri) missingVars.push("PINTEREST_REDIRECT_URI");

            throw new Error(
                `Missing environment variables: ${missingVars.join(", ")}. Please run: npx convex env set ${missingVars[0]} your_value`
            );
        }

        console.log("Starting Pinterest token exchange...");

        // Exchange authorization code for access token
        const tokenResponse = await fetch("https://api.pinterest.com/v5/oauth/token", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                "Authorization": `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
            },
            body: new URLSearchParams({
                grant_type: "authorization_code",
                code: code,
                redirect_uri: redirectUri,
            }),
        });

        if (!tokenResponse.ok) {
            const errorText = await tokenResponse.text();
            console.error("Pinterest token exchange error:", errorText);
            throw new Error(`Failed to exchange code for token: ${errorText}`);
        }

        const tokenData = await tokenResponse.json();
        console.log("Pinterest token response:", {
            hasAccessToken: !!tokenData.access_token,
            hasRefreshToken: !!tokenData.refresh_token,
            expiresIn: tokenData.expires_in,
        });

        const { access_token: accessToken, refresh_token: refreshToken, expires_in: expiresIn } = tokenData;

        // Get user profile information
        console.log("Fetching Pinterest user profile...");
        const profileResponse = await fetch("https://api.pinterest.com/v5/user_account", {
            headers: {
                "Authorization": `Bearer ${accessToken}`,
            },
        });

        if (!profileResponse.ok) {
            const errorText = await profileResponse.text();
            console.error("Profile fetch error:", errorText);
            throw new Error(`Failed to fetch Pinterest profile: ${errorText}`);
        }

        const profileData = await profileResponse.json();
        console.log("Pinterest profile data:", profileData);

        // Return success page with account data
        const successHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Pinterest Connected</title>
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
            color: #e60023;
            font-size: 48px;
            margin-bottom: 1rem;
          }
          h1 { color: #e60023; margin-bottom: 1rem; }
          .account-info {
            background: #f8fafc;
            padding: 1rem;
            border-radius: 4px;
            margin: 1rem 0;
            text-align: left;
          }
          .close-button {
            background: #e60023;
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
          <h1>Pinterest Connected!</h1>
          <div class="account-info">
            <p><strong>Username:</strong> ${profileData.username || "N/A"}</p>
            <p><strong>Full Name:</strong> ${profileData.full_name || "N/A"}</p>
            <p><strong>About:</strong> ${profileData.about || "N/A"}</p>
          </div>
          <p>You can now close this window and return to the application.</p>
          <script>
            if (window.opener) {
              window.opener.postMessage(
                {
                  type: "PINTEREST_ACCOUNT_CONNECTED",
                  data: {
                    accessToken: "${accessToken}",
                    refreshToken: "${refreshToken || ""}",
                    expiresIn: ${expiresIn || 0},
                    accountName: "${profileData.full_name || profileData.username || "Pinterest Account"}",
                    accountType: "pinterest",
                    userAccountId: "${profileData.username || ""}",
                    username: "${profileData.username || ""}",
                    userId: "${profileData.username || ""}"
                  },
                  state: "${state}"
                },
                '*'
              );
            }
          </script>
          <button class="close-button" onclick="window.close()">Close Window</button>
        </div>
      </body>
      </html>
    `;

        return new Response(successHtml, {
            headers: { "Content-Type": "text/html" },
        });
    } catch (error) {
        console.error("Pinterest OAuth error:", error);
        const errorMessage = error instanceof Error ? error.message : String(error);

        const errorHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Pinterest Connection Error</title>
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
          <h1>Pinterest Connection Error</h1>
          <p>${errorMessage}</p>
          <button class="close-button" onclick="window.close()">Close Window</button>
        </div>
        <script>
          window.opener && window.opener.postMessage({
            type: 'PINTEREST_ACCOUNT_ERROR',
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