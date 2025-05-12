
export type ThemeType = 'light' | 'dark';

export const themeService = {
 getCurrentTheme(): ThemeType {
    const storedTheme = localStorage.getItem('theme');
    // If no theme is stored, default to dark
    if (!storedTheme) {
      return 'dark';
    }
    return storedTheme === 'light' ? 'light' : 'dark';
  },

  applyTheme(theme: ThemeType): void {
    const lightColors = {
      primaryColor: '#2B7582',
      accentColor: '#F28C28',
      accentColorLight: '#a6f3ff',
      backgroundColor: '#FFFFFF',
      surfaceColor: '#F4F9FB' ,
      textPrimary: '#2C3E50',
      textSecondary: '#5D6D7E',
      borderColor: '#D9E2E8',
      mutedColor: '#EAF1F4',
      hoverColor: '#24656F',
      activeColor: '#1E5962',
      focusColor: '#A9D4DB',
      boxShadowSoft: '0 1px 3px rgba(0, 0, 0, 0.08)',
      boxShadowMedium: '0 2px 6px rgba(0, 0, 0, 0.1)',
      boxShadowInset: 'inset 0 1px 2px rgba(0, 0, 0, 0.05)',
      headerColor: '#121A1C',
      footerColor: '#121A1C',
      overlayColor: 'rgba(43, 117, 130, 0.685)',
      glassColor: 'rgba(255, 255, 255, 0.2)',

    };

    const darkColors = {
      primaryColor: '#2B7582',
      accentColor: '#F28C28',
      accentColorLight: '#a6f3ff',
      backgroundColor: '#121A1C',
      surfaceColor: '#1C2B2F',
      textPrimary: '#E0F1F3',
      textSecondary: '#9BAEB2',
      borderColor: '#3A4A4F',
      mutedColor: '#253539',
      hoverColor: '#368B98',
      activeColor: '#4BA6B5',
      focusColor: '#214C52',
      boxShadowSoft: '0 1px 3px rgba(0, 0, 0, 0.6)',
      boxShadowMedium: '0 2px 6px rgba(0, 0, 0, 0.5)',
      boxShadowInset: 'inset 0 1px 2px rgba(255, 255, 255, 0.05)',
      headerColor: '#2B7582',
      footerColor: '#070b0d',
      overlayColor: 'rgba(255, 128, 0, 0.56)',
      glassColor: 'rgba(18, 26, 28, 0.35)',
    };

    const colors = theme === 'dark' ? darkColors : lightColors;

    Object.entries(colors).forEach(([key, value]) => {
      document.documentElement.style.setProperty(`--${key}`, value);
    });

    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  },

  toggleTheme(): ThemeType {
    const currentTheme = this.getCurrentTheme();
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    this.applyTheme(newTheme);
    return newTheme;
  },

  initializeTheme(): void {
    this.applyTheme(this.getCurrentTheme());
  }
};
