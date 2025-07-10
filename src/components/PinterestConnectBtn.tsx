import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";
import { socialEnv } from "../lib/utils";

interface PinterestConnectBtnProps {
    userId: string;
    onConnected?: () => void;
}

export function PinterestConnectBtn({
    userId,
    onConnected,
}: PinterestConnectBtnProps) {
    const [isConnecting, setIsConnecting] = useState(false);
    const addAccount = useMutation(api.pinterestAccounts.mutations.addAccount);

    const handleConnectPinterest = () => {
        setIsConnecting(true);
        const clientId = socialEnv.pinterest.clientId;
        const redirectUri = socialEnv.pinterest.redirectUri;
        if (!clientId || !redirectUri) {
            toast.error("Pinterest environment variables are not set.");
            setIsConnecting(false);
            return;
        }
        console.log("Pinterest ENV:", { clientId, redirectUri });
        const state = Math.random().toString(36).substring(7);
        sessionStorage.setItem("pinterest_oauth_state", state);
        const params = new URLSearchParams({
            client_id: clientId,
            redirect_uri: redirectUri,
            scope: "boards:read,pins:read,pins:write",
            response_type: "code",
            state: state,
        });
        const authUrl = `https://www.pinterest.com/oauth/?${params.toString()}`;
        const popup = window.open(
            authUrl,
            "pinterest-auth",
            "width=600,height=600,scrollbars=yes,resizable=yes,menubar=no,toolbar=no,location=no,status=no"
        );
        const messageListener = async (event: MessageEvent) => {
            if (event.data.type === "PINTEREST_ACCOUNT_CONNECTED") {
                const savedState = sessionStorage.getItem("pinterest_oauth_state");
                if (savedState !== event.data.state) {
                    toast.error("Invalid OAuth state");
                    return;
                }
                try {
                    const accountData = {
                        userId,
                        userAccountId: event.data.data.userAccountId,
                        accountName: event.data.data.accountName,
                        accountType: event.data.data.accountType,
                        accessToken: event.data.data.accessToken,
                        username: event.data.data.username,
                        refreshToken: event.data.data.refreshToken,
                        expiresIn: event.data.data.expiresIn,
                    };
                    await addAccount(accountData);
                    toast.success(`Connected ${accountData.accountName} successfully!`);
                    popup?.close();
                } catch (error) {
                    toast.error("Failed to save Pinterest account connection");
                    console.error(error);
                }
                setIsConnecting(false);
                window.removeEventListener("message", messageListener);
                sessionStorage.removeItem("pinterest_oauth_state");
            }
        };
        window.addEventListener("message", messageListener);
        const checkClosed = setInterval(() => {
            if (popup?.closed) {
                setIsConnecting(false);
                window.removeEventListener("message", messageListener);
                sessionStorage.removeItem("pinterest_oauth_state");
                clearInterval(checkClosed);
            }
        }, 1000);
    };

    return (
        <button
            onClick={handleConnectPinterest}
            disabled={isConnecting}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
            {isConnecting ? (
                <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Connecting...
                </>
            ) : (
                "Connect Pinterest"
            )}
        </button>
    );
} 