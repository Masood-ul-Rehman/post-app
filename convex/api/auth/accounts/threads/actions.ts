import { httpAction } from "../../../../_generated/server";
import { api } from "../../../../_generated/api";

// Threads OAuth callback endpoint
export const threadsCallbackAction = httpAction(async (ctx, request) => {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");
  const error_description = url.searchParams.get("error_description");

  // Use environment variables for Threads App credentials
  const appId = process.env.THREADS_APP_ID!;
  const appSecret = process.env.THREADS_APP_SECRET!;
  const redirectUri = process.env.THREADS_REDIRECT_URI!;

  console.log("Threads callback parameters:", {
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
        <title>Threads Connection Error</title>
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
          <h1>Threads Connection Failed</h1>
          <p><strong>Error:</strong> ${error}</p>
          <p><strong>Description:</strong> ${error_description || "Unknown error"}</p>
          <button class="close-button" onclick="window.close()">Close Window</button>
        </div>
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
        <title>Threads Connection Error</title>
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
          <h1>Threads Connection Error</h1>
          <p>Authorization code not found. Please try connecting again.</p>
          <button class="close-button" onclick="window.close()">Close Window</button>
        </div>
      </body>
      </html>
    `;
    return new Response(errorHtml, {
      headers: { "Content-Type": "text/html" },
    });
  }

  try {
    // Exchange code for access token using Threads API
    const tokenResponse = await fetch(
      `https://www.threads.com/oauth/access_token?` +
        `client_id=${appId}&` +
        `client_secret=${appSecret}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `code=${code}&` +
        `grant_type=authorization_code`
    );

    if (!tokenResponse.ok) {
      throw new Error("Failed to exchange code for token");
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // Get user's Threads profile information using Threads API
    const profileResponse = await fetch(
      `https://www.threads.com/api/v1/users/me?access_token=${accessToken}`
    );

    if (!profileResponse.ok) {
      throw new Error("Failed to fetch user profile");
    }

    const profileData = await profileResponse.json();

    // Return success page with account data
    const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Threads Connection Success</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              padding: 20px; 
              background-color: #f3f4f6;
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
              margin: 0;
            }
            .container {
              background: white;
              padding: 2rem;
              border-radius: 8px;
              box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
              text-align: center;
              max-width: 500px;
            }
            .success-icon {
              color: #10b981;
              font-size: 48px;
              margin-bottom: 1rem;
            }
            h1 { color: #1f2937; margin-bottom: 1rem; }
            .account-info {
              background: #f9fafb;
              padding: 1rem;
              border-radius: 5px;
              margin: 1rem 0;
              text-align: left;
            }
            .connect-button {
              background: #000;
              color: white;
              border: none;
              padding: 12px 24px;
              border-radius: 5px;
              cursor: pointer;
              font-size: 14px;
              font-weight: 500;
              margin-top: 1rem;
              transition: background-color 0.2s;
            }
            .connect-button:hover {
              background: #374151;
            }
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
            <div class="success-icon">✓</div>
            <h1>Threads Account Connected!</h1>
            <p>Your Threads account has been successfully connected.</p>
            
            <div class="account-info">
              <p><strong>Name:</strong> ${profileData.data?.name || "N/A"}</p>
              <p><strong>Username:</strong> ${profileData.data?.username || "N/A"}</p>
              <p><strong>User ID:</strong> ${profileData.data?.id || "N/A"}</p>
            </div>

            <button class="connect-button" onclick="connectThreads()">
              Connect This Account
            </button>
            
            <br>
            <button class="close-button" onclick="window.close()">
              Close Window
            </button>
          </div>

          <script>
            function connectThreads() {
              if (window.opener) {
                window.opener.postMessage({
                  type: 'THREADS_ACCOUNT_CONNECTED',
                  state: '${state || ""}',
                  data: {
                    accessToken: '${accessToken}',
                    accountName: '${profileData.data?.name || profileData.data?.username || "Threads Account"}',
                    accountType: 'threads',
                    pageId: '${profileData.data?.id || ""}',
                    userAccountId: '${profileData.data?.id || ""}',
                    username: '${profileData.data?.username || ""}',
                    userId: '${profileData.data?.id || ""}'
                  }
                }, '*');
                window.close();
              }
            }
          </script>
        </body>
        </html>
      `;

    return new Response(html, {
      headers: { "Content-Type": "text/html" },
    });
  } catch (error) {
    console.error("Threads callback error:", error);
    const errorHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Threads Connection Error</title>
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
          <h1>Threads Connection Error</h1>
          <p>Failed to connect your Threads account. Please try again.</p>
          <p><strong>Error:</strong> ${error}</p>
          <button class="close-button" onclick="window.close()">Close Window</button>
        </div>
      </body>
      </html>
    `;
    return new Response(errorHtml, {
      headers: { "Content-Type": "text/html" },
    });
  }
});
