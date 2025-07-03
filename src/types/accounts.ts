import { Id } from "../../convex/_generated/dataModel";

export interface SocialAccount {
  _id: Id<"metaAccounts"> | Id<"linkedinAccounts">;
  platform: "facebook" | "instagram" | "linkedin";
  accountId: string;
  accountName: string;
  isActive: boolean;
}
