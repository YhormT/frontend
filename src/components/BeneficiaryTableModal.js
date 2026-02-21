import React, { useState } from 'react';
import { X, Plus, Trash2, Table2 } from 'lucide-react';

const BeneficiaryTableModal = ({ isOpen, onClose }) => {
  const [entries, setEntries] = useState([]);
  const [formData, setFormData] = useState({
    beneficiaryNumber: '',
    minutes: '',
    sms: '',
    dataSize: '',
    processingReport: '',
    uploadedDateTime: ''
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.beneficiaryNumber.trim()) return;
    
    const newEntry = {
      id: Date.now(),
      ...formData,
      uploadedDateTime: formData.uploadedDateTime || new Date().toLocaleString()
    };
    
    setEntries(prev => [newEntry, ...prev]);
    setFormData({
      beneficiaryNumber: '',
      minutes: '',
      sms: '',
      dataSize: '',
      processingReport: '',
      uploadedDateTime: ''
    });
  };

  const handleDelete = (id) => {
    setEntries(prev => prev.filter(entry => entry.id !== id));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Table2 className="w-6 h-6 text-white" />
            <h2 className="text-lg font-bold text-white">Beneficiary Records</h2>
          </div>
          <button onClick={onClose} className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors">
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="p-4 bg-gray-50 border-b border-gray-200">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Beneficiary Number</label>
              <input
                type="text"
                name="beneficiaryNumber"
                value={formData.beneficiaryNumber}
                onChange={handleInputChange}
                placeholder="233XXXXXXXXX"
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-800 placeholder-gray-400 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Minutes</label>
              <input
                type="text"
                name="minutes"
                value={formData.minutes}
                onChange={handleInputChange}
                placeholder="0 Minutes"
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-800 placeholder-gray-400 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">SMS</label>
              <input
                type="text"
                name="sms"
                value={formData.sms}
                onChange={handleInputChange}
                placeholder="0 SMS"
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-800 placeholder-gray-400 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Data Size</label>
              <input
                type="text"
                name="dataSize"
                value={formData.dataSize}
                onChange={handleInputChange}
                placeholder="1 GB"
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-800 placeholder-gray-400 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Processing Report</label>
              <input
                type="text"
                name="processingReport"
                value={formData.processingReport}
                onChange={handleInputChange}
                placeholder="Validating..."
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-800 placeholder-gray-400 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Date & Time</label>
              <input
                type="datetime-local"
                name="uploadedDateTime"
                value={formData.uploadedDateTime}
                onChange={handleInputChange}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-800 placeholder-gray-400 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 focus:outline-none"
              />
            </div>
          </div>
          <div className="mt-3 flex justify-end">
            <button
              type="submit"
              className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Entry
            </button>
          </div>
        </form>

        {/* Table */}
        <div className="flex-1 overflow-auto">
          <table className="w-full">
            <thead className="bg-gray-100 sticky top-0">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-b border-gray-200">Beneficiary Number</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-b border-gray-200">Minutes</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-b border-gray-200">SMS</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-b border-gray-200">Data Size</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-b border-gray-200">Processing Report</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-b border-gray-200">Uploaded Date & Time</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider border-b border-gray-200">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {entries.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-4 py-12 text-center text-gray-400">
                    <Table2 className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p>No entries yet. Add a beneficiary record above.</p>
                  </td>
                </tr>
              ) : (
                entries.map((entry, index) => (
                  <tr key={entry.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-4 py-3 text-sm text-gray-800 font-medium">
                      <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded">
                        {entry.beneficiaryNumber}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{entry.minutes || '0 Minutes'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{entry.sms || '0 SMS'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{entry.dataSize || '-'}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        entry.processingReport?.toLowerCase().includes('yes') || entry.processingReport?.toLowerCase().includes('success')
                          ? 'bg-green-100 text-green-700'
                          : entry.processingReport?.toLowerCase().includes('validating')
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {entry.processingReport || 'Validating...'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {entry.uploadedDateTime ? new Date(entry.uploadedDateTime).toLocaleString() : '-'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleDelete(entry.id)}
                        className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        {entries.length > 0 && (
          <div className="p-3 bg-gray-50 border-t border-gray-200 flex justify-between items-center">
            <span className="text-sm text-gray-500">{entries.length} record(s)</span>
            <button
              onClick={() => setEntries([])}
              className="text-sm text-red-500 hover:text-red-600 font-medium"
            >
              Clear All
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default BeneficiaryTableModal;
