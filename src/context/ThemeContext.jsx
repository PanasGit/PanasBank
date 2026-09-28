import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import supabase from '../supabaseClient';
import { useAuth } from './AuthContext';

const STORAGE_KEY = 'panasbank-theme';
const META_COLORS = { dark: '#050507', light: '#F3F3F6' };

const ThemeContext = createContext();

function readStoredTheme() {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'light' ? 'light' : 'dark';
  } catch {
    return 'dark';
  }
}

export function ThemeProvider({ children }) {
  const { session, profile } = useAuth();
  const userId = session?.user?.id;
  const [theme, setThemeState] = useState(readStoredTheme);

  // Aplica el tema al documento (clase .dark, color de la barra del móvil y caché local)
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', META_COLORS[theme]);
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      /* sin almacenamiento disponible */
    }
  }, [theme]);

  // Al cargar el perfil, manda la preferencia guardada en la cuenta
  const profileId = profile?.id;
  const profileTheme = profile?.theme;
  useEffect(() => {
    if (profileId && (profileTheme === 'light' || profileTheme === 'dark')) {
      setThemeState(profileTheme);
    }
  }, [profileId, profileTheme]);

  const setTheme = useCallback(
    async (next) => {
      setThemeState(next); // el cambio es inmediato, sin esperar a la base de datos
      if (userId) {
        await supabase.from('profiles').update({ theme: next }).eq('id', userId);
      }
    },
    [userId]
  );

  const value = useMemo(() => ({ theme, setTheme }), [theme, setTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);