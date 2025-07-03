import { api } from "../../../../_generated/api";
import { httpAction } from "../../../../_generated/server";

// Function to decode base64URL to JSON
function decodeJWTPayload(payload: string) {
  // Convert base64url to base64 by replacing URL-safe chars
  const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
  // Pad with "=" if needed
  const padded = base64.padEnd(
    base64.length + ((4 - (base64.length % 4)) % 4),
    "="
  );
  // Convert base64 to string using btoa
  try {
    const decoded = decodeURIComponent(escape(atob(padded)));
    return JSON.parse(decoded);
  } catch (error) {
    console.error("Error decoding JWT payload:", error);
    return null;
  }
}

// LinkedIn OAuth callback
export const linkedinCallbackAction = httpAction(async (ctx, request) => {
  // Log the full URL for debugging
  console.log("LinkedIn callback URL:", request.url);

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");
  const error_description = url.searchParams.get("error_description");

  // Log the parameters we received
  console.log("Received parameters:", {
    code,
    state,
    error,
    error_description,
  });

  // Check for LinkedIn-specific errors
  if (error) {
    return new Response(
      `LinkedIn OAuth error: ${error}\nDescription: ${error_description}`,
      { status: 400 }
    );
  }

  // Check for authorization code
  if (!code) {
    return new Response(
      "Authorization code not found in the callback URL parameters",
      { status: 400 }
    );
  }

  try {
    // Exchange authorization code for tokens
    const tokenResponse = await fetch(
      "https://www.linkedin.com/oauth/v2/accessToken",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code,
          client_id: "776qiytqh6ynfp",
          client_secret: "WPL_AP1.mNxhK3WNlxundDVH.LWiOSg==",
          redirect_uri:
            "https://patient-woodpecker-658.convex.site/auth/linkedin/callback",
        }),
      }
    );

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error("Token exchange error:", errorText);
      throw new Error(`Failed to exchange code for token: ${errorText}`);
    }

    const tokenData = await tokenResponse.json();
    console.log("Token response:", tokenData);

    const { access_token: accessToken, id_token } = tokenData;

    // Get user info from id_token if available
    let userData = null;
    if (id_token) {
      const [header, payload, signature] = id_token.split(".");
      userData = decodeJWTPayload(payload);
      console.log("Decoded user data:", userData);
    }

    // If no id_token or decode failed, fetch profile from LinkedIn API
    if (!userData) {
      const profileResponse = await fetch(
        "https://api.linkedin.com/v2/me?projection=(id,localizedFirstName,localizedLastName)",
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (!profileResponse.ok) {
        throw new Error("Failed to fetch profile information");
      }

      userData = await profileResponse.json();
    }

    // Return success page with account data
    const accountData = {
      userId: userData.sub || userData.id,
      userAccountId: userData.sub || userData.id,
      accountName:
        userData.name ||
        `${userData.localizedFirstName} ${userData.localizedLastName}`,
      accountType: "linkedin",
      accessToken: accessToken,
    };

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>LinkedIn Connection Success</title>
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
            color: #0a66c2;
            font-size: 48px;
            margin-bottom: 1rem;
          }
          h1 { color: #0a66c2; margin-bottom: 1rem; }
          .account-info {
            background: #f8fafc;
            padding: 1rem;
            border-radius: 4px;
            margin: 1rem 0;
            text-align: left;
          }
          .close-button {
            margin-top: 1rem;
            color: #666;
            text-decoration: underline;
            cursor: pointer;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="success-icon">✓</div>
          <h1>LinkedIn Account Connected</h1>
          <div class="account-info">
            <p><strong>Name:</strong> ${accountData.accountName}</p>
          </div>
          <p>You can now close this window and return to the application.</p>
          <script>
            if (window.opener) {
              window.opener.postMessage(
                {
                  type: "LINKEDIN_ACCOUNT_CONNECTED",
                  data: ${JSON.stringify(accountData)},
                  state: "${state}"
                },
                '*'
              );
            }
          </script>
          <a class="close-button" onclick="window.close()">Close Window</a>
        </div>
      </body>
      </html>
    `;

    return new Response(html, {
      headers: { "Content-Type": "text/html" },
    });
  } catch (error) {
    console.error("LinkedIn OAuth error:", error);
    return new Response(`Error: ${error}`, { status: 500 });
  }
});
