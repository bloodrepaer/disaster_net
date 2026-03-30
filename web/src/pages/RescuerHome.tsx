import React, { useState } from 'react';
import { useAuthContext } from '../services/auth/authContext';

export function RescuerHome() {
  const { user, logout } = useAuthContext();
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-800">🚨 Rescue Worker Portal</h1>
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

      {/* Navigation Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 flex gap-8">
          {['dashboard', 'report', 'bundles', 'team'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-4 px-2 border-b-2 font-semibold transition ${
                activeTab === tab
                  ? 'border-orange-600 text-orange-600'
                  : 'border-transparent text-gray-600 hover:text-gray-800'
              }`}
            >
              {tab === 'dashboard' && '📊 Dashboard'}
              {tab === 'report' && '📝 Report'}
              {tab === 'bundles' && '📦 Bundles'}
              {tab === 'team' && '👥 Team'}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {activeTab === 'dashboard' && (
          <>
            <div className="grid md:grid-cols-4 gap-4 mb-8">
              <div className="bg-white rounded-lg shadow p-6">
                <p className="text-gray-600 text-sm font-semibold">RESCUE OPERATIONS</p>
                <p className="text-3xl font-bold text-orange-600 mt-2">24</p>
                <p className="text-xs text-gray-500 mt-2">Last 24 hours</p>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <p className="text-gray-600 text-sm font-semibold">PEOPLE RESCUED</p>
                <p className="text-3xl font-bold text-green-600 mt-2">156</p>
                <p className="text-xs text-gray-500 mt-2">This week</p>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <p className="text-gray-600 text-sm font-semibold">PENDING REPORTS</p>
                <p className="text-3xl font-bold text-yellow-600 mt-2">8</p>
                <p className="text-xs text-gray-500 mt-2">Awaiting verification</p>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <p className="text-gray-600 text-sm font-semibold">BUNDLES SUBMITTED</p>
                <p className="text-3xl font-bold text-blue-600 mt-2">12</p>
                <p className="text-xs text-gray-500 mt-2">Anchored on blockchain</p>
              </div>
            </div>

            {/* Recent Operations */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">🗺️ Recent Operations</h2>
              <div className="space-y-3">
                {[
                  { zone: 'Zone-A', status: 'Completed', people: 12 },
                  { zone: 'Zone-B', status: 'In Progress', people: 8 },
                  { zone: 'Zone-C', status: 'Pending', people: 5 },
                ].map((op, idx) => (
                  <div key={idx} className="flex items-center justify-between border-b pb-3">
                    <div>
                      <p className="font-semibold text-gray-800">{op.zone}</p>
                      <p className="text-sm text-gray-600">{op.people} people assisted</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                      op.status === 'Completed' ? 'bg-green-100 text-green-800' :
                      op.status === 'In Progress' ? 'bg-blue-100 text-blue-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {op.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {activeTab === 'report' && (
          <div className="bg-white rounded-lg shadow-lg p-8 max-w-2xl">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">📝 Submit Rescue Report</h2>
            <form className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Person Name *</label>
                <input
                  type="text"
                  placeholder="Full name"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-600"
                />
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Age *</label>
                  <input
                    type="number"
                    placeholder="Age"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-600"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Gender *</label>
                  <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-600">
                    <option>Select gender</option>
                    <option>Male</option>
                    <option>Female</option>
                    <option>Other</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Rescue Location *</label>
                <input
                  type="text"
                  placeholder="Zone / coordinates"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-600"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Condition *</label>
                <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-600">
                  <option>Select condition</option>
                  <option>Recovered</option>
                  <option>Critical</option>
                  <option>Injured</option>
                  <option>Stable</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Notes</label>
                <textarea
                  placeholder="Additional details..."
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-600"
                />
              </div>
              <button
                type="submit"
                className="w-full bg-orange-600 text-white py-3 rounded-lg hover:bg-orange-700 font-semibold"
              >
                Submit Report
              </button>
            </form>
          </div>
        )}

        {activeTab === 'bundles' && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">📦 Rescue Bundles</h2>
            <div className="space-y-3">
              {[
                { id: 'BUNDLE-001', size: 50, status: 'Anchored', hash: '0x7a3f...' },
                { id: 'BUNDLE-002', size: 45, status: 'Pending', hash: '-' },
              ].map((bundle) => (
                <div key={bundle.id} className="border rounded-lg p-4 flex justify-between items-center">
                  <div>
                    <p className="font-semibold text-gray-800">{bundle.id}</p>
                    <p className="text-sm text-gray-600">{bundle.size} records</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">Hash: {bundle.hash}</p>
                    <span className={`px-3 py-1 rounded text-sm font-semibold ${
                      bundle.status === 'Anchored' ? 'bg-green-100 text-green-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {bundle.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'team' && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">👥 Team Members</h2>
            <div className="grid md:grid-cols-3 gap-4">
              {[
                { name: 'Ahmed', role: 'Team Lead', status: 'Active' },
                { name: 'Sara', role: 'Rescuer', status: 'Active' },
                { name: 'Ali', role: 'Rescuer', status: 'On Break' },
              ].map((member) => (
                <div key={member.name} className="border rounded-lg p-4 text-center">
                  <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full mx-auto mb-3"></div>
                  <p className="font-semibold text-gray-800">{member.name}</p>
                  <p className="text-sm text-gray-600">{member.role}</p>
                  <span className={`inline-block mt-2 px-2 py-1 rounded text-xs font-semibold ${
                    member.status === 'Active' ? 'bg-green-100 text-green-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {member.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
