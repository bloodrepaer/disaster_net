import React, { useState } from 'react';
import { useAuthContext } from '../services/auth/authContext';

export function MedicHome() {
  const { user, logout } = useAuthContext();
  const [activeTab, setActiveTab] = useState('queue');

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-800">⚕️ Medical Portal</h1>
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
          {['queue', 'assessment', 'records', 'clearance'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-4 px-2 border-b-2 font-semibold transition ${
                activeTab === tab
                  ? 'border-green-600 text-green-600'
                  : 'border-transparent text-gray-600 hover:text-gray-800'
              }`}
            >
              {tab === 'queue' && '⏳ Triage Queue'}
              {tab === 'assessment' && '📋 Assessment'}
              {tab === 'records' && '📁 Records'}
              {tab === 'clearance' && '✅ Clearance'}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {activeTab === 'queue' && (
          <>
            <div className="grid md:grid-cols-4 gap-4 mb-8">
              <div className="bg-white rounded-lg shadow p-6">
                <p className="text-gray-600 text-sm font-semibold">URGENT (RED)</p>
                <p className="text-3xl font-bold text-red-600 mt-2">5</p>
                <p className="text-xs text-gray-500 mt-2">Immediate attention</p>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <p className="text-gray-600 text-sm font-semibold">MODERATE (YELLOW)</p>
                <p className="text-3xl font-bold text-yellow-600 mt-2">12</p>
                <p className="text-xs text-gray-500 mt-2">Waiting for assessment</p>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <p className="text-gray-600 text-sm font-semibold">MINOR (GREEN)</p>
                <p className="text-3xl font-bold text-green-600 mt-2">23</p>
                <p className="text-xs text-gray-500 mt-2">Can wait</p>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <p className="text-gray-600 text-sm font-semibold">CLEARED TODAY</p>
                <p className="text-3xl font-bold text-blue-600 mt-2">34</p>
                <p className="text-xs text-gray-500 mt-2">Medical clearance given</p>
              </div>
            </div>

            {/* Triage Queue */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">⏳ Triage Queue (Next: 5 Patients)</h2>
              <div className="space-y-3">
                {[
                  { name: 'Amina Ahmed', priority: 'URGENT', age: 35, arrival: '10:15 AM' },
                  { name: 'Hassan Ali', priority: 'URGENT', age: 42, arrival: '10:22 AM' },
                  { name: 'Leila Hassan', priority: 'MODERATE', age: 28, arrival: '10:48 AM' },
                  { name: 'Omar Mohamed', priority: 'MODERATE', age: 55, arrival: '11:05 AM' },
                  { name: 'Noor Ibrahim', priority: 'MINOR', age: 19, arrival: '11:32 AM' },
                ].map((patient, idx) => (
                  <div
                    key={idx}
                    className={`flex items-center justify-between p-4 rounded-lg border-l-4 ${
                      patient.priority === 'URGENT' ? 'bg-red-50 border-red-600' :
                      patient.priority === 'MODERATE' ? 'bg-yellow-50 border-yellow-600' :
                      'bg-green-50 border-green-600'
                    }`}
                  >
                    <div>
                      <p className="font-semibold text-gray-800">#{idx + 1} {patient.name}</p>
                      <p className="text-sm text-gray-600">Age: {patient.age} | Arrival: {patient.arrival}</p>
                    </div>
                    <div className="flex gap-2">
                      <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                        patient.priority === 'URGENT' ? 'bg-red-100 text-red-800' :
                        patient.priority === 'MODERATE' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {patient.priority}
                      </span>
                      <button className="bg-green-600 text-white px-4 py-1 rounded hover:bg-green-700 text-sm font-semibold">
                        Start Assessment
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {activeTab === 'assessment' && (
          <div className="bg-white rounded-lg shadow-lg p-8 max-w-3xl">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">📋 Medical Assessment Form</h2>
            <form className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="font-semibold text-blue-900">Current Patient: Amina Ahmed (35F)</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Injury Type *</label>
                <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600">
                  <option>Select injury type</option>
                  <option>Fracture</option>
                  <option>Laceration</option>
                  <option>Burn</option>
                  <option>Internal Injury</option>
                  <option>Other</option>
                </select>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Blood Pressure *</label>
                  <input
                    type="text"
                    placeholder="120/80 mmHg"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Heart Rate *</label>
                  <input
                    type="text"
                    placeholder="80 bpm"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Temperature *</label>
                  <input
                    type="text"
                    placeholder="98.6°F"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">O2 Saturation *</label>
                  <input
                    type="text"
                    placeholder="98%"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Clinical Notes</label>
                <textarea
                  placeholder="Detailed clinical observations..."
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Recommended Action *</label>
                <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600">
                  <option>Select action</option>
                  <option>Discharge</option>
                  <option>Send to Hospital</option>
                  <option>Observation</option>
                  <option>Emergency Care</option>
                </select>
              </div>

              <div className="flex gap-4">
                <button
                  type="submit"
                  className="flex-1 bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 font-semibold"
                >
                  Complete Assessment
                </button>
                <button
                  type="button"
                  className="flex-1 bg-gray-600 text-white py-3 rounded-lg hover:bg-gray-700 font-semibold"
                >
                  Save as Draft
                </button>
              </div>
            </form>
          </div>
        )}

        {activeTab === 'records' && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">📁 Patient Records</h2>
            <div className="space-y-3">
              <div className="border rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-semibold text-gray-800">Amina Ahmed - ID: 00234</p>
                    <p className="text-sm text-gray-600">Age: 35F | Admitted: Mar 21, 2026</p>
                  </div>
                  <button className="text-blue-600 hover:underline font-semibold">View Full Record</button>
                </div>
                <div className="text-sm text-gray-600">
                  <p><span className="font-semibold">Primary Injury:</span> Head trauma</p>
                  <p><span className="font-semibold">Status:</span> <span className="text-green-600 font-semibold">Stable</span></p>
                </div>
              </div>

              <div className="border rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-semibold text-gray-800">Hassan Ali - ID: 00235</p>
                    <p className="text-sm text-gray-600">Age: 42M | Admitted: Mar 21, 2026</p>
                  </div>
                  <button className="text-blue-600 hover:underline font-semibold">View Full Record</button>
                </div>
                <div className="text-sm text-gray-600">
                  <p><span className="font-semibold">Primary Injury:</span> Fracture - left leg</p>
                  <p><span className="font-semibold">Status:</span> <span className="text-yellow-600 font-semibold">Monitoring</span></p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'clearance' && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">✅ Medical Clearance Certificates</h2>
            <div className="space-y-3">
              {[
                { name: 'Fatima Hassan', date: 'Mar 21, 2026', status: 'Cleared' },
                { name: 'Ahmed Ibrahim', date: 'Mar 20, 2026', status: 'Cleared' },
                { name: 'Noor Mohamed', date: 'Mar 20, 2026', status: 'Cleared' },
              ].map((cert, idx) => (
                <div key={idx} className="border rounded-lg p-4 bg-green-50">
                  <div className="flex justify-between items-center mb-2">
                    <div>
                      <p className="font-semibold text-gray-800">{cert.name}</p>
                      <p className="text-sm text-gray-600">Cleared on: {cert.date}</p>
                    </div>
                    <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-semibold">
                      ✓ {cert.status}
                    </span>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <button className="text-blue-600 hover:underline text-sm font-semibold">Download Certificate</button>
                    <button className="text-gray-600 hover:underline text-sm">View Details</button>
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
