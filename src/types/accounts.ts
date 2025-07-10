import { Id } from "../../convex/_generated/dataModel";

export interface SocialAccount {
  _id: Id<"metaAccounts"> | Id<"linkedinAccounts">;
  platform: "facebook" | "instagram" | "linkedin" | "threads" | "pinterest" | "tiktok";
  accountId: string;
  accountName: string;
  isActive: boolean;
}
