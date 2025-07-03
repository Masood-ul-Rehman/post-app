import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";
import { socialEnv } from "../lib/utils";

interface ThreadsConnectBtnProps {
  userId: string;
  onConnected?: () => void;
}

export function ThreadsConnectBtn({
  userId,
  onConnected,
}: ThreadsConnectBtnProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const addAccount = useMutation(api.metaAccounts.mutations.addAccount);

  const handleConnectThreads = () => {
    setIsConnecting(true);
    let clientId = socialEnv.threads.clientId;
    let redirectUri = socialEnv.threads.redirectUri;
    if (!clientId || !redirectUri) {
      clientId = import.meta.env.VITE_THREADS_CLIENT_ID;
      redirectUri = import.meta.env.VITE_THREADS_REDIRECT_URI;
    }
    if (!clientId || !redirectUri) {
      toast.error("Threads environment variables are not set.");
      setIsConnecting(false);
      return;
    }
    console.log("Threads ENV:", { clientId, redirectUri });
    const state = Math.random().toString(36).substring(7);
    sessionStorage.setItem("threads_oauth_state", state);
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: "threads_basic,threads_content_publish",
      response_type: "code",
      state: state,
    });
    const authUrl = `https://www.threads.com/oauth/authorize?${params.toString()}`;
    const popup = window.open(
      authUrl,
      "threads-auth",
      "width=600,height=600,scrollbars=yes,resizable=yes,menubar=no,toolbar=no,location=no,status=no"
    );
    const messageListener = async (event: MessageEvent) => {
      if (event.data.type === "THREADS_ACCOUNT_CONNECTED") {
        const savedState = sessionStorage.getItem("threads_oauth_state");
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
          toast.error("Failed to save Threads account connection");
          console.error(error);
        }
        setIsConnecting(false);
        window.removeEventListener("message", messageListener);
        sessionStorage.removeItem("threads_oauth_state");
      }
    };
    window.addEventListener("message", messageListener);
    const checkClosed = setInterval(() => {
      if (popup?.closed) {
        setIsConnecting(false);
        window.removeEventListener("message", messageListener);
        sessionStorage.removeItem("threads_oauth_state");
        clearInterval(checkClosed);
      }
    }, 1000);
  };

  return (
    <button
      onClick={handleConnectThreads}
      disabled={isConnecting}
      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-black hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isConnecting ? (
        <>
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
          Connecting...
        </>
      ) : (
        "Connect Threads"
      )}
    </button>
  );
}
