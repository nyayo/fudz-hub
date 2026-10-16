import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Loader2, ShieldCheck, UtensilsCrossed } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { adminLogin } from "@/services/authService";
import { extractApiError } from "@/lib/api";
import { toast } from "@/hooks/use-toast";

export default function AdminLogin() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, loginWithTokens, role } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const requested = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname;
  const destination = requested ?? (role === "admin" ? "/admin" : "/dashboard");

  useEffect(() => {
    if (isAuthenticated) navigate(destination, { replace: true });
  }, [destination, isAuthenticated, navigate]);

  const mutation = useMutation({
    mutationFn: () => adminLogin(email.trim(), password),
    onSuccess: (data) => {
      loginWithTokens(data.user, data.tokens.access, data.tokens.refresh);
      toast({ title: "Admin access granted", description: data.user.email });
      navigate("/admin", { replace: true });
    },
    onError: (error) => toast({ title: "Sign in failed", description: extractApiError(error), variant: "destructive" }),
  });

  return (
    <main className="auth-screen">
      <div className="auth-shell">
        <section className="auth-brand-panel" aria-label="Fudz Hub platform administration">
          <div className="auth-brand-top"><div className="auth-brand-mark"><UtensilsCrossed size={21} /></div><div className="auth-brand-name"><strong>fudz<span>hub</span></strong><small>PLATFORM ADMINISTRATION</small></div></div>
          <div className="auth-brand-copy"><span className="auth-eyebrow">Platform control</span><h1>Keep every<br />workspace <span>moving.</span></h1><p>Manage restaurants, users, approvals and operations from one secure platform workspace.</p></div>
          <div className="auth-brand-bottom">© {new Date().getFullYear()} Fudz Hub · Administrator access</div>
        </section>
        <section className="auth-form-panel">
          <div className="auth-form-wrap">
            <div className="auth-mobile-brand"><span className="auth-brand-mark"><UtensilsCrossed size={17} /></span><strong>fudz<span>hub</span></strong></div>
            <div className="auth-form-heading"><span className="auth-eyebrow">Administrator access</span><h2>Sign in as admin</h2><p>Use the email and password created for your Django superuser account.</p></div>
            <form className="auth-form" onSubmit={(event) => { event.preventDefault(); mutation.mutate(); }}>
              <div className="auth-field"><label htmlFor="admin-email">Admin email</label><input id="admin-email" type="email" autoComplete="email" autoFocus value={email} onChange={(event) => setEmail(event.target.value)} placeholder="admin@fudz.com" required /></div>
              <div className="auth-field"><label htmlFor="admin-password">Password</label><input id="admin-password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter your password" required /></div>
              <button type="submit" className="auth-primary-action" disabled={mutation.isPending || !email.trim() || !password}>{mutation.isPending ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : <>Sign in to admin <ArrowRight size={16} /></>}</button>
            </form>
            <p className="auth-form-note"><ShieldCheck size={13} /> Only Django staff or superuser accounts can use this route.</p>
            <Link className="auth-back-action auth-login-back" to="/login"><ArrowLeft size={14} /> Back to restaurant sign in</Link>
          </div>
        </section>
      </div>
    </main>
  );
}
