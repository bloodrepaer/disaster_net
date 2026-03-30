import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '../services/auth/authContext';

export function Login() {
  const navigate = useNavigate();
  const { login, loginWithNEAR, error } = useAuthContext();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const user = await login(email, password);
      navigate(`/${user.role.toLowerCase()}`);
    } catch (err) {
      console.error('Login error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNEARLogin = async () => {
    setIsLoading(true);
    try {
      const user = await loginWithNEAR();
      navigate(`/${user.role.toLowerCase()}`);
    } catch (err) {
      console.error('NEAR login error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-r from-blue-600 to-blue-800 flex items-center justify-center px-4">
      <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md">
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-8">
          DisasterNet
        </h1>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleEmailLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 text-white font-bold py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition"
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="my-6 flex items-center">
          <div className="flex-grow border-t border-gray-300"></div>
          <span className="px-3 text-gray-500">OR</span>
          <div className="flex-grow border-t border-gray-300"></div>
        </div>

        <button
          onClick={handleNEARLogin}
          disabled={isLoading}
          className="w-full bg-black text-white font-bold py-2 rounded-lg hover:bg-gray-800 disabled:bg-gray-400 transition flex items-center justify-center gap-2"
        >
          <span>🔒</span>
          Sign in with NEAR
        </button>

        <p className="text-center text-gray-600 mt-6 text-sm">
          Don't have an account?{' '}
          <a href="#signup" className="text-blue-600 hover:underline font-semibold">
            Sign up
          </a>
        </p>
      </div>
    </div>
  );
}
