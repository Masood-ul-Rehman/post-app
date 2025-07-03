import {
  Authenticated,
  AuthLoading,
  Unauthenticated,
  useConvexAuth,
  useQuery,
} from "convex/react";
import { api } from "../convex/_generated/api";
import { Toaster } from "sonner";
import { SocialMediaDashboard } from "./components/SocialMediaDashboard";
import { UserButton } from "@clerk/clerk-react";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { SignIn } from "./components/auth/SignIn";
import { SignUp } from "./components/auth/SignUp";

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen flex flex-col bg-gray-50">
        <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm h-16 flex justify-between items-center border-b shadow-sm px-4">
          <h2 className="text-xl font-semibold text-primary">
            Social Media Manager
          </h2>
          <Authenticated>
            <UserButton afterSignOutUrl="/sign-in" />
          </Authenticated>
        </header>
        <main className="flex-1">
          <Routes>
            <Route
              path="/sign-in"
              element={
                <Unauthenticated>
                  <SignIn />
                </Unauthenticated>
              }
            />
            <Route
              path="/sign-up"
              element={
                <Unauthenticated>
                  <SignUp />
                </Unauthenticated>
              }
            />
            <Route
              path="/"
              element={
                <RequireAuth>
                  <Content />
                </RequireAuth>
              }
            />
          </Routes>
        </main>
        <Toaster />
      </div>
    </BrowserRouter>
  );
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useConvexAuth();

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/sign-in" replace />;
  }

  return <>{children}</>;
}

function Content() {
  const { isAuthenticated } = useConvexAuth();
  const loggedInUser = isAuthenticated;

  if (!loggedInUser) {
    return <Navigate to="/sign-in" replace />;
  }

  return <SocialMediaDashboard />;
}
