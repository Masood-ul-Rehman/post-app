import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { clerkWebhookAction } from "./api/webhooks/clerk/actions";
import { facebookCallbackAction } from "./api/auth/accounts/facebook/actions";
import { linkedinCallbackAction } from "./api/auth/accounts/linkedin/actions";
import { threadsCallbackAction } from "./api/auth/accounts/threads/actions";
import { pinterestCallbackAction } from "./api/auth/accounts/pinterest/actions";
import {
  tiktokCallbackAction,
  tiktokWebhookVerificationAction,
} from "./api/auth/accounts/tiktok/actions";
import {
  instagramCallbackAction,
  // instagramOAuthAction,
} from "./api/auth/accounts/instagram/actions";

const http = httpRouter();

http.route({
  path: "/api/webhooks/clerk",
  method: "POST",
  handler: clerkWebhookAction,
});

http.route({
  path: "/auth/facebook/callback",
  method: "GET",
  handler: facebookCallbackAction,
});

http.route({
  path: "/auth/instagram/callback",
  method: "GET",
  handler: instagramCallbackAction,
});

// TikTok OAuth callback endpoint
http.route({
  path: "/auth/tiktok/callback",
  method: "GET",
  handler: tiktokCallbackAction,
});

// TikTok webhook verification endpoint
http.route({
  path: "/auth/tiktok/callback",
  method: "POST",
  handler: tiktokWebhookVerificationAction,
});

http.route({
  path: "/auth/linkedin/callback",
  method: "GET",
  handler: linkedinCallbackAction,
});

http.route({
  path: "/auth/threads/callback",
  method: "GET",
  handler: threadsCallbackAction,
});

http.route({
  path: "/auth/pinterest/callback",
  method: "GET",
  handler: pinterestCallbackAction,
});

export default http;
