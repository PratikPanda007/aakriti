import React from 'react';

interface LoginPageProps {
  onLogin: () => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-4 font-sans">
      <div className="w-full max-w-md mx-auto bg-slate-800 rounded-2xl shadow-2xl p-8 text-center">
        <h1 className="text-3xl md:text-4xl font-bold text-emerald-400 mb-4">
          AI Portrait Generator
        </h1>
        <p className="text-slate-400 mb-8">
          Sign in to continue to your creative studio.
        </p>
        <button
          onClick={onLogin}
          className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 px-4 rounded-lg transition-transform transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-emerald-500"
        >
          Sign in with SSO
        </button>
        <p className="text-xs text-slate-500 mt-6">
          You will be redirected to your organization's sign-in page.
        </p>
      </div>
      <footer className="text-center text-slate-500 mt-8">
      </footer>
    </div>
  );
};

export default LoginPage;
