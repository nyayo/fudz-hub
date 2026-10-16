import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  BarChart3,
  ClipboardList,
  Loader2,
  ShieldCheck,
  UtensilsCrossed,
} from "lucide-react";
import type { LatLngTuple } from "leaflet";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { RestaurantLocationPicker } from "@/components/RestaurantLocationPicker";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { registerRestaurant, requestOtp, verifyOtp } from "@/services/authService";
import { extractApiError } from "@/lib/api";

type Step = "email" | "otp" | "register";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, loginWithTokens, role } = useAuth();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [resendIn, setResendIn] = useState(0);
  const [selectedLocation, setSelectedLocation] = useState<LatLngTuple | null>(null);
  const [registration, setRegistration] = useState({ first_name: "", last_name: "", restaurant_name: "", business_license: "", address: "", password: "", password2: "" });
  const requestedLocation = (location.state as { from?: { pathname?: string; search?: string; hash?: string } } | null)?.from;
  const requestedDestination = requestedLocation?.pathname
    ? `${requestedLocation.pathname}${requestedLocation.search ?? ""}${requestedLocation.hash ?? ""}`
    : null;
  const from = requestedDestination ?? (role === "admin" ? "/admin" : "/dashboard");
  const activeStep = step === "email" ? 1 : step === "otp" ? 2 : 3;

  useEffect(() => {
    if (isAuthenticated) navigate(from, { replace: true });
  }, [isAuthenticated, from, navigate]);

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = window.setInterval(() => setResendIn((value) => value - 1), 1000);
    return () => window.clearInterval(timer);
  }, [resendIn]);

  const requestMutation = useMutation({
    mutationFn: requestOtp,
    onSuccess: () => {
      setStep("otp");
      setResendIn(45);
      toast({ title: "Code sent", description: `We sent a sign-in code to ${email}.` });
    },
    onError: (error) => toast({ title: "Couldn't send a code", description: extractApiError(error), variant: "destructive" }),
  });

  const verifyMutation = useMutation({
    mutationFn: () => verifyOtp(email, otp),
    onSuccess: (data) => {
      if (!data.user_exists || data.requires_registration || !data.tokens || !data.user) {
        setStep("register");
        return;
      }
      loginWithTokens(data.user, data.tokens.access, data.tokens.refresh);
      toast({ title: "You're signed in", description: data.user.email });
      const destination = requestedDestination ?? (data.user.is_staff || data.user.is_superuser ? "/admin" : "/dashboard");
      navigate(destination, { replace: true });
    },
    onError: (error) => toast({ title: "Code not verified", description: extractApiError(error), variant: "destructive" }),
  });

  const registerMutation = useMutation({
    mutationFn: () => {
      if (!selectedLocation) throw new Error("Choose the restaurant location on the map before submitting.");
      return registerRestaurant({
        ...registration,
        address: registration.address.trim(),
        email,
        user_type: "restaurant",
        latitude: selectedLocation[0],
        longitude: selectedLocation[1],
      });
    },
    onSuccess: (data) => {
      if (!data.user || !data.tokens) return;
      loginWithTokens(data.user, data.tokens.access, data.tokens.refresh);
      toast({ title: "Restaurant application submitted", description: "Your profile is ready. Platform approval may be required before operations open." });
      navigate(requestedDestination && !requestedDestination.startsWith("/admin") ? requestedDestination : "/dashboard", { replace: true });
    },
    onError: (error) => toast({ title: "Workspace not created", description: extractApiError(error), variant: "destructive" }),
  });

  const handleEmailSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (email.trim()) requestMutation.mutate(email.trim());
  };
  const handleVerify = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (otp.length === 6) verifyMutation.mutate();
  };
  const passwordsMatch = registration.password === registration.password2;
  const pinIsValid = selectedLocation != null && (selectedLocation[0] !== 0 || selectedLocation[1] !== 0);

  return (
    <main className="auth-screen">
      <div className="auth-shell">
        <section className="auth-brand-panel" aria-label="About Fudz Hub">
          <div className="auth-brand-top">
            <div className="auth-brand-mark"><UtensilsCrossed size={21} /></div>
            <div className="auth-brand-name"><strong>fudz<span>hub</span></strong><small>RESTAURANT OPERATIONS</small></div>
          </div>

          <div className="auth-brand-copy">
            <span className="auth-eyebrow">One calmer way to run service</span>
            <h1>Good service.<br />Clear <span>control.</span></h1>
            <p>Bring the moving parts of your restaurant together—from the first order to the final handoff.</p>
            <div className="auth-capabilities">
              <span className="auth-capability"><ClipboardList size={13} /> Orders & delivery</span>
              <span className="auth-capability"><UtensilsCrossed size={13} /> Menu & campaigns</span>
              <span className="auth-capability"><BarChart3 size={13} /> Daily performance</span>
            </div>
          </div>

          <div className="auth-preview-card" aria-hidden="true">
            <div className="auth-preview-head"><span>Service snapshot</span><span>● Live workspace</span></div>
            <div className="auth-preview-row"><span className="auth-preview-bullet"><ClipboardList size={13} /></span><span>New order received<small>Pickup · 4 items</small></span><span className="auth-preview-state">In queue</span></div>
            <div className="auth-preview-row"><span className="auth-preview-bullet"><BadgeCheck size={13} /></span><span>Kitchen handoff<small>Team status · Ready</small></span><span className="auth-preview-state">On track</span></div>
          </div>
          <div className="auth-brand-bottom">© {new Date().getFullYear()} Fudz Hub · Built for the rhythm of service</div>
        </section>

        <section className={`auth-form-panel${step === "register" ? " is-registering" : ""}`}>
          <div className={`auth-form-wrap${step === "register" ? " is-wide" : ""}`}>
            <div className="auth-mobile-brand">
              <span className="auth-brand-mark"><UtensilsCrossed size={17} /></span>
              <strong>fudz<span>hub</span></strong>
            </div>

            <div className="auth-progress" aria-label={`Step ${activeStep} of 3`}>
              {["Email", "Verify", "Restaurant"].map((label, index) => {
                const number = index + 1;
                return (
                  <div className="auth-progress-group" key={label}>
                    <div className={`auth-progress-step${activeStep === number ? " is-current" : ""}${activeStep > number ? " is-complete" : ""}`}>
                      <span>{activeStep > number ? <BadgeCheck size={12} /> : number}</span>{label}
                    </div>
                    {index < 2 && <i className="auth-progress-line" />}
                  </div>
                );
              })}
            </div>

            {step === "email" ? (
              <>
                <div className="auth-form-heading"><span className="auth-eyebrow">Your operations space</span><h2>Sign in to Fudz Hub</h2><p>Use your work email for a secure one-time code. New restaurant owners can start their application here.</p></div>
                <form onSubmit={handleEmailSubmit} className="auth-form">
                  <div className="auth-field"><label htmlFor="email">Work email</label><input id="email" type="email" autoComplete="email" autoFocus placeholder="you@restaurant.com" value={email} onChange={(event) => setEmail(event.target.value)} required /></div>
                  <button type="submit" className="auth-primary-action" disabled={requestMutation.isPending || !email.trim()}>{requestMutation.isPending ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : <>Continue with email <ArrowRight size={16} /></>}</button>
                </form>
                <p className="auth-form-note"><ShieldCheck size={13} /> Your workspace is protected with a secure one-time verification code.</p>
                <Link className="auth-secondary-action" to="/admin/login">Platform administrator sign in</Link>
              </>
            ) : step === "otp" ? (
              <>
                <div className="auth-form-heading"><button type="button" className="auth-back-action" onClick={() => { setStep("email"); setOtp(""); }}><ArrowLeft size={14} /> Change email</button><h2>Check your inbox</h2><p>Enter the six-digit code sent to <strong>{email}</strong>. It may take a moment to arrive.</p></div>
                <form onSubmit={handleVerify} className="auth-form">
                  <div className="auth-otp-control"><InputOTP maxLength={6} value={otp} onChange={setOtp} autoFocus><InputOTPGroup>{[0, 1, 2, 3, 4, 5].map((index) => <InputOTPSlot key={index} index={index} className="h-12 w-11 text-base" />)}</InputOTPGroup></InputOTP></div>
                  <button type="submit" className="auth-primary-action" disabled={otp.length < 6 || verifyMutation.isPending}>{verifyMutation.isPending ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : <>Verify and continue <ArrowRight size={16} /></>}</button>
                  <p className="auth-resend-row">Didn't receive it? <button type="button" className="auth-text-action" disabled={resendIn > 0 || requestMutation.isPending} onClick={() => requestMutation.mutate(email)}>{resendIn > 0 ? `Send another in ${resendIn}s` : "Resend code"}</button></p>
                </form>
                <p className="auth-form-note"><ShieldCheck size={13} /> Verification protects account access and restaurant data.</p>
              </>
            ) : (
              <>
                <div className="auth-form-heading"><button type="button" className="auth-back-action" onClick={() => setStep("otp")}><ArrowLeft size={14} /> Back to verification</button><span className="auth-eyebrow">Restaurant application</span><h2>Set up your restaurant</h2><p>Your email is verified. Add your business details and pin the pickup point on the map.</p></div>
                <form onSubmit={(event) => { event.preventDefault(); registerMutation.mutate(); }} className="auth-form auth-registration-form">
                  <div className="auth-registration-grid">
                    <div className="auth-field"><label htmlFor="first-name">Owner first name</label><input id="first-name" autoComplete="given-name" value={registration.first_name} onChange={(event) => setRegistration({ ...registration, first_name: event.target.value })} required /></div>
                    <div className="auth-field"><label htmlFor="last-name">Owner last name</label><input id="last-name" autoComplete="family-name" value={registration.last_name} onChange={(event) => setRegistration({ ...registration, last_name: event.target.value })} required /></div>
                  </div>
                  <div className="auth-registration-grid">
                    <div className="auth-field"><label htmlFor="restaurant-name">Restaurant name</label><input id="restaurant-name" autoComplete="organization" value={registration.restaurant_name} onChange={(event) => setRegistration({ ...registration, restaurant_name: event.target.value })} required /></div>
                    <div className="auth-field"><label htmlFor="business-license">Business licence</label><input id="business-license" value={registration.business_license} onChange={(event) => setRegistration({ ...registration, business_license: event.target.value })} required /></div>
                  </div>
                  <RestaurantLocationPicker
                    value={selectedLocation}
                    onChange={setSelectedLocation}
                    searchQuery={registration.address}
                    onSearchQueryChange={(address) => setRegistration((current) => ({ ...current, address }))}
                    onAddressFound={(address) => setRegistration((current) => ({ ...current, address }))}
                    label="Restaurant address and pickup point"
                  />
                  <div className="auth-registration-grid">
                    <div className="auth-field"><label htmlFor="password">Password</label><input id="password" type="password" minLength={8} autoComplete="new-password" value={registration.password} onChange={(event) => setRegistration({ ...registration, password: event.target.value })} required /></div>
                    <div className="auth-field"><label htmlFor="password-confirm">Confirm password</label><input id="password-confirm" type="password" minLength={8} autoComplete="new-password" value={registration.password2} onChange={(event) => setRegistration({ ...registration, password2: event.target.value })} required /></div>
                  </div>
                  {!passwordsMatch && registration.password2 && <p className="auth-password-error">Passwords don't match.</p>}
                  {!pinIsValid && <p className="auth-registration-note">A map pin is required so delivery routes can start from your restaurant.</p>}
                  <button type="submit" className="auth-primary-action" disabled={registerMutation.isPending || registration.password.length < 8 || !passwordsMatch || !registration.address.trim() || !pinIsValid}>{registerMutation.isPending ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : <>Submit restaurant application <ArrowRight size={16} /></>}</button>
                </form>
              </>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
