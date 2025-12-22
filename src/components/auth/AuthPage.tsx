import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordStrength } from "./PasswordStrength";
import { OTPInput } from "./OTPInput";
import { toast } from "sonner";
import {
  Zap,
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  ArrowLeft,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { clearSignupSuccess } from "@/store/slices/authSlice";
import { useLoginMutation, useSignupMutation, useConfirmSignupMutation, useForgotPasswordMutation, useResetPasswordMutation } from "@/store/api";

type AuthView =
  | "login"
  | "signup"
  | "forgot"
  | "otp"
  | "reset"
  | "success";

interface AuthPageProps {
  onLogin: () => void;
  initialView?: "login" | "signup";
}

export const AuthPage = ({ onLogin, initialView = "login" }: AuthPageProps) => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { isAuthenticated, signupSuccess } = useAppSelector((state) => state.auth);
  const [login, { isLoading: loginLoading, error: loginError }] = useLoginMutation();
  const [signup, { isLoading: signupLoading, error: signupError }] = useSignupMutation();
  const [confirmSignup, { isLoading: confirmLoading, error: confirmError }] = useConfirmSignupMutation();
  const [forgotPassword, { isLoading: forgotLoading, error: forgotError }] = useForgotPasswordMutation();
  const [resetPassword, { isLoading: resetLoading, error: resetError }] = useResetPasswordMutation();
  
  const loading = loginLoading || signupLoading || confirmLoading || forgotLoading || resetLoading;
  const error = loginError || signupError || confirmError || forgotError || resetError;
  
  const [view, setView] = useState<AuthView>(initialView);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Handle authentication success
  useEffect(() => {
    if (isAuthenticated) {
      toast.success("Welcome back!");
      onLogin();
    }
  }, [isAuthenticated, onLogin]);

  // Handle signup success
  useEffect(() => {
    if (signupSuccess) {
      toast.success("Verification code sent to your email");
      setView("otp");
      dispatch(clearSignupSuccess());
    }
  }, [signupSuccess, dispatch]);

  // Handle errors
  useEffect(() => {
    if (error) {
      const errorData = (error as any)?.data;
      const errorCode = errorData?.code || errorData?.error;
      const errorMessage = errorData?.message || (error as any)?.message || 'An error occurred';
      
      // Check if user's email is not verified
      if (errorCode === 'EMAIL_NOT_VERIFIED') {
        toast.error(errorMessage);
        setView("otp"); // Redirect to OTP verification page
        return;
      }
      
      toast.error(errorMessage);
    }
  }, [error]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please fill in all fields");
      return;
    }
    try {
      await login({ email, password }).unwrap();
    } catch (err: any) {
      // Check if email is not verified
      const errorCode = err?.data?.code || err?.data?.error;
      if (errorCode === 'EMAIL_NOT_VERIFIED') {
        setView("otp");
      }
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password || !confirmPassword) {
      toast.error("Please fill in all fields");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    try {
      const response = await signup({ name, email, password }).unwrap();
      // Check if this was a resend scenario (user already exists but unverified)
      if ((response as any)?.resent) {
        toast.success((response as any)?.message || "Verification code resent to your email");
        setView("otp");
      }
    } catch (err: any) {
      // Error is handled by useEffect
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error("Please enter your email");
      return;
    }
    try {
      await forgotPassword({ email }).unwrap();
      toast.success("Reset code sent to your email");
      setView("reset");
    } catch (error) {
      // Error toast is handled by useEffect
    }
  };

  const handleOTPComplete = async (otp: string) => {
    setOtpCode(otp);
    try {
      await confirmSignup({ email, code: otp }).unwrap();
      toast.success("Email verified successfully!");
      // Auto-login after verification
      await login({ email, password }).unwrap();
    } catch (error) {
      // Error toast is handled by useEffect
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || !confirmPassword) {
      toast.error("Please fill in all fields");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    if (!otpCode) {
      toast.error("Please enter the reset code from your email");
      return;
    }
    try {
      await resetPassword({ email, code: otpCode, newPassword: password }).unwrap();
      setView("success");
    } catch (error) {
      // Error toast is handled by useEffect
    }
  };

  const resetForm = () => {
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setName("");
    setOtpCode("");
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-background to-accent/20" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent" />
        
        {/* Animated grid */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute inset-0" style={{
            backgroundImage: `linear-gradient(hsl(var(--primary) / 0.1) 1px, transparent 1px),
                             linear-gradient(90deg, hsl(var(--primary) / 0.1) 1px, transparent 1px)`,
            backgroundSize: '60px 60px'
          }} />
        </div>

        <div className="relative z-10 flex flex-col justify-center px-12 xl:px-20">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow">
              <Zap className="w-7 h-7 text-primary-foreground" />
            </div>
            <span className="text-2xl font-bold text-foreground">TradeFlow</span>
          </div>
          
          <h1 className="text-4xl xl:text-5xl font-bold text-foreground mb-6 leading-tight">
            Master Your
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">
              Trading Journey
            </span>
          </h1>
          
          <p className="text-lg text-muted-foreground mb-8 max-w-md">
            Track, analyze, and improve your trading performance with our professional journaling platform.
          </p>

          <div className="space-y-4">
            {[
              "Detailed trade analytics & insights",
              "Performance tracking & goal setting",
              "Calendar view with P&L visualization",
            ].map((feature, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                </div>
                <span className="text-muted-foreground">{feature}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Decorative elements */}
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-gradient-to-tl from-primary/20 to-transparent rounded-full blur-3xl" />
        <div className="absolute top-20 right-20 w-64 h-64 bg-gradient-to-bl from-accent/20 to-transparent rounded-full blur-3xl" />
      </div>

      {/* Right Panel - Auth Forms */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow">
              <Zap className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-foreground">TradeFlow</span>
          </div>

          {/* Login View */}
          {view === "login" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="text-center lg:text-left">
                <h2 className="text-2xl font-bold text-foreground mb-2">Welcome back</h2>
                <p className="text-muted-foreground">Sign in to continue your trading journey</p>
              </div>

              <form onSubmit={handleLogin} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-foreground">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-11 h-12 bg-card border-border"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="password" className="text-foreground">Password</Label>
                    <button
                      type="button"
                      onClick={() => { resetForm(); setView("forgot"); }}
                      className="text-sm text-primary hover:text-primary/80 transition-colors"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-11 pr-11 h-12 bg-card border-border"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 text-base font-semibold"
                  disabled={loading}
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                      Signing in...
                    </div>
                  ) : (
                    "Sign In"
                  )}
                </Button>
              </form>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-background text-muted-foreground">or</span>
                </div>
              </div>

              <p className="text-center text-muted-foreground">
                Don't have an account?{" "}
                <Link
                  to="/signup"
                  className="text-primary hover:text-primary/80 font-semibold transition-colors"
                >
                  Create one
                </Link>
              </p>
            </div>
          )}

          {/* Signup View */}
          {view === "signup" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="text-center lg:text-left">
                <h2 className="text-2xl font-bold text-foreground mb-2">Create account</h2>
                <p className="text-muted-foreground">Start your professional trading journey</p>
              </div>

              <form onSubmit={handleSignup} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-foreground">Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="name"
                      type="text"
                      placeholder="John Doe"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="pl-11 h-12 bg-card border-border"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-email" className="text-foreground">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-11 h-12 bg-card border-border"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-password" className="text-foreground">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="signup-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-11 pr-11 h-12 bg-card border-border"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  <PasswordStrength password={password} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm-password" className="text-foreground">Confirm Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="confirm-password"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className={cn(
                        "pl-11 pr-11 h-12 bg-card border-border",
                        confirmPassword && password !== confirmPassword && "border-red-500 focus-visible:ring-red-500"
                      )}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {confirmPassword && password !== confirmPassword && (
                    <p className="text-xs text-red-500">Passwords do not match</p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 text-base font-semibold"
                  disabled={loading}
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                      Creating account...
                    </div>
                  ) : (
                    "Create Account"
                  )}
                </Button>
              </form>

              <p className="text-center text-muted-foreground">
                Already have an account?{" "}
                <Link
                  to="/login"
                  className="text-primary hover:text-primary/80 font-semibold transition-colors"
                >
                  Sign in
                </Link>
              </p>
            </div>
          )}

          {/* Forgot Password View */}
          {view === "forgot" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <button
                onClick={() => { resetForm(); setView("login"); }}
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to login
              </button>

              <div className="text-center lg:text-left">
                <h2 className="text-2xl font-bold text-foreground mb-2">Forgot password?</h2>
                <p className="text-muted-foreground">No worries, we'll send you reset instructions</p>
              </div>

              <form onSubmit={handleForgotPassword} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="reset-email" className="text-foreground">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="reset-email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-11 h-12 bg-card border-border"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 text-base font-semibold"
                  disabled={loading}
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                      Sending...
                    </div>
                  ) : (
                    "Send Reset Code"
                  )}
                </Button>
              </form>
            </div>
          )}

          {/* OTP Verification View */}
          {view === "otp" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <button
                onClick={() => setView("signup")}
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>

              <div className="text-center">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
                  <Mail className="w-8 h-8 text-primary" />
                </div>
                <h2 className="text-2xl font-bold text-foreground mb-2">Check your email</h2>
                <p className="text-muted-foreground">
                  We sent a verification code to
                  <br />
                  <span className="text-foreground font-medium">{email || "your email"}</span>
                </p>
              </div>

              <div className="py-4">
                <OTPInput onComplete={handleOTPComplete} />
              </div>

              <p className="text-center text-sm text-muted-foreground">
                Didn't receive the code?{" "}
                <button
                  onClick={() => toast.success("Code resent!")}
                  className="text-primary hover:text-primary/80 font-semibold transition-colors"
                >
                  Resend
                </button>
              </p>

              {loading && (
                <div className="flex justify-center">
                  <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                </div>
              )}
            </div>
          )}

          {/* Reset Password View */}
          {view === "reset" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <button
                onClick={() => { resetForm(); setView("forgot"); }}
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>

              <div className="text-center">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
                  <Mail className="w-8 h-8 text-primary" />
                </div>
                <h2 className="text-2xl font-bold text-foreground mb-2">Enter reset code</h2>
                <p className="text-muted-foreground">
                  We sent a code to
                  <br />
                  <span className="text-foreground font-medium">{email || "your email"}</span>
                </p>
              </div>

              <div className="py-4">
                <OTPInput onComplete={(otp) => setOtpCode(otp)} />
              </div>

              <div className="text-center lg:text-left">
                <h3 className="text-lg font-bold text-foreground mb-2">Set new password</h3>
                <p className="text-muted-foreground text-sm">Your new password must be different from previous passwords</p>
              </div>

              <form onSubmit={handleResetPassword} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="new-password" className="text-foreground">New Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="new-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-11 pr-11 h-12 bg-card border-border"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  <PasswordStrength password={password} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm-new-password" className="text-foreground">Confirm Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="confirm-new-password"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="pl-11 pr-11 h-12 bg-card border-border"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 text-base font-semibold"
                  disabled={loading || !otpCode}
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                      Resetting...
                    </div>
                  ) : (
                    "Reset Password"
                  )}
                </Button>
              </form>

              <p className="text-center text-sm text-muted-foreground">
                Didn't receive the code?{" "}
                <button
                  onClick={() => handleForgotPassword(new Event('submit') as any)}
                  className="text-primary hover:text-primary/80 font-semibold transition-colors"
                >
                  Resend
                </button>
              </p>
            </div>
          )}

          {/* Success View */}
          {view === "success" && (
            <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300 text-center">
              <div className="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-10 h-10 text-emerald-500" />
              </div>
              
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-2">Password reset successful!</h2>
                <p className="text-muted-foreground">Your password has been updated successfully</p>
              </div>

              <Button
                onClick={() => { resetForm(); setView("login"); }}
                className="w-full h-12 text-base font-semibold"
              >
                Back to Login
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
