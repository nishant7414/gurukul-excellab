import { useEffect, useMemo, useRef, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { BarChart3, ClipboardList, Database, BookMarked, ClipboardCheck, FlaskConical, GraduationCap, LayoutDashboard, ListChecks, LogOut, Map, Menu, Notebook, PanelLeftClose, PanelLeftOpen, Search, Settings, Sigma, Trophy, X } from "lucide-react";
import { APP_NAME, INSTITUTION, initialsFromName } from "../brand";
import { GunvattaGurukulLogo } from "./GunvattaGurukulLogo";
import { actions, useStore, usePersistError, usePersistStatus } from "../state/store";
import { ALL_LESSONS } from "../content/lessons";
import { ALL_EXERCISES } from "../content/registry";
import { ownerOf } from "../content/routes";

export const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/classroom", label: "My Classroom", icon: GraduationCap },
  { to: "/roadmap", label: "Learning Roadmap", icon: Map },
  { to: "/practice", label: "Practice Lab", icon: FlaskConical },
  { to: "/playground", label: "Formula Playground", icon: Sigma },
  { to: "/challenges", label: "Challenges", icon: Trophy },
  { to: "/quizzes", label: "Quizzes", icon: ClipboardCheck },
  { to: "/mistakes", label: "Mistake Notebook", icon: Notebook },
  { to: "/analytics", label: "Progress Analytics", icon: BarChart3 },
  { to: "/audit", label: "Workbook Coverage Audit", icon: ListChecks },
  { to: "/datasets", label: "Dataset Library", icon: Database },
  { to: "/coverage", label: "Practice Coverage", icon: ClipboardList },
  { to: "/functions", label: "Function Library", icon: BookMarked },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

export function Shell() {
  const collapsed = useStore((s) => s.settings.sidebarCollapsed);
  const name = useStore((s) => s.displayName);
  const email = useStore((s) => s.auth.email);
  const unresolved = useStore((s) => s.mistakes.filter((m) => !m.resolved).length);
  const persistErr = usePersistError();
  const persist = usePersistStatus();
  const [open, setOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [q, setQ] = useState("");
  const loc = useLocation();
  const nav = useNavigate();
  const menuRef = useRef<HTMLDivElement>(null);
  const initials = initialsFromName(name);

  useEffect(() => { setOpen(false); setQ(""); setMenuOpen(false); }, [loc.pathname]);
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const results = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (t.length < 2) return [];
    const out: { to: string; label: string; kind: string }[] = [];
    for (const n of NAV) if (n.label.toLowerCase().includes(t)) out.push({ to: n.to, label: n.label, kind: "Page" });
    for (const l of ALL_LESSONS) if (l.title.toLowerCase().includes(t) || l.content.simple.toLowerCase().includes(t)) out.push({ to: `/lesson/${l.id}`, label: l.title, kind: "Lesson" });
    for (const e of ALL_EXERCISES) if (e.title.toLowerCase().includes(t)) out.push({ to: ownerOf(e).to, label: e.title, kind: "Exercise" });
    return out.slice(0, 12);
  }, [q]);

  return (
    <div className={`app ${collapsed ? "collapsed" : ""}`}>
      <a className="skip" href="#main">Skip to content</a>
      <nav className={`sidebar glass ${open ? "open" : ""}`} aria-label="Main navigation">
        <div className="brand">
          <div className="brand-mark">
            <GunvattaGurukulLogo size={collapsed ? "compact" : "header"} variant={collapsed ? "emblem" : "full"} />
          </div>
          <span>{APP_NAME}</span>
        </div>
        {NAV.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.to === "/"} className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`} title={n.label}>
            <n.icon size={19} aria-hidden="true" /><span className="nav-label">{n.label}{n.to === "/mistakes" && unresolved > 0 ? ` (${unresolved})` : ""}</span>
          </NavLink>
        ))}
        <div style={{ flex: 1 }} />
        <p className="nav-label small faint sidebar-tagline" style={{ padding: "8px 12px" }}>{INSTITUTION}</p>
        <button className="btn ghost nav-collapse" onClick={() => actions.setSidebar(!collapsed)} aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}>{collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}<span className="nav-label">Collapse</span></button>
      </nav>
      <div className="main">
        <div className="topbar">
          <button className="btn mobile-only topbar-menu" onClick={() => setOpen(!open)} aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open}>{open ? <X size={18} /> : <Menu size={18} />}</button>
          <div className="search glass topbar-search">
            <div className="row" style={{ flexWrap: "nowrap" }}>
              <Search size={16} aria-hidden="true" />
              <input type="search" aria-label="Search lessons and exercises" placeholder="Search lessons, exercises, pages…" value={q} onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && results[0]) nav(results[0].to); }} style={{ border: 0, background: "transparent", flex: 1, minWidth: 0 }} />
            </div>
            {q.trim().length >= 2 && (
              <div className="search-results glass" role="listbox">
                {results.length === 0 ? <div className="muted small" style={{ padding: 8 }}>No matches. Only built lessons are searchable.</div> : results.map((r) => <Link key={r.kind + r.to + r.label} to={r.to}><span className="pill" style={{ marginRight: 8 }}>{r.kind}</span>{r.label}</Link>)}
              </div>
            )}
          </div>
          <div className="topbar-spacer" aria-hidden="true" />
          <Link to="/mistakes" className="glass row small topbar-mistakes" style={{ textDecoration: "none", color: "inherit" }} aria-label={`${unresolved} unresolved mistakes`}>
            <span aria-hidden="true">🔔</span>
            <span className="topbar-mistakes-label">{unresolved > 0 ? `${unresolved} to review` : "All caught up"}</span>
          </Link>
          <div className="menu-wrap account-wrap topbar-account" ref={menuRef}>
            <button
              type="button"
              className="glass row small account-btn"
              aria-expanded={menuOpen}
              aria-haspopup="menu"
              aria-label={`Account menu for ${name}`}
              onClick={() => setMenuOpen((v) => !v)}
            >
              <span className="avatar" aria-hidden="true">{initials}</span>
              <span className="account-name">{name}</span>
            </button>
            {menuOpen && (
              <div className="menu glass" role="menu" style={{ right: 0, left: "auto" }}>
                <p className="small" style={{ padding: "6px 10px", margin: 0 }}><strong>{name}</strong>{email ? <><br /><span className="faint">{email}</span></> : null}</p>
                <Link role="menuitem" to="/settings" onClick={() => setMenuOpen(false)}>Settings</Link>
                <button type="button" role="menuitem" onClick={() => { setMenuOpen(false); actions.signOut(); }}><LogOut size={14} aria-hidden="true" /> Sign out</button>
              </div>
            )}
          </div>
        </div>
        {persistErr && <div className="callout bad persist-note" role="alert">{persistErr} Your progress will be lost when you close this tab. Use Settings → Export to keep a copy.</div>}
        {!persistErr && persist.status === "saving" && <p className="small faint persist-note" role="status">Saving local progress…</p>}
        <main id="main" tabIndex={-1}><Outlet /></main>
        <footer className="app-footer small faint">
          <div className="footer-mark"><GunvattaGurukulLogo size="footer" /></div>
          <p>{APP_NAME} · {INSTITUTION}</p>
        </footer>
      </div>
      <style>{`.mobile-only{display:none}@media (max-width:960px){.mobile-only{display:inline-flex}}`}</style>
    </div>
  );
}
