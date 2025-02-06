import React, { useEffect, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@mui/material/styles';
import { createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import Dashboard from './components/Dashboard';
import Login from './components/Login';

const queryClient = new QueryClient();
const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
    },
  },
});

function App() {
  const [loggedIn, setLoggedIn] = useState(false)

  useEffect(() => {
    if (localStorage.getItem('loggedIn')) setLoggedIn(true)
  }, [localStorage.getItem('loggedIn')])

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <CssBaseline />
          {loggedIn ? <Dashboard handleLoginIn={setLoggedIn} /> : <Login handleLoginIn={setLoggedIn} />}
        </LocalizationProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App; 