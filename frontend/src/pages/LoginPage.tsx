import React, { useState } from "react";
import { AuthLayout } from "../components/auth/AuthLayout";
import { AuthInput } from "../components/auth/AuthInput";
import { useAuth } from "../context/AuthContext";
import { LOGIN_AUTH_VISUAL } from "../constants/authVisuals";

interface LoginPageProps {
  onNavigateSignup: () => void;
  onNavigateHome: () => void;
  onSuccess: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  onNavigateSignup,
  onNavigateHome,
  onSuccess,
}) => {
  const { signInWithPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { error: authError } = await signInWithPassword(
        email.trim(),
        password,
      );
      if (authError) {
        setError(authError.message || "Invalid email or password.");
      } else {
        onSuccess();
      }
    } catch (err: any) {
      setError(err?.message || "An unexpected error occurred during login.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="WELCOME BACK"
      subtitle="Enter your credentials to access your saved journeys and live trip canvases."
      onNavigateHome={onNavigateHome}
      visual={LOGIN_AUTH_VISUAL}
    >
      {error && (
        <div
          className="mb-6 p-4 bg-red-50 border-l-4 border-red-600 text-red-700 text-xs font-semibold rounded-none"
          role="alert"
        >
          {error}
        </div>
      )}

      {/* Login Form */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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
          label="Password"
          type="password"
          name="password"
          autoComplete="current-password"
          required
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full mt-2 py-3.5 px-6 bg-[#1F1E1E] text-white hover:bg-black font-extrabold text-xs uppercase tracking-widest rounded-none transition-colors duration-150 disabled:opacity-60 cursor-pointer shadow-none"
        >
          {loading ? "AUTHENTICATING..." : "LOG IN TO TRIPVERSE"}
        </button>
      </form>

      {/* Switch to Signup */}
      <div className="mt-8 text-center text-xs font-medium text-[#1F1E1E]">
        Don't have an account?{" "}
        <button
          type="button"
          onClick={onNavigateSignup}
          className="font-extrabold uppercase tracking-wider hover:text-black ml-1 cursor-pointer"
        >
          Sign up now
        </button>
      </div>
    </AuthLayout>
  );
};
