import React, { useState } from 'react';
import App from './App';
import LoginPage from './LoginPage';

const AuthGate: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const handleLogin = () => {
    // In a real app, this would involve a token exchange.
    // For this dummy page, we just set the state.
    setIsAuthenticated(true);
  };

  if (!isAuthenticated) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return <App />;
};

export default AuthGate;
