import { useState } from "react";
import { Outlet } from "react-router-dom";
import { AppSidebar } from "./AppSidebar";
import { Topbar } from "./Topbar";

export function AppShell() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="app-frame">
      {mobileNavOpen && (
        <button
          type="button"
          className="mobile-nav-backdrop"
          aria-label="Close navigation"
          onClick={() => setMobileNavOpen(false)}
        />
      )}
      <AppSidebar mobileOpen={mobileNavOpen} onNavigate={() => setMobileNavOpen(false)} />
      <div className="workspace-main">
        <Topbar mobileNavOpen={mobileNavOpen} onMenuClick={() => setMobileNavOpen((open) => !open)} />
        <main className="workspace-content">
          <Outlet />
        </main>
        <footer className="workspace-footer">
          <span>FoGo Merchant Operations</span>
          <span>Service, simplified.</span>
        </footer>
      </div>
    </div>
  );
}