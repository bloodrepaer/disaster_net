import React, { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import { useAuthContext } from '../services/auth/authContext';

export function VictimHome() {
  const { user, logout } = useAuthContext();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-800">🏥 Victim Portal</h1>
          <div className="flex items-center gap-4">
            <span className="text-gray-700">{user?.email}</span>
            <button
              onClick={logout}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {/* Search Card */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">🔍 Search Missing Persons</h2>
            <form className="space-y-3">
              <input
                type="text"
                placeholder="Enter name or phone number"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
              <button
                type="submit"
                className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 font-semibold"
              >
                Search
              </button>
            </form>
          </div>

          {/* Family Status Card */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">👨‍👩‍👧 Family Status</h2>
            <div className="space-y-2">
              <p className="text-sm"><span className="font-semibold">Missing:</span> 2</p>
              <p className="text-sm"><span className="font-semibold">Found:</span> 1</p>
              <p className="text-sm"><span className="font-semibold">Deceased:</span> 0</p>
            </div>
            <button className="w-full mt-4 bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 font-semibold">
              View Details
            </button>
          </div>

          {/* Compensation Card */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">💰 Compensation</h2>
            <div className="space-y-2">
              <p className="text-sm"><span className="font-semibold">Ready to Claim:</span> 1</p>
              <p className="text-sm"><span className="font-semibold">Already Claimed:</span> 0</p>
              <p className="text-sm"><span className="font-semibold">Pending:</span> 1</p>
            </div>
            <button className="w-full mt-4 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 font-semibold">
              Request OTP & Claim
            </button>
          </div>
        </div>

        {/* Family Members List */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">📋 Your Family Members</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-gray-300">
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Name</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Reported Date</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Compensation</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Action</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b hover:bg-gray-50">
                  <td className="py-3 px-4">Ahmed Hassan</td>
                  <td className="py-3 px-4">
                    <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm">Missing</span>
                  </td>
                  <td className="py-3 px-4">Mar 21, 2026</td>
                  <td className="py-3 px-4">Pending</td>
                  <td className="py-3 px-4">
                    <button className="text-blue-600 hover:underline">Details</button>
                  </td>
                </tr>
                <tr className="border-b hover:bg-gray-50">
                  <td className="py-3 px-4">Fatima Hassan</td>
                  <td className="py-3 px-4">
                    <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm">Found ✓</span>
                  </td>
                  <td className="py-3 px-4">Mar 21, 2026</td>
                  <td className="py-3 px-4">
                    <span className="text-green-600 font-semibold">$1,000 Ready</span>
                  </td>
                  <td className="py-3 px-4">
                    <button className="text-green-600 hover:underline font-semibold">Claim Now</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Notifications */}
        <div className="bg-white rounded-lg shadow-lg p-6 mt-8">
          <h2 className="text-xl font-bold text-gray-800 mb-4">🔔 Recent Notifications</h2>
          <div className="space-y-3">
            <div className="bg-green-50 border-l-4 border-green-600 p-4">
              <p className="font-semibold text-green-800">✓ Person Found</p>
              <p className="text-sm text-gray-600">Fatima Hassan has been located in Zone-B</p>
            </div>
            <div className="bg-blue-50 border-l-4 border-blue-600 p-4">
              <p className="font-semibold text-blue-800">💰 Compensation Ready</p>
              <p className="text-sm text-gray-600">$1,000 compensation is ready for claim</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
