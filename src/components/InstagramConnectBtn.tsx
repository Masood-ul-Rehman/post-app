import { useState } from "react";
import { useSaveInstagramAccount } from "../hooks/useSaveInstagramAccount";
import { toast } from "sonner";
import { socialEnv } from "../lib/utils";

interface InstagramConnectBtnProps {
  userId: string;
  onConnected?: () => void;
}

export function InstagramConnectBtn({
  userId,
  onConnected,
}: InstagramConnectBtnProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const { saveInstagramAccount, isLoading, error } = useSaveInstagramAccount();

  const handleConnectInstagram = () => {
    setIsConnecting(true);
    let clientId = socialEnv.instagram.clientId;
    let redirectUri = socialEnv.instagram.redirectUri;
    if (!clientId || !redirectUri) {
      clientId = import.meta.env.VITE_INSTAGRAM_CLIENT_ID;
      redirectUri = import.meta.env.VITE_INSTAGRAM_REDIRECT_URI;
    }
    if (!clientId || !redirectUri) {
      toast.error("Instagram environment variables are not set.");
      setIsConnecting(false);
      return;
    }
    console.log("Instagram ENV:", { clientId, redirectUri });
    const state = Math.random().toString(36).substring(7);
    sessionStorage.setItem("instagram_oauth_state", state);
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope:
        "instagram_business_basic,instagram_business_manage_messages,instagram_business_manage_comments,instagram_business_content_publish,instagram_business_manage_insights",
      state: state,
    });
    const authUrl = `https://www.instagram.com/oauth/authorize?${params.toString()}`;
    const popup = window.open(
      authUrl,
      "instagram-auth",
      "width=600,height=600,scrollbars=yes,resizable=yes,menubar=no,toolbar=no,location=no,status=no"
    );

    const messageListener = async (event: MessageEvent) => {
      if (event.data.type === "INSTAGRAM_ACCOUNT_CONNECTED") {
        const savedState = sessionStorage.getItem("instagram_oauth_state");
        if (savedState !== event.data.state) {
          toast.error("Invalid OAuth state");
          return;
        }
        try {
          const data = { ...event.data.data };
          await saveInstagramAccount(data, userId);
          toast.success(`Connected ${data.accountName} successfully!`);
          popup?.close();
        } catch (error) {
          toast.error("Failed to save Instagram account connection");
          console.error(error);
        }
        setIsConnecting(false);
        window.removeEventListener("message", messageListener);
        sessionStorage.removeItem("instagram_oauth_state");
      }
    };
    window.addEventListener("message", messageListener);
    const checkClosed = setInterval(() => {
      if (popup?.closed) {
        setIsConnecting(false);
        window.removeEventListener("message", messageListener);
        sessionStorage.removeItem("instagram_oauth_state");
        clearInterval(checkClosed);
      }
    }, 1000);
  };

  return (
    <button
      onClick={handleConnectInstagram}
      disabled={isConnecting || isLoading}
      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isConnecting || isLoading ? (
        <>
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
          Connecting...
        </>
      ) : (
        "Connect Instagram"
      )}
    </button>
  );
}
