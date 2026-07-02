import { createContext, useContext, useEffect, useState } from "react";

interface AppSettings {
  appName: string;
  appLogoUrl?: string | null;
  defaultLanguage?: string;
}

const DEFAULT: AppSettings = { appName: "مسار" };

const AppSettingsContext = createContext<AppSettings>(DEFAULT);

export function AppSettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT);

  useEffect(() => {
    fetch("/api/projects/global-settings", { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.appName) setSettings({ appName: d.appName, appLogoUrl: d.appLogoUrl, defaultLanguage: d.defaultLanguage }); })
      .catch(() => {});
  }, []);

  // Update document title dynamically
  useEffect(() => {
    document.title = `${settings.appName} — منصة إدارة نماذج التسجيل والبيانات`;
  }, [settings.appName]);

  return (
    <AppSettingsContext.Provider value={settings}>
      {children}
    </AppSettingsContext.Provider>
  );
}

export function useAppSettings() {
  return useContext(AppSettingsContext);
}
