import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useCurrentUser } from '../hooks/useCurrentUser.js';
import { supabase } from '../lib/supabaseClient.js';
import { BookOpen, Mail, Lock, LogIn, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';

export const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isSignedIn, isLoading } = useCurrentUser();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // If already signed in, redirect to home page
  useEffect(() => {
    if (!isLoading && isSignedIn) {
      navigate('/', { replace: true });
    }
  }, [isSignedIn, isLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!email.trim() || !password) {
      setErrorMsg('Please fill in all fields.');
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        throw error;
      }

      // Success - navigation handled by useEffect subscription or manual redirect
    } catch (err: any) {
      console.error('Sign-in error:', err);
      setErrorMsg(err.message || 'Invalid email or password. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background-light dark:bg-background-dark py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Decorative Blurs */}
      <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-md w-full space-y-8 glass dark:glass-light bg-background-cardLight/85 dark:bg-background-cardDark/85 border border-background-borderLight dark:border-background-borderDark p-8 rounded-2xl shadow-2xl relative z-10">
        <div className="text-center">
          <div className="mx-auto w-12 h-12 flex items-center justify-center mb-4 hover:scale-105 transition-transform duration-200">
            <DotLottieReact
              src="/logo.lottie"
              autoplay
              loop
              style={{ width: '100%', height: '100%' }}
            />
          </div>
          <h2 className="font-heading font-black text-2xl text-[#2C2518] dark:text-[#EFECE6] tracking-tight">
            Welcome Back
          </h2>
          <p className="text-xs text-text-lightMuted dark:text-text-darkMuted mt-1.5 leading-relaxed">
            Access study materials, question papers, and placement notes.
          </p>
        </div>

        <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
          {errorMsg && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl text-xs flex items-start gap-2">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Email */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-text-light/95 dark:text-text-dark/95">College Email</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-text-lightMuted dark:text-text-darkMuted">
                <Mail size={16} />
              </span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full text-xs pl-10 pr-4 py-3 bg-background-light dark:bg-background-dark border border-background-borderLight dark:border-background-borderDark rounded-xl text-text-light dark:text-text-dark focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all duration-150"
                placeholder="rollnumber@mvgrce.edu.in"
              />
            </div>
          </div>

          {/* Password */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-text-light/95 dark:text-text-dark/95">Password</label>
              {/* Optional: Forgot password link */}
            </div>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-text-lightMuted dark:text-text-darkMuted">
                <Lock size={16} />
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full text-xs pl-10 pr-10 py-3 bg-background-light dark:bg-background-dark border border-background-borderLight dark:border-background-borderDark rounded-xl text-text-light dark:text-text-dark focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all duration-150"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-text-lightMuted dark:text-text-darkMuted hover:text-primary transition-colors"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full mt-2 font-heading font-semibold text-xs py-3 px-4 bg-primary hover:bg-primary-hover text-white rounded-xl transition duration-150 flex items-center justify-center gap-2 disabled:opacity-50 shadow-md shadow-primary/20 hover:scale-101"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4">
                  <DotLottieReact src="/logo.lottie" autoplay loop style={{ width: '100%', height: '100%' }} />
                </div>
                <span>Verifying...</span>
              </>
            ) : (
              <>
                <LogIn size={16} /> Sign In
              </>
            )}
          </button>
        </form>

        <div className="text-center mt-6 pt-4 border-t border-background-borderLight dark:border-background-borderDark">
          <p className="text-xs text-text-lightMuted dark:text-text-darkMuted">
            Don't have an account?{' '}
            <Link to="/register" className="text-primary font-bold hover:underline">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
