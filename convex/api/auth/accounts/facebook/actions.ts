import { api } from "../../../../_generated/api";
import { httpAction } from "../../../../_generated/server";

// Facebook OAuth callback
export const facebookCallbackAction = httpAction(async (ctx, request) => {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");

  if (!code) {
    return new Response("Authorization code not found", { status: 400 });
  }

  try {
    // Exchange code for access token
    const tokenResponse = await fetch(
      `https://graph.facebook.com/v23.0/oauth/access_token?` +
        `client_id=544725944687063&` +
        `client_secret=56486f8545e10723bccbe1985371e89f&` +
        // FIX: Use the correct Facebook redirect URI here
        `redirect_uri=https://patient-woodpecker-658.convex.site/auth/facebook/callback&` +
        `code=${code}`
    );

    if (!tokenResponse.ok) {
      throw new Error("Failed to exchange code for token");
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // Get user's pages
    const pagesResponse = await fetch(
      `https://graph.facebook.com/v18.0/me/accounts?access_token=${accessToken}`
    );

    if (!pagesResponse.ok) {
      throw new Error("Failed to fetch user pages");
    }

    const pagesData = await pagesResponse.json();

    // Return success page with account data
    const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Facebook Connection Success</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            .account { margin: 10px 0; padding: 10px; border: 1px solid #ddd; border-radius: 5px; }
            button { background: #1877f2; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; }
          </style>
        </head>
        <body>
          <h1>Facebook Pages Connected Successfully!</h1>
          <p>Select the pages you want to connect:</p>
          ${pagesData.data
            .map(
              (page: any) => `
            <div class="account">
              <h3>${page.name}</h3>
              <button class="connect-btn"
                data-page-id="${encodeURIComponent(page.id)}"
                data-page-name="${encodeURIComponent(page.name)}"
                data-page-token="${encodeURIComponent(page.access_token)}"
                data-page-permissions='${encodeURIComponent(JSON.stringify(page.tasks))}'
                data-user-account-id="${encodeURIComponent(page.id)}"
                data-user-id="${encodeURIComponent(page.id)}"
              >
                Connect This Page
              </button>
            </div>
          `
            )
            .join("")}

          <script>
            function connectPage(pageId, pageName, pageToken, pagePermissions, userAccountId, userId) {
              if (window.opener) {
                window.opener.postMessage({
                  type: 'FACEBOOK_PAGE_CONNECTED',
                  data: {
                    accessToken: pageToken,
                    accountName: pageName,
                    accountType: 'facebook',
                    pageId: pageId,
                    pagePermissions: pagePermissions,
                    userAccountId: userAccountId,
                    userId: userId
                  }
                }, '*');
                window.close();
              }
            }
            document.addEventListener('DOMContentLoaded', function() {
              document.querySelectorAll('.connect-btn').forEach(function(btn) {
                btn.addEventListener('click', function() {
                  connectPage(
                    decodeURIComponent(this.getAttribute('data-page-id')),
                    decodeURIComponent(this.getAttribute('data-page-name')),
                    decodeURIComponent(this.getAttribute('data-page-token')),
                    JSON.parse(decodeURIComponent(this.getAttribute('data-page-permissions'))),
                    decodeURIComponent(this.getAttribute('data-user-account-id')),
                    decodeURIComponent(this.getAttribute('data-user-id'))
                  );
                });
              });
            });
          </script>
        </body>
        </html>
      `;

    return new Response(html, {
      headers: { "Content-Type": "text/html" },
    });
  } catch (error) {
    return new Response(`Error: ${error}`, { status: 500 });
  }
});
