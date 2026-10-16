import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import {
  ArrowRight,
  Loader2,
  ShieldCheck,
  UtensilsCrossed,
} from "lucide-react";
import { activateInvitation } from "@/services/authService";
import { useAuth } from "@/contexts/AuthContext";
import { extractApiError } from "@/lib/api";
import { toast } from "@/hooks/use-toast";

export default function ActivateInvitation() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { loginWithTokens } = useAuth();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const uid = params.get("uid") ?? "";
  const token = params.get("token") ?? "";
  const valid = useMemo(() => Boolean(uid && token), [token, uid]);
  const mutation = useMutation({
    mutationFn: () =>
      activateInvitation({
        uidb64: uid,
        token,
        password,
        confirm_password: confirm,
      }),
    onSuccess: (data) => {
      loginWithTokens(data.user, data.tokens.access, data.tokens.refresh);
      toast({
        title: "Account activated",
        description: "Your restaurant workspace is ready.",
      });
      navigate("/dashboard", { replace: true });
    },
    onError: (error) =>
      toast({
        title: "Activation failed",
        description: extractApiError(error),
        variant: "destructive",
      }),
  });
  return (
    <main className="auth-screen">
      <div className="auth-shell">
        <section className="auth-brand-panel">
          <div className="auth-brand-top">
            <div className="auth-brand-mark">
              <UtensilsCrossed size={21} />
            </div>
            <div className="auth-brand-name">
              <strong>
                fudz<span>hub</span>
              </strong>
              <small>RESTAURANT OPERATIONS</small>
            </div>
          </div>
          <div className="auth-brand-copy">
            <span className="auth-eyebrow">You’re invited</span>
            <h1>
              Start with a<br />
              <span>clear workspace.</span>
            </h1>
            <p>
              Activate your restaurant account and get ready to run service with
              confidence.
            </p>
          </div>
          <div className="auth-brand-bottom">
            © {new Date().getFullYear()} Fudz Hub · Built for the rhythm of
            service
          </div>
        </section>
        <section className="auth-form-panel">
          <div className="auth-form-wrap">
            <div className="auth-mobile-brand">
              <span className="auth-brand-mark">
                <UtensilsCrossed size={17} />
              </span>
              <strong>
                fudz<span>hub</span>
              </strong>
            </div>
            {valid ? (
              <>
                <div className="auth-form-heading">
                  <span className="auth-eyebrow">Secure activation</span>
                  <h2>Choose your password</h2>
                  <p>
                    Set a password to activate the restaurant workspace created
                    for your email.
                  </p>
                </div>
                <form
                  className="auth-form"
                  onSubmit={(event) => {
                    event.preventDefault();
                    mutation.mutate();
                  }}
                >
                  <div className="auth-field">
                    <label htmlFor="new-password">Password</label>
                    <input
                      id="new-password"
                      type="password"
                      minLength={8}
                      autoComplete="new-password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      required
                    />
                  </div>
                  <div className="auth-field">
                    <label htmlFor="confirm-password">Confirm password</label>
                    <input
                      id="confirm-password"
                      type="password"
                      minLength={8}
                      autoComplete="new-password"
                      value={confirm}
                      onChange={(event) => setConfirm(event.target.value)}
                      required
                    />
                  </div>
                  {confirm && password !== confirm && (
                    <p className="auth-password-error">
                      Passwords don’t match.
                    </p>
                  )}
                  <button
                    className="auth-primary-action"
                    type="submit"
                    disabled={
                      mutation.isPending ||
                      password.length < 8 ||
                      password !== confirm
                    }
                  >
                    {mutation.isPending ? (
                      <Loader2 className="mx-auto h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        Activate workspace <ArrowRight size={16} />
                      </>
                    )}
                  </button>
                </form>
                <p className="auth-form-note">
                  <ShieldCheck size={13} /> This invitation link can be used
                  once and expires after 30 minutes.
                </p>
              </>
            ) : (
              <div className="auth-form-heading">
                <span className="auth-eyebrow">Invitation unavailable</span>
                <h2>This link is incomplete</h2>
                <p>
                  Use the activation link from your restaurant invitation email,
                  or ask an administrator to send it again.
                </p>
                <Link className="auth-primary-action" to="/admin/login">
                  Go to sign in <ArrowRight size={16} />
                </Link>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
