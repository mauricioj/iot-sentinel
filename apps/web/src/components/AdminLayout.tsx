import { NavLink, Outlet } from "react-router-dom";
import { Input } from "./ui/Input";
import { Button } from "./ui/Button";
import { useAuth } from "../hooks/useAuth";
import { useI18n } from "../i18n";
import type { Locale } from "../i18n/messages";

export function AdminLayout() {
  const { logout } = useAuth();
  const { locale, setLocale, t } = useI18n();

  const navItems = [
    { to: "/", label: t("layout.nav.dashboard") },
    { to: "/devices", label: t("layout.nav.devices") },
    { to: "/device-types", label: t("layout.nav.deviceTypes") },
    { to: "/locations", label: t("layout.nav.locations") },
    { to: "/discovered-hosts", label: t("layout.nav.discoveredHosts") },
    { to: "/settings", label: t("layout.nav.settings") }
  ];

  return (
    <div className="admin-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <img src="/brand/icon.png" alt="IoT Sentinel icon" />
          <span>Sentinel</span>
        </div>
        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`.trim()}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="admin-main">
        <header className="topbar">
          <div className="topbar-brand">
            <img src="/brand/logo.png" alt="IoT Sentinel" />
            <strong>IoT Sentinel</strong>
          </div>
          <Input placeholder={t("layout.searchPlaceholder")} />
          <div className="row-inline">
            <label className="language-switch" aria-label={t("layout.language")}>
              <span className="language-icon" aria-hidden="true">
                {locale === "pt-BR" ? "🇧🇷" : "🇺🇸"}
              </span>
              <select value={locale} onChange={(event) => setLocale(event.target.value as Locale)}>
                <option value="pt-BR">🇧🇷 {t("layout.languagePtBr")}</option>
                <option value="en">🇺🇸 {t("layout.languageEn")}</option>
              </select>
            </label>
            <Button onClick={logout} variant="ghost">
              {t("layout.logout")}
            </Button>
          </div>
        </header>

        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
