import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";
import { socialEnv } from "../lib/utils";

interface LinkedInConnectBtnProps {
    userId: string;
    onConnected?: () => void;
}

export function LinkedInConnectBtn({
    userId,
    onConnected,
}: LinkedInConnectBtnProps) {
    const [isConnecting, setIsConnecting] = useState(false);
    const addLinkedInAccount = useMutation(
        api.linkedinAccounts.mutations.addAccount
    );

    const handleConnectLinkedIn = () => {
        setIsConnecting(true);

        // Generate a random state value for security
        const state = Math.random().toString(36).substring(7);

        // Store state in sessionStorage for validation when the popup returns
        sessionStorage.setItem("linkedin_oauth_state", state);

        let clientId = socialEnv.linkedin.clientId;
        let redirectUri = socialEnv.linkedin.redirectUri;
        if (!clientId || !redirectUri) {
            clientId = import.meta.env.VITE_LINKEDIN_CLIENT_ID;
            redirectUri = import.meta.env.VITE_LINKEDIN_REDIRECT_URI;
        }
        if (!clientId || !redirectUri) {
            toast.error("LinkedIn environment variables are not set.");
            setIsConnecting(false);
            return;
        }
        console.log("LinkedIn ENV:", { clientId, redirectUri });

        const params = new URLSearchParams({
            response_type: "code",
            client_id: clientId,
            redirect_uri: redirectUri,
            state: state,
            scope: "openid profile email w_member_social",
            prompt: "consent",
            nonce: Math.random().toString(36).substring(7),
        });

        const authUrl = `https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`;

        // Log the URL for debugging (remove in production)
        console.log("LinkedIn OAuth URL:", authUrl);

        // Open LinkedIn OAuth popup
        const popup = window.open(
            authUrl,
            "linkedin-auth",
            "width=600,height=600,scrollbars=yes,resizable=yes"
        );

        // Listen for messages from popup
        const messageListener = async (event: MessageEvent) => {
            if (event.data.type === "LINKEDIN_ACCOUNT_CONNECTED") {
                // Validate state to prevent CSRF attacks
                const savedState = sessionStorage.getItem(
                    "linkedin_oauth_state"
                );
                if (savedState !== event.data.state) {
                    toast.error("Invalid OAuth state");
                    return;
                }

                try {
                    const accountData = {
                        ...event.data.data,
                        userId,
                    };

                    await addLinkedInAccount(accountData);
                    toast.success(
                        `Connected ${accountData.accountName} successfully!`
                    );
                    popup?.close();
                } catch (error) {
                    toast.error("Failed to save LinkedIn account connection");
                    console.error(error);
                }
                setIsConnecting(false);
                window.removeEventListener("message", messageListener);
                sessionStorage.removeItem("linkedin_oauth_state");
            }
        };

        window.addEventListener("message", messageListener);

        // Handle popup closed without connection
        const checkClosed = setInterval(() => {
            if (popup?.closed) {
                setIsConnecting(false);
                window.removeEventListener("message", messageListener);
                sessionStorage.removeItem("linkedin_oauth_state");
                clearInterval(checkClosed);
            }
        }, 1000);
    };

    return (
        <button
            onClick={handleConnectLinkedIn}
            disabled={isConnecting}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed"
        >
            {isConnecting ? (
                <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Connecting...
                </>
            ) : (
                "Connect LinkedIn"
            )}
        </button>
    );
}
