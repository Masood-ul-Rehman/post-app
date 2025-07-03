import { ConvexError } from "convex/values";
import { Webhook } from "svix";
import type { WebhookEvent } from "@clerk/backend";
import { httpRouter } from "convex/server";
import { httpAction } from "../../../_generated/server";
import { api } from "../../../_generated/api";

const CLERK_WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

export const clerkWebhookAction = httpAction(async (ctx, request: Request) => {
  console.log("Clerk Webhook received");

  if (!CLERK_WEBHOOK_SECRET) {
    console.error("CLERK_WEBHOOK_SECRET is not set");
    throw new ConvexError(
      "Error: Please add CLERK_WEBHOOK_SECRET from Clerk Dashboard to environment variables"
    );
  }

  const wh = new Webhook(CLERK_WEBHOOK_SECRET);

  const svix_id = request.headers.get("svix-id");
  const svix_timestamp = request.headers.get("svix-timestamp");
  const svix_signature = request.headers.get("svix-signature");

  if (!svix_id || !svix_timestamp || !svix_signature) {
    console.error("Missing Svix headers");
    return new Response("Error: Missing Svix headers", {
      status: 400,
    });
  }

  let payload;
  try {
    payload = await request.json();
  } catch (err) {
    console.error("Error parsing JSON payload:", err);
    return new Response("Error: Invalid JSON payload", {
      status: 400,
    });
  }

  const body = JSON.stringify(payload);

  let evt: WebhookEvent;

  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error("Webhook verification error:", err);
    return new Response("Error: Verification error", {
      status: 400,
    });
  }

  const eventType = evt.type;
  console.log("Processing event type:", eventType);

  if (eventType === "user.created") {
    try {
      const userData = payload.data;
      console.log("Creating user with data:", userData);

      // Ensure we have required data
      if (!userData.id) {
        console.error("Missing user ID");
        return new Response("Error: Missing user ID", { status: 400 });
      }

      const email =
        userData.email_addresses?.[0]?.email_address ||
        (userData.primary_email_address_id &&
          userData.email_addresses?.find(
            (e: { id: string; email_address: string }) =>
              e.id === userData.primary_email_address_id
          )?.email_address) ||
        "";

      const name =
        `${userData.first_name || ""} ${userData.last_name || ""}`.trim() ||
        userData.username ||
        email.split("@")[0] ||
        "Unknown User";

      console.log("Creating user with:", { name, email, userId: userData.id });

      // Create user first
      await ctx.runMutation(api.users.mutations.createUser, {
        name,
        email,
        userId: userData.id,
      });

      console.log("User created successfully");

      // Then create user account
      await ctx.runMutation(api.userAccounts.mutations.create, {
        userId: userData.id,
      });

      console.log("User account created successfully");
    } catch (error) {
      console.error("Error creating user:", error);
      return new Response(`Error creating user: ${error}`, { status: 500 });
    }
  } else if (eventType === "user.updated") {
    try {
      const userData = payload.data;
      console.log("Updating user with data:", userData);

      if (!userData.id) {
        console.error("Missing user ID for update");
        return new Response("Error: Missing user ID", { status: 400 });
      }

      const email =
        userData.email_addresses?.[0]?.email_address ||
        (userData.primary_email_address_id &&
          userData.email_addresses?.find(
            (e: { id: string; email_address: string }) =>
              e.id === userData.primary_email_address_id
          )?.email_address) ||
        "";

      const name =
        `${userData.first_name || ""} ${userData.last_name || ""}`.trim() ||
        userData.username ||
        email.split("@")[0] ||
        "Unknown User";

      // Update user if exists
      await ctx.runMutation(api.users.mutations.updateUser, {
        userId: userData.id,
        name,
        email,
      });

      console.log("User updated successfully");
    } catch (error) {
      console.error("Error updating user:", error);
      return new Response(`Error updating user: ${error}`, { status: 500 });
    }
  } else if (eventType === "user.deleted") {
    try {
      const userData = payload.data;
      console.log("Deleting user with data:", userData);

      if (!userData.id) {
        console.error("Missing user ID for deletion");
        return new Response("Error: Missing user ID", { status: 400 });
      }

      // Delete user and related data
      await ctx.runMutation(api.users.mutations.deleteUser, {
        userId: userData.id,
      });

      console.log("User deleted successfully");
    } catch (error) {
      console.error("Error deleting user:", error);
      return new Response(`Error deleting user: ${error}`, { status: 500 });
    }
  } else {
    console.log("Unhandled event type:", eventType);
  }

  return new Response("Webhook received", { status: 200 });
});

// Export for router
export default clerkWebhookAction;
