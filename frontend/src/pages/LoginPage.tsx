import React, { useState } from 'react';
import { AuthLayout } from '../components/auth/AuthLayout';
import { AuthInput } from '../components/auth/AuthInput';
import { SocialAuth } from '../components/auth/SocialAuth';
import { ArrowUpRightIcon } from '../components/home/v2/IconsV2';
import { useAuth } from '../context/AuthContext';
import { LOGIN_AUTH_VISUAL } from '../constants/authVisuals';

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
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { error: authError } = await signInWithPassword(email.trim(), password);
      if (authError) {
        setError(authError.message || 'That email and password did not match.');
      } else {
        onSuccess();
      }
    } catch (err: any) {
      setError(err?.message || 'Something went wrong signing you in.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      eyebrow="Sign in"
      title="Pick up"
      titleAccent="where you left off."
      subtitle="Your saved trips, transcripts and 3D graphs come back exactly as you left them."
      onNavigateHome={onNavigateHome}
      visual={LOGIN_AUTH_VISUAL}
    >
      {error && (
        <div className="tv-alert" role="alert">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="tv-auth__form">
        <AuthInput
          label="Email"
          type="email"
          name="email"
          autoComplete="email"
          required
          placeholder="you@example.com"
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

        <button type="submit" className="tv-btn tv-btn--primary" disabled={loading} style={{ width: '100%' }}>
          <span>{loading ? 'Signing in…' : 'Sign in'}</span>
          {!loading && <ArrowUpRightIcon width={15} height={15} />}
        </button>
      </form>

      <div className="tv-divider">
        <span className="tv-label">or</span>
      </div>

      <SocialAuth onError={setError} />

      <p className="tv-auth__alt">
        No account yet?{' '}
        <button type="button" onClick={onNavigateSignup}>
          Create one
        </button>
      </p>
    </AuthLayout>
  );
};
