import React from 'react';
import { useNavigate } from 'react-router-dom';

export function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center px-4">
      <div className="text-center">
        <h1 className="text-8xl font-bold text-gray-800 mb-4">404</h1>
        <p className="text-2xl font-semibold text-gray-700 mb-2">Page Not Found</p>
        <p className="text-gray-600 mb-8">Sorry, the page you're looking for doesn't exist.</p>
        <button
          onClick={() => navigate('/login')}
          className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 font-semibold"
        >
          Go Back to Login
        </button>
      </div>
    </div>
  );
}
