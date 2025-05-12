// src/services/fontService.ts
export const fontService = {
  initializeFonts(): void {
    // Define font variables
    const fonts = {
      // Font families
      fontTitle: '"Bruno Ace", sans-serif',
      fontSubtitle: '"Pacifico", cursive',
      fontBody: '"Inter", sans-serif', 
      fontMono: '"Fira Mono", monospace',
      fontButton: '"Julius Sans One", sans-serif',
      
      // Font sizes
      sizeHeroTitle: '5rem',
      sizeSubheading: '2.5rem',
      sizeBodyLarge: '20px',
      sizeBody: '16px',
      sizeButton: '14px',
      sizeSmall: '13px',
      
      // Font weights
      weightLight: '300',
      weightRegular: '400',
      weightMedium: '500',
      weightSemibold: '600',
      weightBold: '700',
      
      // Line heights
      lineHeightTitle: '1.2',
      lineHeightBody: '1.5',
      lineHeightCompact: '1.4'
    };
    
    // Set CSS custom properties
    Object.entries(fonts).forEach(([key, value]) => {
      document.documentElement.style.setProperty(`--${key}`, value);
    });
  }
};