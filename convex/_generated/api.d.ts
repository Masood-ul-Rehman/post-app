/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as api_auth_accounts_facebook_actions from "../api/auth/accounts/facebook/actions.js";
import type * as api_auth_accounts_instagram_actions from "../api/auth/accounts/instagram/actions.js";
import type * as api_auth_accounts_linkedin_actions from "../api/auth/accounts/linkedin/actions.js";
import type * as api_auth_accounts_threads_actions from "../api/auth/accounts/threads/actions.js";
import type * as api_auth_accounts_tiktok_actions from "../api/auth/accounts/tiktok/actions.js";
import type * as api_webhooks_clerk_actions from "../api/webhooks/clerk/actions.js";
import type * as http from "../http.js";
import type * as linkedinAccounts_mutations from "../linkedinAccounts/mutations.js";
import type * as linkedinAccounts_queries from "../linkedinAccounts/queries.js";
import type * as metaAccounts_mutations from "../metaAccounts/mutations.js";
import type * as metaAccounts_queries from "../metaAccounts/queries.js";
import type * as posts_queries from "../posts/queries.js";
import type * as tiktokAccounts_mutations from "../tiktokAccounts/mutations.js";
import type * as tiktokAccounts_queries from "../tiktokAccounts/queries.js";
import type * as userAccounts_mutations from "../userAccounts/mutations.js";
import type * as userAccounts_queries from "../userAccounts/queries.js";
import type * as users_mutations from "../users/mutations.js";
import type * as users_queries from "../users/queries.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  "api/auth/accounts/facebook/actions": typeof api_auth_accounts_facebook_actions;
  "api/auth/accounts/instagram/actions": typeof api_auth_accounts_instagram_actions;
  "api/auth/accounts/linkedin/actions": typeof api_auth_accounts_linkedin_actions;
  "api/auth/accounts/threads/actions": typeof api_auth_accounts_threads_actions;
  "api/auth/accounts/tiktok/actions": typeof api_auth_accounts_tiktok_actions;
  "api/webhooks/clerk/actions": typeof api_webhooks_clerk_actions;
  http: typeof http;
  "linkedinAccounts/mutations": typeof linkedinAccounts_mutations;
  "linkedinAccounts/queries": typeof linkedinAccounts_queries;
  "metaAccounts/mutations": typeof metaAccounts_mutations;
  "metaAccounts/queries": typeof metaAccounts_queries;
  "posts/queries": typeof posts_queries;
  "tiktokAccounts/mutations": typeof tiktokAccounts_mutations;
  "tiktokAccounts/queries": typeof tiktokAccounts_queries;
  "userAccounts/mutations": typeof userAccounts_mutations;
  "userAccounts/queries": typeof userAccounts_queries;
  "users/mutations": typeof users_mutations;
  "users/queries": typeof users_queries;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
