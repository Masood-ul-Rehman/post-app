import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";
import { socialEnv } from "../lib/utils";

interface FacebookConnectBtnProps {
  userId: string;
  onConnected?: () => void;
}

export function FacebookConnectBtn({
  userId,
  onConnected,
}: FacebookConnectBtnProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const addAccount = useMutation(api.metaAccounts.mutations.addAccount);

  const handleConnectFacebook = () => {
    setIsConnecting(true);
    let clientId =
      socialEnv.facebook.clientId || import.meta.env.VITE_FACEBOOK_CLIENT_ID;
    let redirectUri =
      socialEnv.facebook.redirectUri ||
      import.meta.env.VITE_FACEBOOK_REDIRECT_URI;
    if (!clientId || !redirectUri) {
      toast.error("Facebook client ID or redirect URI is missing.");
      setIsConnecting(false);
      return;
    }
    // Open Facebook OAuth popup
    const popup = window.open(
      `https://www.facebook.com/v18.0/dialog/oauth?` +
        `client_id=${clientId}&` +
        `redirect_uri=${redirectUri}&` +
        `scope=pages_manage_posts,pages_read_engagement,instagram_basic,instagram_content_publish&` +
        `response_type=code&` +
        `state=${Math.random().toString(36).substring(7)}`,
      "facebook-auth",
      "width=600,height=600,scrollbars=yes,resizable=yes"
    );

    // Listen for messages from popup
    const messageListener = async (event: MessageEvent) => {
      if (event.data.type === "FACEBOOK_PAGE_CONNECTED") {
        try {
          const data = { ...event.data.data };
          // Parse pagePermissions if it's a string
          if (typeof data.pagePermissions === "string") {
            try {
              data.pagePermissions = JSON.parse(data.pagePermissions);
            } catch (e) {
              data.pagePermissions = [];
            }
          }
          // Ensure all required fields are present
          if (!data.accountType) data.accountType = "facebook";
          data.userId = userId;
          await addAccount(data);
          toast.success(`Connected ${data.accountName} successfully!`);
          popup?.close();
        } catch (error) {
          toast.error("Failed to save account connection");
          console.error(error);
        }
        setIsConnecting(false);
        window.removeEventListener("message", messageListener);
      }
    };

    window.addEventListener("message", messageListener);

    // Handle popup closed without connection
    const checkClosed = setInterval(() => {
      if (popup?.closed) {
        setIsConnecting(false);
        window.removeEventListener("message", messageListener);
        clearInterval(checkClosed);
      }
    }, 1000);
  };

  return (
    <button
      onClick={handleConnectFacebook}
      disabled={isConnecting}
      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isConnecting ? (
        <>
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
          Connecting...
        </>
      ) : (
        "Connect Facebook"
      )}
    </button>
  );
}
