import React, { useState } from "react";
import { AuthLayout } from "../components/auth/AuthLayout";
import { AuthInput } from "../components/auth/AuthInput";
import { useAuth } from "../context/AuthContext";
import { SIGNUP_AUTH_VISUAL } from "../constants/authVisuals";

interface SignupPageProps {
  onNavigateLogin: () => void;
  onNavigateHome: () => void;
  onSuccess: () => void;
}

export const SignupPage: React.FC<SignupPageProps> = ({
  onNavigateLogin,
  onNavigateHome,
  onSuccess,
}) => {
  const { signUp } = useAuth();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    setLoading(true);

    try {
      const { error: authError } = await signUp(
        email.trim(),
        password,
        fullName.trim(),
      );
      if (authError) {
        setError(authError.message || "Failed to create account.");
      } else {
        onSuccess();
      }
    } catch (err: any) {
      setError(
        err?.message || "An unexpected error occurred during registration.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="START YOUR PERFECT TRIP"
      subtitle="Create your TripVerse account to build AI-guided voyages, interactive maps, and 3D spatial graphs."
      onNavigateHome={onNavigateHome}
      visual={SIGNUP_AUTH_VISUAL}
    >
      {error && (
        <div
          className="mb-6 p-4 bg-red-50 border-l-4 border-red-600 text-red-700 text-xs font-semibold rounded-none"
          role="alert"
        >
          {error}
        </div>
      )}

      {/* Signup Form */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <AuthInput
          label="Full Name"
          type="text"
          name="name"
          autoComplete="name"
          required
          placeholder="Alex Mercer"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
        />

        <AuthInput
          label="Email Address"
          type="email"
          name="email"
          autoComplete="email"
          required
          placeholder="traveler@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <AuthInput
          label="Create Password"
          type="password"
          name="password"
          autoComplete="new-password"
          required
          placeholder="Minimum 6 characters"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full mt-2 py-3.5 px-6 bg-[#1F1E1E] text-white hover:bg-black font-extrabold text-xs uppercase tracking-widest rounded-none transition-colors duration-150 disabled:opacity-60 cursor-pointer shadow-none"
        >
          {loading ? "CREATING ACCOUNT..." : "START PLANNING"}
        </button>
      </form>

      {/* Switch to Login */}
      <div className="mt-8 text-center text-xs font-medium text-[#1F1E1E]">
        Already have an account?{" "}
        <button
          type="button"
          onClick={onNavigateLogin}
          className="font-extrabold uppercase tracking-wider hover:text-black ml-1 cursor-pointer"
        >
          Log in
        </button>
      </div>
    </AuthLayout>
  );
};
