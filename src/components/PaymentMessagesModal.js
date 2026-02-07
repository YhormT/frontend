import React, { useState, useEffect, useRef } from 'react';
import { X, Search, RefreshCw, Loader2, Check, ChevronLeft, ChevronRight, BadgeCent } from 'lucide-react';
import axios from 'axios';
import { toast } from 'react-toastify';
import BASE_URL from '../endpoints/endpoints';

const PaymentMessagesModal = ({ isOpen, onClose }) => {
  const [paymentData, setPaymentData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;
  const prevDataRef = useRef([]);

  const fetchMessages = async (showToast = false) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${BASE_URL}/api/sms/payment-received`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const newData = response.data?.data || [];

      const oldIds = new Set(prevDataRef.current.map(d => d.id));
      const newMessages = newData.filter(msg => !oldIds.has(msg.id));

      if (newMessages.length > 0 && showToast && prevDataRef.current.length > 0) {
        toast.info(`${newMessages.length} new payment message(s) received`);
      }

      setPaymentData(newData);
      prevDataRef.current = newData;
    } catch (error) {
      console.error('Error fetching payment messages:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchMessages(false);
    }
  }, [isOpen]);

  useEffect(() => {
    let intervalId;
    if (isOpen) {
      intervalId = setInterval(() => fetchMessages(true), 30000);
    }
    return () => clearInterval(intervalId);
  }, [isOpen]);

  const handleMarkProcessed = async (smsId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${BASE_URL}/api/sms/${smsId}/mark-processed`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Marked as processed!');
      setPaymentData(prev => prev.map(item => 
        item.id === smsId ? { ...item, isProcessed: true } : item
      ));
    } catch (error) {
      console.error('Error marking as processed:', error);
      toast.error('Failed to mark as processed');
    }
  };

  const filteredData = paymentData.filter(item => 
    !searchTerm || item.reference?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.message?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const paginatedData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const truncateMessage = (message, limit = 60) => {
    if (!message || message.length <= limit) return message;
    return message.slice(0, limit) + '...';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-dark-800 border border-dark-700 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-500 to-green-600 p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BadgeCent className="w-8 h-8 text-white" />
            <div>
              <h2 className="text-xl font-bold text-white">Payment Messages</h2>
              <p className="text-emerald-100 text-sm">{filteredData.length} messages</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 bg-white/20 hover:bg-white/30 rounded-lg">
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Filters */}
        <div className="p-4 border-b border-dark-700 flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              placeholder="Search by reference or message..."
              className="w-full bg-dark-900/50 border border-dark-600 rounded-xl pl-10 pr-4 py-2 text-white placeholder-dark-500 focus:border-emerald-500 focus:outline-none"
            />
          </div>
          <button onClick={() => fetchMessages(false)} className="p-2 bg-dark-700 hover:bg-dark-600 rounded-xl text-dark-300">
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto p-4">
          {loading && paymentData.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
            </div>
          ) : paginatedData.length === 0 ? (
            <div className="text-center py-12">
              <BadgeCent className="w-12 h-12 text-dark-600 mx-auto mb-4" />
              <p className="text-dark-400">No payment messages found</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="sticky top-0 bg-dark-800">
                <tr className="text-left text-dark-400 text-sm border-b border-dark-700">
                  <th className="pb-3 pr-4 font-medium w-32">Reference</th>
                  <th className="pb-3 px-4 font-medium text-right w-28">Amount</th>
                  <th className="pb-3 px-4 font-medium flex-1">Message</th>
                  <th className="pb-3 px-4 font-medium text-center w-24">Processed</th>
                  <th className="pb-3 pl-4 font-medium text-center w-28">Action</th>
                </tr>
              </thead>
              <tbody>
                {paginatedData.map((sms) => (
                  <tr key={sms.id} className="border-b border-dark-700/50 hover:bg-dark-700/30 transition-colors">
                    <td className="py-3 pr-4 text-white font-medium">{sms.reference || 'N/A'}</td>
                    <td className="py-3 px-4 text-right text-emerald-400 font-bold whitespace-nowrap">GHS {sms.amount || 0}</td>
                    <td className="py-3 px-4 text-dark-300 text-sm max-w-md">{truncateMessage(sms.message)}</td>
                    <td className="py-3 px-4 text-center">
                      {sms.isProcessed ? (
                        <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 rounded-full text-xs font-medium">Yes</span>
                      ) : (
                        <span className="px-3 py-1 bg-red-500/10 text-red-400 rounded-full text-xs font-medium">No</span>
                      )}
                    </td>
                    <td className="py-3 pl-4 text-center">
                      <button
                        onClick={() => handleMarkProcessed(sms.id)}
                        disabled={sms.isProcessed}
                        className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                          sms.isProcessed
                            ? 'bg-dark-700 text-dark-500 cursor-not-allowed'
                            : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                        }`}
                      >
                        <Check className="w-4 h-4 inline mr-1" />
                        {sms.isProcessed ? 'Done' : 'Mark Done'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-dark-700 flex items-center justify-between">
            <p className="text-dark-400 text-sm">
              Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredData.length)} of {filteredData.length}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 bg-dark-700 hover:bg-dark-600 rounded-lg text-dark-300 disabled:opacity-50"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="px-4 py-2 text-white">Page {currentPage} of {totalPages}</span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-2 bg-dark-700 hover:bg-dark-600 rounded-lg text-dark-300 disabled:opacity-50"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentMessagesModal;
