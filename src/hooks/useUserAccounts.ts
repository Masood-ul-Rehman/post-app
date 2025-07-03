import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { SocialAccount } from "../types/accounts";

export function useUserAccounts(userId: string) {
  const userAccounts = useQuery(api.userAccounts.queries.getUserAccounts, {
    userId,
  });

  const metaAccounts = useQuery(api.metaAccounts.queries.getByUserId, {
    userId,
  });

  const linkedinAccounts = useQuery(api.linkedinAccounts.queries.getByUserId, {
    userId,
  });

  const transformedMetaAccounts: SocialAccount[] = (metaAccounts ?? []).map(
    (account) => ({
      _id: account._id,
      platform: account.accountType as "facebook" | "instagram",
      accountId: account.pageId,
      accountName: account.accountName,
      isActive: true,
    })
  );

  const transformedLinkedinAccounts: SocialAccount[] = (
    linkedinAccounts ?? []
  ).map((account) => ({
    _id: account._id,
    platform: "linkedin",
    accountId: account.userAccountId,
    accountName: account.accountName,
    isActive: true,
  }));

  return {
    userAccounts: userAccounts ?? [],
    accounts: [...transformedMetaAccounts, ...transformedLinkedinAccounts],
    isLoading:
      userAccounts === undefined ||
      (userId &&
        (metaAccounts === undefined || linkedinAccounts === undefined)),
  };
}
