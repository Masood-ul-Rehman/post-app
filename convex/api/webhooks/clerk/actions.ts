import { ConvexError } from "convex/values";
import { Webhook } from "svix";
import type { WebhookEvent } from "@clerk/backend";
import { httpRouter } from "convex/server";
import { httpAction } from "../../../_generated/server";
import { api } from "../../../_generated/api";

const CLERK_WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

export const clerkWebhookAction = httpAction(async (ctx, request: Request) => {
  console.log("clerk Webhook received");
  if (!CLERK_WEBHOOK_SECRET) {
    throw new ConvexError(
      "Error: Please add CLERK_WEBHOOK_SECRET from Clerk Dashboard to environment variables"
    );
  }

  const wh = new Webhook(CLERK_WEBHOOK_SECRET);

  const svix_id = request.headers.get("svix-id");
  const svix_timestamp = request.headers.get("svix-timestamp");
  const svix_signature = request.headers.get("svix-signature");

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response("Error: Missing Svix headers", {
      status: 400,
    });
  }

  const payload = await request.json();
  const body = JSON.stringify(payload);

  let evt: WebhookEvent;

  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    return new Response("Error: Verification error", {
      status: 400,
    });
  }

  const eventType = evt.type;
  if (eventType === "user.created") {
    try {
      await ctx.runMutation(api.users.mutations.createUser, {
        name: `${payload.data.first_name} ${payload.data.last_name}`.trim(),
        email: payload.data.email_addresses[0].email_address,
        userId: payload.data.id,
      });
      await ctx.runMutation(api.userAccounts.mutations.create, {
        userId: payload.data.id,
      });
    } catch (error) {
      return new Response("Error creating user", { status: 500 });
    }
  }

  return new Response("Webhook received", { status: 200 });
});
