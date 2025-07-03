import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";
import { socialEnv } from "../lib/utils";

interface TikTokConnectBtnProps {
  userId: string;
  onConnected?: () => void;
}

export function TikTokConnectBtn({
  userId,
  onConnected,
}: TikTokConnectBtnProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const addAccount = useMutation(api.metaAccounts.mutations.addAccount);

  const handleConnectTikTok = () => {
    setIsConnecting(true);
    let clientKey = socialEnv.tiktok.clientKey;
    let redirectUri = socialEnv.tiktok.redirectUri;
    if (!clientKey || !redirectUri) {
      clientKey = import.meta.env.VITE_TIKTOK_CLIENT_KEY;
      redirectUri = import.meta.env.VITE_TIKTOK_REDIRECT_URI;
    }
    if (!clientKey || !redirectUri) {
      toast.error("TikTok environment variables are not set.");
      setIsConnecting(false);
      return;
    }
    console.log("TikTok ENV:", { clientKey, redirectUri });
    const state = Math.random().toString(36).substring(7);
    sessionStorage.setItem("tiktok_oauth_state", state);
    const params = new URLSearchParams({
      client_key: clientKey,
      redirect_uri: redirectUri,
      scope: "user.info.basic,video.list,video.upload",
      response_type: "code",
      state: state,
    });
    const authUrl = `https://www.tiktok.com/v2/auth/authorize/?${params.toString()}`;
    const popup = window.open(
      authUrl,
      "tiktok-auth",
      "width=600,height=600,scrollbars=yes,resizable=yes,menubar=no,toolbar=no,location=no,status=no"
    );
    const messageListener = async (event: MessageEvent) => {
      if (event.data.type === "TIKTOK_ACCOUNT_CONNECTED") {
        const savedState = sessionStorage.getItem("tiktok_oauth_state");
        if (savedState !== event.data.state) {
          toast.error("Invalid OAuth state");
          return;
        }
        try {
          const accountData = {
            ...event.data.data,
            userId,
          };
          await addAccount(accountData);
          toast.success(`Connected ${accountData.accountName} successfully!`);
          popup?.close();
        } catch (error) {
          toast.error("Failed to save TikTok account connection");
          console.error(error);
        }
        setIsConnecting(false);
        window.removeEventListener("message", messageListener);
        sessionStorage.removeItem("tiktok_oauth_state");
      }
    };
    window.addEventListener("message", messageListener);
    const checkClosed = setInterval(() => {
      if (popup?.closed) {
        setIsConnecting(false);
        window.removeEventListener("message", messageListener);
        sessionStorage.removeItem("tiktok_oauth_state");
        clearInterval(checkClosed);
      }
    }, 1000);
  };

  return (
    <button
      onClick={handleConnectTikTok}
      disabled={isConnecting}
      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-black hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isConnecting ? (
        <>
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
          Connecting...
        </>
      ) : (
        "Connect TikTok"
      )}
    </button>
  );
}
