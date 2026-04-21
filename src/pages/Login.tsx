import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Loader2, UtensilsCrossed } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { toast } from "@/hooks/use-toast";
import { requestOtp, verifyOtp, useAuth } from "@/contexts/AuthContext";
import { extractApiError } from "@/lib/api";

type Step = "email" | "otp";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, loginWithTokens } = useAuth();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [resendIn, setResendIn] = useState(0);

  const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? "/dashboard";

  useEffect(() => {
    if (isAuthenticated) navigate(from, { replace: true });
  }, [isAuthenticated, from, navigate]);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setInterval(() => setResendIn((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [resendIn]);

  const requestMutation = useMutation({
    mutationFn: (e: string) => requestOtp(e),
    onSuccess: () => {
      setStep("otp");
      setResendIn(45);
      toast({ title: "OTP sent", description: `We emailed a code to ${email}.` });
    },
    onError: (err) => toast({ title: "Couldn't send code", description: extractApiError(err), variant: "destructive" }),
  });

  const verifyMutation = useMutation({
    mutationFn: () => verifyOtp(email, otp),
    onSuccess: (data) => {
      if (!data.user_exists || data.requires_registration || !data.tokens || !data.user) {
        toast({
          title: "No account found",
          description: "Please contact your restaurant administrator to get an account.",
          variant: "destructive",
        });
        return;
      }
      loginWithTokens(data.user, data.tokens.access, data.tokens.refresh);
      toast({ title: "Welcome back", description: data.user.email });
      navigate(from, { replace: true });
    },
    onError: (err) => toast({ title: "Verification failed", description: extractApiError(err), variant: "destructive" }),
  });

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    requestMutation.mutate(email);
  };

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length < 6) return;
    verifyMutation.mutate();
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      {/* Left brand panel */}
      <div className="hidden lg:flex relative overflow-hidden bg-gradient-to-br from-primary to-primary/70 p-12 text-primary-foreground">
        <div className="absolute inset-0 opacity-10 [background-image:radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] [background-size:24px_24px]" />
        <div className="relative z-10 flex flex-col justify-between w-full">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center">
              <UtensilsCrossed className="h-5 w-5" />
            </div>
            <span className="text-lg font-semibold tracking-tight">Fudz Admin</span>
          </div>
          <div className="space-y-4 max-w-md">
            <h1 className="text-4xl font-semibold leading-tight">Run your restaurant, not your spreadsheets.</h1>
            <p className="text-primary-foreground/80 text-base">
              Orders, menu, deliveries and staff — all in one elegant dashboard.
            </p>
          </div>
          <p className="text-sm text-primary-foreground/70">© {new Date().getFullYear()} Fudz</p>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-sm space-y-8">
          <div className="lg:hidden flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg bg-primary text-primary-foreground flex items-center justify-center">
              <UtensilsCrossed className="h-4 w-4" />
            </div>
            <span className="font-semibold">Fudz Admin</span>
          </div>

          {step === "email" ? (
            <>
              <div className="space-y-2">
                <h2 className="text-2xl font-semibold tracking-tight">Sign in</h2>
                <p className="text-sm text-muted-foreground">
                  Enter your work email and we'll send you a one-time code.
                </p>
              </div>
              <form onSubmit={handleEmailSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email address</Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    autoFocus
                    placeholder="you@restaurant.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full h-11" disabled={requestMutation.isPending}>
                  {requestMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      Continue <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </form>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => {
                    setStep("email");
                    setOtp("");
                  }}
                  className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> Back
                </button>
                <h2 className="text-2xl font-semibold tracking-tight">Enter verification code</h2>
                <p className="text-sm text-muted-foreground">
                  We sent a 6-digit code to <span className="text-foreground font-medium">{email}</span>.
                </p>
              </div>
              <form onSubmit={handleVerify} className="space-y-6">
                <div className="flex justify-center">
                  <InputOTP maxLength={6} value={otp} onChange={setOtp} autoFocus>
                    <InputOTPGroup>
                      {[0, 1, 2, 3, 4, 5].map((i) => (
                        <InputOTPSlot key={i} index={i} className="h-12 w-11 text-base" />
                      ))}
                    </InputOTPGroup>
                  </InputOTP>
                </div>
                <Button type="submit" className="w-full h-11" disabled={otp.length < 6 || verifyMutation.isPending}>
                  {verifyMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify & sign in"}
                </Button>
                <div className="text-center text-sm text-muted-foreground">
                  Didn't get it?{" "}
                  <button
                    type="button"
                    disabled={resendIn > 0 || requestMutation.isPending}
                    onClick={() => requestMutation.mutate(email)}
                    className="text-primary font-medium hover:underline disabled:opacity-50 disabled:no-underline"
                  >
                    {resendIn > 0 ? `Resend in ${resendIn}s` : "Resend code"}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}