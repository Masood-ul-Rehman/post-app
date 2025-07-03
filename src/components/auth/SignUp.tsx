import { SignUp as ClerkSignUp } from "@clerk/clerk-react";
import { Navigate } from "react-router-dom";
import { useConvexAuth } from "convex/react";

export function SignUp() {
  const { isAuthenticated, isLoading } = useConvexAuth();

  // Show loading state while authentication is being determined
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-extrabold text-gray-900">
            Create your account
          </h2>
        </div>
        <ClerkSignUp
          signInUrl="/sign-in"
          forceRedirectUrl="/"
          routing="path"
          path="/sign-up"
          appearance={{
            elements: {
              rootBox: "w-full",
              card: "shadow-lg",
            },
          }}
        />
      </div>
    </div>
  );
}
