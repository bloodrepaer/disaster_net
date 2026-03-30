import React, { useState } from 'react';
import { useAuthContext } from '../services/auth/authContext';

export function OrgHome() {
  const { user, logout } = useAuthContext();
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-800">🏛️ Organization Operations Center</h1>
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
        <div className="max-w-7xl mx-auto px-4 flex gap-8 overflow-x-auto">
          {['overview', 'metrics', 'blockchain', 'funds', 'audit', 'volunteers'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-4 px-2 border-b-2 font-semibold transition whitespace-nowrap ${
                activeTab === tab
                  ? 'border-purple-600 text-purple-600'
                  : 'border-transparent text-gray-600 hover:text-gray-800'
              }`}
            >
              {tab === 'overview' && '📊 Overview'}
              {tab === 'metrics' && '📈 Metrics'}
              {tab === 'blockchain' && '⛓️ Blockchain'}
              {tab === 'funds' && '💰 Funds'}
              {tab === 'audit' && '🔍 Audit'}
              {tab === 'volunteers' && '👥 Volunteers'}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {activeTab === 'overview' && (
          <>
            <div className="grid md:grid-cols-6 gap-4 mb-8">
              <div className="bg-white rounded-lg shadow p-6">
                <p className="text-gray-600 text-sm font-semibold">TOTAL VICTIMS</p>
                <p className="text-3xl font-bold text-gray-800 mt-2">2,847</p>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <p className="text-gray-600 text-sm font-semibold">PEOPLE RESCUED</p>
                <p className="text-3xl font-bold text-green-600 mt-2">1,923</p>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <p className="text-gray-600 text-sm font-semibold">DECEASED</p>
                <p className="text-3xl font-bold text-red-600 mt-2">324</p>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <p className="text-gray-600 text-sm font-semibold">MISSING</p>
                <p className="text-3xl font-bold text-yellow-600 mt-2">600</p>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <p className="text-gray-600 text-sm font-semibold">COMPENSATION PAID</p>
                <p className="text-2xl font-bold text-blue-600 mt-2">$1.2M</p>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <p className="text-gray-600 text-sm font-semibold">ACTIVE WORKERS</p>
                <p className="text-3xl font-bold text-purple-600 mt-2">387</p>
              </div>
            </div>

            {/* Key Metrics Cards */}
            <div className="grid md:grid-cols-2 gap-6 mb-8">
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-4">🎯 Operation Status</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-gray-700">Rescue Operations</span>
                    <span className="text-2xl font-bold text-green-600">94%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-green-600 h-2 rounded-full" style={{ width: '94%' }}></div>
                  </div>

                  <div className="flex justify-between items-center mt-4">
                    <span className="font-semibold text-gray-700">Medical Assessment</span>
                    <span className="text-2xl font-bold text-blue-600">87%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-blue-600 h-2 rounded-full" style={{ width: '87%' }}></div>
                  </div>

                  <div className="flex justify-between items-center mt-4">
                    <span className="font-semibold text-gray-700">Compensation Claims</span>
                    <span className="text-2xl font-bold text-purple-600">76%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-purple-600 h-2 rounded-full" style={{ width: '76%' }}></div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-lg p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-4">⏰ Timeline</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-red-600 rounded-full"></div>
                    <div>
                      <p className="font-semibold text-gray-700">Disaster Strike</p>
                      <p className="text-sm text-gray-500">Mar 17, 2026 - 2:45 PM</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-orange-600 rounded-full"></div>
                    <div>
                      <p className="font-semibold text-gray-700">Emergency Response</p>
                      <p className="text-sm text-gray-500">Mar 17, 2026 - 6:20 PM</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
                    <div>
                      <p className="font-semibold text-gray-700">Full Operations</p>
                      <p className="text-sm text-gray-500">Mar 18, 2026 - 8:00 AM</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-green-600 rounded-full"></div>
                    <div>
                      <p className="font-semibold text-gray-700">Recovery Phase</p>
                      <p className="text-sm text-gray-500">Mar 21, 2026 - Ongoing</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === 'metrics' && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-6">📈 Performance Metrics</h2>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="border-l-4 border-blue-600 pl-4">
                <p className="text-gray-600 text-sm font-semibold">RESPONSE TIME (AVG)</p>
                <p className="text-3xl font-bold text-blue-600">4.2 hrs</p>
                <p className="text-xs text-gray-500 mt-1">From report to rescue</p>
              </div>
              <div className="border-l-4 border-green-600 pl-4">
                <p className="text-gray-600 text-sm font-semibold">RESCUE SUCCESS RATE</p>
                <p className="text-3xl font-bold text-green-600">67.6%</p>
                <p className="text-xs text-gray-500 mt-1">Of reported missing</p>
              </div>
              <div className="border-l-4 border-orange-600 pl-4">
                <p className="text-gray-600 text-sm font-semibold">MEDICAL CLEARANCE TIME</p>
                <p className="text-3xl font-bold text-orange-600">2.1 hrs</p>
                <p className="text-xs text-gray-500 mt-1">From triage to assessment</p>
              </div>
            </div>

            <div className="mt-8 bg-gray-50 rounded-lg p-6">
              <h3 className="font-semibold text-gray-800 mb-4">Daily Progress</h3>
              <div className="space-y-3">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, idx) => (
                  <div key={idx} className="flex items-center gap-4">
                    <div className="w-12 text-right font-semibold text-gray-700">{day}</div>
                    <div className="flex-1 bg-gray-200 rounded-full h-6 relative overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-blue-500 to-blue-600 h-full rounded-full flex items-center justify-center text-white text-xs font-semibold"
                        style={{ width: `${60 + Math.random() * 30}%` }}
                      >
                        {65 + Math.floor(Math.random() * 30)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'blockchain' && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-6">⛓️ Blockchain Status</h2>
            <div className="grid md:grid-cols-3 gap-6 mb-8">
              <div className="bg-green-50 rounded-lg p-6 border border-green-200">
                <p className="text-green-800 font-semibold">STARKNET STATUS</p>
                <p className="text-2xl font-bold text-green-600 mt-2">🟢 Active</p>
                <p className="text-sm text-gray-600 mt-2">Bundles Anchored: 47</p>
              </div>
              <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
                <p className="text-blue-800 font-semibold">RONIN STATUS</p>
                <p className="text-2xl font-bold text-blue-600 mt-2">🟢 Active</p>
                <p className="text-sm text-gray-600 mt-2">Compensation Processed: $1.2M</p>
              </div>
              <div className="bg-purple-50 rounded-lg p-6 border border-purple-200">
                <p className="text-purple-800 font-semibold">NETWORK HEALTH</p>
                <p className="text-2xl font-bold text-purple-600 mt-2">99.8%</p>
                <p className="text-sm text-gray-600 mt-2">Uptime this week</p>
              </div>
            </div>

            <h3 className="text-lg font-semibold text-gray-800 mb-4">Recent Anchored Bundles</h3>
            <div className="space-y-2">
              {[
                { id: 'BUNDLE-047', records: 52, hash: '0xf7a2...', time: '2 hours ago' },
                { id: 'BUNDLE-046', records: 48, hash: '0x3b8c...', time: '1 hour ago' },
                { id: 'BUNDLE-045', records: 55, hash: '0xe9f1...', time: '42 minutes ago' },
              ].map((bundle) => (
                <div key={bundle.id} className="border rounded p-4 flex justify-between items-center">
                  <div>
                    <p className="font-semibold text-gray-800">{bundle.id}</p>
                    <p className="text-sm text-gray-600">{bundle.records} records - {bundle.time}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600 font-mono">{bundle.hash}</p>
                    <button className="text-blue-600 hover:underline text-sm mt-1">View on Chain</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'funds' && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-6">💰 Compensation Fund Management</h2>
            <div className="grid md:grid-cols-3 gap-6 mb-8">
              <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
                <p className="text-gray-600 text-sm font-semibold">TOTAL FUND</p>
                <p className="text-2xl font-bold text-blue-600 mt-2">$5,000,000</p>
              </div>
              <div className="bg-green-50 rounded-lg p-6 border border-green-200">
                <p className="text-gray-600 text-sm font-semibold">DISTRIBUTED</p>
                <p className="text-2xl font-bold text-green-600 mt-2">$1,245,000</p>
              </div>
              <div className="bg-orange-50 rounded-lg p-6 border border-orange-200">
                <p className="text-gray-600 text-sm font-semibold">REMAINING</p>
                <p className="text-2xl font-bold text-orange-600 mt-2">$3,755,000</p>
              </div>
            </div>

            <h3 className="text-lg font-semibold text-gray-800 mb-4">Distribution Breakdown</h3>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="font-semibold text-gray-700">Deceased Families (Priority 1)</span>
                  <span className="text-gray-600">$850,000 (24.9%)</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div className="bg-red-600 h-3 rounded-full" style={{ width: '68%' }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <span className="font-semibold text-gray-700">Critically Injured (Priority 2)</span>
                  <span className="text-gray-600">$285,000 (8.3%)</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div className="bg-yellow-600 h-3 rounded-full" style={{ width: '23%' }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <span className="font-semibold text-gray-700">Moderately Injured (Priority 3)</span>
                  <span className="text-gray-600">$110,000 (3.2%)</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div className="bg-blue-600 h-3 rounded-full" style={{ width: '9%' }}></div>
                </div>
              </div>
            </div>

            <h3 className="text-lg font-semibold text-gray-800 mt-8 mb-4">Recent Compensation Claims</h3>
            <div className="space-y-2">
              {[
                { name: 'Ahmed Hassan', amount: '$12,500', status: 'Approved' },
                { name: 'Leila Ibrahim', amount: '$8,750', status: 'Processing' },
                { name: 'Noor Mohamed', amount: '$5,200', status: 'Approved' },
              ].map((claim, idx) => (
                <div key={idx} className="border rounded p-4 flex justify-between items-center">
                  <div>
                    <p className="font-semibold text-gray-800">{claim.name}</p>
                    <p className="text-sm text-gray-600">{claim.amount}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                    claim.status === 'Approved' ? 'bg-green-100 text-green-800' :
                    'bg-blue-100 text-blue-800'
                  }`}>
                    {claim.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'audit' && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-6">🔍 Audit Trail & Compliance</h2>
            <div className="space-y-3">
              {[
                { action: 'Bundle BUNDLE-047 anchored', user: 'rescuer@example.com', time: '2:34 PM', status: 'verified' },
                { action: 'Compensation claim approved', user: 'org@example.com', time: '1:12 PM', status: 'verified' },
                { action: 'Person record updated', user: 'medic@example.com', time: '12:45 PM', status: 'verified' },
                { action: 'Fund transfer initiated', user: 'org@example.com', time: '11:23 AM', status: 'verified' },
              ].map((log, idx) => (
                <div key={idx} className="border rounded-lg p-4 bg-gray-50">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-semibold text-gray-800">{log.action}</p>
                      <p className="text-sm text-gray-600">{log.user} • {log.time}</p>
                    </div>
                    <span className="bg-green-100 text-green-800 px-3 py-1 rounded text-xs font-semibold">
                      ✓ {log.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'volunteers' && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-6">👥 Volunteer Queue & Verification</h2>
            <div className="grid md:grid-cols-3 gap-4 mb-8">
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <p className="text-blue-800 font-semibold">PENDING VERIFICATION</p>
                <p className="text-2xl font-bold text-blue-600">24</p>
              </div>
              <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                <p className="text-green-800 font-semibold">VERIFIED</p>
                <p className="text-2xl font-bold text-green-600">387</p>
              </div>
              <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                <p className="text-red-800 font-semibold">REJECTED</p>
                <p className="text-2xl font-bold text-red-600">8</p>
              </div>
            </div>

            <h3 className="text-lg font-semibold text-gray-800 mb-4">Recent Volunteer Applications</h3>
            <div className="space-y-3">
              {[
                { name: 'Muhammad Ali', role: 'Rescuer', phone: '+964-123-4567', status: 'Pending' },
                { name: 'Sara Khalil', role: 'Medic', phone: '+964-234-5678', status: 'Verified' },
                { name: 'Omar Farooq', role: 'Coordinator', phone: '+964-345-6789', status: 'Pending' },
              ].map((vol, idx) => (
                <div key={idx} className="border rounded-lg p-4 flex justify-between items-center">
                  <div>
                    <p className="font-semibold text-gray-800">{vol.name}</p>
                    <p className="text-sm text-gray-600">{vol.role} • {vol.phone}</p>
                  </div>
                  <div className="flex gap-2">
                    {vol.status === 'Pending' && (
                      <>
                        <button className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700">
                          Approve
                        </button>
                        <button className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700">
                          Reject
                        </button>
                      </>
                    )}
                    {vol.status === 'Verified' && (
                      <span className="bg-green-100 text-green-800 px-3 py-1 rounded text-sm font-semibold">
                        ✓ Verified
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
