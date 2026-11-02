import { Link } from "react-router-dom";
import { ArrowLeft, Bell, ShieldCheck } from "lucide-react";

export default function NotificationHelp() {
  return <article className="notification-help page-stack">
    <Link to="/account" className="help-back-link"><ArrowLeft size={16} aria-hidden="true" />Back to account</Link>
    <header className="page-heading"><div><h1>Browser notification help</h1><p>Choose when this device can show your workspace alerts.</p></div><Bell size={24} aria-hidden="true" /></header>
    <section><h2>Enable alerts on this device</h2><ol><li>Open <Link to="/account">Account</Link> and find Browser notifications.</li><li>Choose Enable browser alerts, then allow notifications in the browser prompt.</li><li>Use Send test push to check that alerts arrive on your registered device.</li></ol></section>
    <section><h2>If notifications are blocked</h2><p>Open this site’s permissions in your browser settings and allow notifications. Return to Account and try enabling browser alerts again. Some browsers and connections do not support browser alerts.</p></section>
    <section><h2>If alerts haven’t been enabled for your workspace</h2><p>Your platform administrator needs to configure browser notifications before you can subscribe. You can still use the notification inbox at the top of the dashboard.</p></section>
    <section><h2>Shared devices</h2><p>Sign out when you finish using a shared device. Signing out disconnects that browser’s push subscription from your session.</p><p className="help-privacy-note"><ShieldCheck size={16} aria-hidden="true" />You can disable this browser’s alerts at any time from Account.</p></section>
  </article>;
}
