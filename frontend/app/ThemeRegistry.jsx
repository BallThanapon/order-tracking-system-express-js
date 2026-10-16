'use client';

import { useState } from 'react';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v15-appRouter';
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';

export default function ThemeRegistry({ children }) {
  const [theme] = useState(() =>
    createTheme({
      palette: {
        mode: 'light',
        primary: { main: '#2563eb' },
        background: { default: '#f6f8fb' },
      },
      shape: { borderRadius: 14 },
      typography: { fontFamily: 'Inter, Arial, sans-serif' },
    }),
  );

  return (
    <AppRouterCacheProvider>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </AppRouterCacheProvider>
  );
}
