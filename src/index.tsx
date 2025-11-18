import React from 'react';
import ReactDOM from 'react-dom/client';
import { ClerkProvider } from "@clerk/clerk-react";
// import AuthGate from './AuthGate';
// import App from './App';
import Router from './Router';

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!PUBLISHABLE_KEY) {
  throw new Error("Missing Clerk Publishable Key");
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
      {/* <App /> */}
      <Router />
    </ClerkProvider>
  </React.StrictMode>
);