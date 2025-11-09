import { useState, useEffect, useCallback } from 'react';
import { logoSvg } from '../assets/logo';

type Theme = 'light' | 'dark';

export const useTheme = (): [Theme, () => void] => {
  const [theme, setTheme] = useState<Theme>(() => {
    // Get initial theme without waiting for useEffect to prevent FOUC
    return (localStorage.getItem('theme') as Theme | null) || 
           (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
  });

  const updateFavicon = useCallback((currentTheme: Theme) => {
    const favicon = document.getElementById('favicon') as HTMLLinkElement;
    if (favicon) {
      const isDark = currentTheme === 'dark';
      // Colors defined here for the favicon SVG, as CSS variables aren't available yet on initial load.
      const bg = isDark ? '#778DA9' : '#263238'; // Dark: Steel Blue, Light: Blue Grey
      const fg = isDark ? '#0D1B2A' : '#FFFFFF'; // Dark: Dark Navy, Light: White

      const themedSvg = logoSvg
        .replace('var(--logo-bg)', bg)
        .replace('var(--logo-fg)', fg);
        
      const svgBlob = new Blob([themedSvg], { type: 'image/svg+xml' });
      const oldUrl = favicon.href;
      favicon.href = URL.createObjectURL(svgBlob);
      if (oldUrl && oldUrl.startsWith('blob:')) {
        URL.revokeObjectURL(oldUrl);
      }
    }
  }, []);

  useEffect(() => {
    document.documentElement.className = `theme-${theme}`;
    localStorage.setItem('theme', theme);
    // Use a small timeout to ensure CSS variables are applied before updating favicon
    setTimeout(() => updateFavicon(theme), 50);
  }, [theme, updateFavicon]);

  const toggleTheme = useCallback(() => {
    setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
  }, []);

  return [theme, toggleTheme];
};
