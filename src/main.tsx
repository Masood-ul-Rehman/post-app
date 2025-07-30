import { createRoot } from "react-dom/client";
import { ConvexReactClient } from "convex/react";
import "./index.css";
import App from "./App";
import { ClerkProvider, useAuth } from "@clerk/clerk-react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { StrictMode } from "react";
import { UploadToast } from "./components/UploadToast";

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ClerkProvider publishableKey={import.meta.env.VITE_CLERK_PUBLISHABLE_KEY}>
      <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
        <App />
        <UploadToast />
      </ConvexProviderWithClerk>
    </ClerkProvider>
  </StrictMode>
);
