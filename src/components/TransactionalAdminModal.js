import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { X, ArrowRightLeft, Download, Search, Loader2, RefreshCw, Users, CheckCircle } from 'lucide-react';
import axios from 'axios';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';
import BASE_URL from '../endpoints/endpoints';

const formatAmount = (amount) => {
  const num = typeof amount === 'number' ? amount : (parseFloat(amount) || 0);
  return `GHS ${num.toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

// Helper function to format phone number
const formatPhoneNumber = (phone) => {
  if (!phone) return 'N/A';
  const phoneStr = String(phone).replace(/\D/g, '');
  if (phoneStr.startsWith('233') && phoneStr.length >= 12) {
    return '0' + phoneStr.slice(3, 12);
  }
  if (phoneStr.length === 10 && phoneStr.startsWith('0')) return phoneStr;
  if (phoneStr.length === 9) return '0' + phoneStr;
  return phoneStr;
};

const TransactionalAdminModal = ({ isOpen, onClose }) => {
  const [transactions, setTransactions] = useState([]);
  const [shopOrders, setShopOrders] = useState([]);
  const [allOrders, setAllOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [shopLoading, setShopLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('transactions');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [networkFilter, setNetworkFilter] = useState('');
  const [amountFilter, setAmountFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [shopPage, setShopPage] = useState(1);
  // Separate filters for shop orders
  const [shopFilters, setShopFilters] = useState({ name: '', phone: '', product: '', status: '', startDate: '', endDate: '' });
  // Referrals state
  const [referralData, setReferralData] = useState({ orders: [], stats: {}, agentSummary: [] });
  const [referralLoading, setReferralLoading] = useState(false);
  const [referralPage, setReferralPage] = useState(1);
  const [referralFilters, setReferralFilters] = useState({ agent: '', status: '', startDate: '', endDate: '' });
  const itemsPerPage = 50;

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const [txRes, ordersRes] = await Promise.all([
        axios.get(`${BASE_URL}/api/transactions?limit=999999`),
        axios.get(`${BASE_URL}/order/admin/allorder?limit=999999`)
      ]);
      if (txRes.data.success) {
        setTransactions(txRes.data.data || []);
      }
      // Extract orders data
      const ordersData = ordersRes.data?.data || ordersRes.data?.orders || [];
      setAllOrders(ordersData);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchShopOrders = useCallback(async () => {
    setShopLoading(true);
    try {
      const res = await axios.get(`${BASE_URL}/api/shop/orders`);
      if (res.data.success) {
        setShopOrders(res.data.orders || []);
      }
    } catch (error) {
      console.error('Error fetching shop orders:', error);
      setShopOrders([]);
    } finally {
      setShopLoading(false);
    }
  }, []);

  const fetchReferralOrders = useCallback(async () => {
    setReferralLoading(true);
    try {
      const params = new URLSearchParams();
      if (referralFilters.status) params.append('paymentStatus', referralFilters.status);
      if (referralFilters.startDate) params.append('startDate', referralFilters.startDate);
      if (referralFilters.endDate) params.append('endDate', referralFilters.endDate);
      
      const res = await axios.get(`${BASE_URL}/api/storefront/admin/referrals?${params.toString()}`);
      if (res.data.success) {
        setReferralData({
          orders: res.data.orders || [],
          stats: res.data.stats || {},
          agentSummary: res.data.agentSummary || []
        });
      }
    } catch (error) {
      console.error('Error fetching referral orders:', error);
      setReferralData({ orders: [], stats: {}, agentSummary: [] });
    } finally {
      setReferralLoading(false);
    }
  }, [referralFilters]);

  useEffect(() => {
    if (isOpen) {
      fetchTransactions();
    }
  }, [isOpen, fetchTransactions]);

  useEffect(() => {
    if (isOpen && activeTab === 'shop') fetchShopOrders();
  }, [isOpen, activeTab, fetchShopOrders]);

  useEffect(() => {
    if (isOpen && activeTab === 'referrals') fetchReferralOrders();
  }, [isOpen, activeTab, fetchReferralOrders]);

  const filteredTransactions = useMemo(() => {
    let filtered = transactions;
    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(tx => tx.user?.name?.toLowerCase().includes(searchLower) || tx.description?.toLowerCase().includes(searchLower));
    }
    if (typeFilter) filtered = filtered.filter(tx => tx.type === typeFilter);
    
    // Network filter - check description for network names
    if (networkFilter) {
      filtered = filtered.filter(tx => {
        const desc = (tx.description || '').toUpperCase();
        if (networkFilter === 'MTN') return desc.includes('MTN');
        if (networkFilter === 'AIRTELTIGO') return desc.includes('AIRTEL') || desc.includes('TIGO');
        if (networkFilter === 'TELECEL') return desc.includes('TELECEL') || desc.includes('VODAFONE');
        return true;
      });
    }
    
    // Amount filter - debits or credits only
    if (amountFilter === 'debits') {
      filtered = filtered.filter(tx => tx.amount < 0);
    } else if (amountFilter === 'credits') {
      filtered = filtered.filter(tx => tx.amount > 0);
    }
    
    if (startDate) {
      const start = new Date(startDate + 'T00:00:00');
      filtered = filtered.filter(tx => new Date(tx.createdAt) >= start);
    }
    if (endDate) {
      const end = new Date(endDate + 'T23:59:59.999');
      filtered = filtered.filter(tx => new Date(tx.createdAt) <= end);
    }
    return filtered;
  }, [transactions, search, typeFilter, networkFilter, amountFilter, startDate, endDate]);

  // Filter orders with same filters as transactions (search, network, date)
  const filteredOrders = useMemo(() => {
    let filtered = allOrders;
    
    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(order => {
        const productName = (order.product?.name || '').toLowerCase();
        const productDesc = (order.product?.description || '').toLowerCase();
        const userName = (order.user?.name || '').toLowerCase();
        const phoneNumber = (order.phoneNumber || '').toLowerCase();
        return productName.includes(searchLower) || productDesc.includes(searchLower) || userName.includes(searchLower) || phoneNumber.includes(searchLower);
      });
    }
    
    if (networkFilter) {
      filtered = filtered.filter(order => {
        const productName = (order.product?.name || '').toUpperCase();
        if (networkFilter === 'MTN') return productName.includes('MTN');
        if (networkFilter === 'AIRTELTIGO') return productName.includes('AIRTEL') || productName.includes('TIGO');
        if (networkFilter === 'TELECEL') return productName.includes('TELECEL') || productName.includes('VODAFONE');
        return true;
      });
    }
    
    if (startDate) {
      const start = new Date(startDate + 'T00:00:00');
      filtered = filtered.filter(order => {
        const d = new Date(order.order?.createdAt || order.createdAt);
        return d >= start;
      });
    }
    if (endDate) {
      const end = new Date(endDate + 'T23:59:59.999');
      filtered = filtered.filter(order => {
        const d = new Date(order.order?.createdAt || order.createdAt);
        return d <= end;
      });
    }
    
    return filtered;
  }, [allOrders, search, networkFilter, startDate, endDate]);

  const stats = useMemo(() => {
    // Transaction-level stats (for transactions tab)
    let txCredits = 0, txDebits = 0;
    filteredTransactions.forEach(tx => {
      if (tx.type === 'CANCELLED' || tx.description?.toLowerCase().includes('cancelled') || tx.description?.toLowerCase().includes('refund')) {
        return;
      }
      if (tx.amount > 0) txCredits += tx.amount;
      else txDebits += tx.amount;
    });
    
    // Revenue = quantity × price for all non-cancelled orders
    let revenue = 0;
    let revenueOrderCount = 0;
    let totalGB = 0;
    
    filteredOrders.forEach(order => {
      const status = (order.order?.items?.[0]?.status || order.status || '').toLowerCase();
      const price = order.product?.price || 0;
      const quantity = order.quantity || order.order?.items?.[0]?.quantity || 1;
      
      // Revenue: count all orders except cancelled
      if (status !== 'cancelled' && status !== 'canceled') {
        revenue += quantity * price;
        revenueOrderCount++;
      }
      
      // Total GB from completed agent orders only (exclude shop/storefront orders)
      if (status === 'completed') {
        const userEmail = (order.user?.email || '').toLowerCase();
        const userName = (order.user?.name || '').toLowerCase();
        const isShopOrder = userEmail.includes('shop@') || userName === 'shop';
        if (!isShopOrder) {
          const description = order.product?.description || '';
          const match = description.match(/(\d+(?:\.\d+)?)\s*GB/i);
          if (match) totalGB += parseFloat(match[1]);
        }
      }
    });
    
    // Expenses = only refunds and cancelled orders (quantity × price)
    let expenses = 0;
    let expenseCount = 0;
    filteredOrders.forEach(order => {
      const status = (order.order?.items?.[0]?.status || order.status || '').toLowerCase();
      if (status === 'cancelled' || status === 'canceled') {
        const price = order.product?.price || 0;
        const quantity = order.quantity || order.order?.items?.[0]?.quantity || 1;
        expenses += quantity * price;
        expenseCount++;
      }
    });
    
    const net = revenue - expenses;
    
    return { total: filteredTransactions.length, credits: txCredits, debits: txDebits, txNet: txCredits + txDebits, revenue, revenueOrderCount, expenses, expenseCount, net, totalGB };
  }, [filteredTransactions, filteredOrders]);

  const userSales = useMemo(() => {
    const salesMap = new Map();
    // Exclude cancelled orders from sales
    filteredTransactions
      .filter(tx => tx.type === 'ORDER' && !tx.description?.toLowerCase().includes('cancelled') && !tx.description?.toLowerCase().includes('refund'))
      .forEach(tx => {
        const name = tx.user?.name || 'Unknown';
        const existing = salesMap.get(name) || { name, orders: 0, total: 0 };
        existing.orders += 1;
        existing.total += Math.abs(tx.amount);
        salesMap.set(name, existing);
      });
    return Array.from(salesMap.values()).sort((a, b) => b.total - a.total);
  }, [filteredTransactions]);

  const exportToExcel = () => {
    const data = filteredTransactions.map(tx => ({
      Type: tx.type, User: tx.user?.name || 'Unknown', Amount: tx.amount,
      Balance: tx.balance, Description: tx.description, Date: new Date(tx.createdAt).toLocaleString()
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Transactions');
    XLSX.writeFile(wb, 'transactions.xlsx');
  };

  const getTypeColor = (type) => {
    const colors = {
      TOPUP_APPROVED: 'bg-emerald-500/20 text-emerald-400',
      TOPUP_REJECTED: 'bg-red-500/20 text-red-400',
      ORDER: 'bg-cyan-500/20 text-cyan-400',
      REFUND: 'bg-purple-500/20 text-purple-400',
      LOAN_DEDUCTION: 'bg-amber-500/20 text-amber-400',
      LOAN_STATUS: 'bg-orange-500/20 text-orange-400'
    };
    return colors[type] || 'bg-dark-700 text-dark-400';
  };

  const filteredShopOrders = useMemo(() => {
    let filtered = shopOrders;
    if (shopFilters.name) filtered = filtered.filter(o => o.customerName?.toLowerCase().includes(shopFilters.name.toLowerCase()));
    if (shopFilters.phone) filtered = filtered.filter(o => formatPhoneNumber(o.phone)?.includes(shopFilters.phone));
    if (shopFilters.product) filtered = filtered.filter(o => o.product?.toLowerCase().includes(shopFilters.product.toLowerCase()));
    if (shopFilters.status) filtered = filtered.filter(o => o.status?.toLowerCase() === shopFilters.status.toLowerCase());
    if (shopFilters.startDate && shopFilters.endDate) {
      const start = new Date(shopFilters.startDate); start.setHours(0,0,0,0);
      const end = new Date(shopFilters.endDate); end.setHours(23,59,59,999);
      filtered = filtered.filter(o => { const d = new Date(o.date); return d >= start && d <= end; });
    }
    return filtered;
  }, [shopOrders, shopFilters]);

  const shopStats = useMemo(() => {
    const completed = filteredShopOrders.filter(o => o.status?.toLowerCase() === 'completed');
    const totalAmount = filteredShopOrders.reduce((sum, o) => sum + (o.amount || 0), 0);
    let totalGB = 0;
    completed.forEach(o => {
      const desc = o.description || '';
      const match = desc.match(/(\d+(?:\.\d+)?)\s*GB/i);
      if (match) totalGB += parseFloat(match[1]);
    });
    return { total: filteredShopOrders.length, totalAmount, totalGB };
  }, [filteredShopOrders]);

  const tabs = [
    { id: 'transactions', name: 'Transactions' },
    { id: 'sales', name: 'Sales Summary' },
    { id: 'balance', name: 'Admin Balance Sheet' },
    { id: 'shop', name: 'Shop Orders' },
    { id: 'referrals', name: 'Referrals' }
  ];

  // Filter referral orders
  const filteredReferralOrders = useMemo(() => {
    let filtered = referralData.orders;
    if (referralFilters.agent) {
      filtered = filtered.filter(o => o.agent?.name?.toLowerCase().includes(referralFilters.agent.toLowerCase()));
    }
    return filtered;
  }, [referralData.orders, referralFilters.agent]);

  // Handle marking commissions as paid
  const handleMarkCommissionPaid = async (agentId, orderIds) => {
    try {
      await axios.post(`${BASE_URL}/api/storefront/admin/commissions/pay`, { agentId, orderIds });
      Swal.fire({ icon: 'success', title: 'Success', text: 'Commissions marked as paid', timer: 1500, background: '#1e293b', color: '#f1f5f9', showConfirmButton: false });
      fetchReferralOrders();
    } catch (error) {
      Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to mark commissions as paid', background: '#1e293b', color: '#f1f5f9' });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-dark-800 border border-dark-700 rounded-2xl shadow-2xl w-full max-w-6xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col">
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-4 sm:p-6 flex items-center justify-between">
              <div className="flex items-center gap-2 sm:gap-3">
                <ArrowRightLeft className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-white">Transactions</h2>
                  <p className="text-indigo-100 text-xs sm:text-sm">{stats.total} total</p>
                </div>
              </div>
              <div className="flex gap-1 sm:gap-2">
                <button onClick={exportToExcel} className="p-1.5 sm:p-2 bg-white/20 hover:bg-white/30 rounded-lg" title="Export"><Download className="w-4 h-4 sm:w-5 sm:h-5 text-white" /></button>
                <button onClick={fetchTransactions} className="p-1.5 sm:p-2 bg-white/20 hover:bg-white/30 rounded-lg">
                  <RefreshCw className={`w-4 h-4 sm:w-5 sm:h-5 text-white ${loading ? 'animate-spin' : ''}`} />
                </button>
                <button onClick={onClose} className="p-1.5 sm:p-2 bg-white/20 hover:bg-white/30 rounded-lg"><X className="w-4 h-4 sm:w-5 sm:h-5 text-white" /></button>
              </div>
            </div>

            {/* Tabs - Fixed width buttons */}
            <div className="flex p-3 sm:p-4 border-b border-dark-700 bg-dark-900/50">
              <div className="flex w-full bg-dark-700 rounded-xl p-1">
                {tabs.map(tab => (
                  <button key={tab.id} onClick={() => { setActiveTab(tab.id); setCurrentPage(1); }}
                    className={`flex-1 px-2 sm:px-4 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${activeTab === tab.id ? 'bg-indigo-500 text-white shadow-lg' : 'text-dark-300 hover:text-white hover:bg-dark-600'}`}>
                    {tab.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Stats and Filters - Only show for transactions, sales, balance tabs */}
            {activeTab !== 'shop' && activeTab !== 'referrals' && (
              <>
                {/* Stats - 2x2 grid on mobile, 5 cols on desktop */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-4 p-2 sm:p-4 bg-dark-900/30">
                  <div className="bg-dark-800 border border-dark-700 rounded-xl p-2 sm:p-4">
                    <p className="text-dark-400 text-xs sm:text-sm">Total</p>
                    <p className="text-lg sm:text-xl font-bold text-white">{stats.total}</p>
                  </div>
                  <div className="bg-dark-800 border border-emerald-500/30 rounded-xl p-2 sm:p-4">
                    <p className="text-emerald-400 text-xs sm:text-sm">Credits</p>
                    <p className="text-sm sm:text-xl font-bold text-emerald-400">{formatAmount(stats.credits)}</p>
                  </div>
                  <div className="bg-dark-800 border border-red-500/30 rounded-xl p-2 sm:p-4">
                    <p className="text-red-400 text-xs sm:text-sm">Debits</p>
                    <p className="text-sm sm:text-xl font-bold text-red-400">{formatAmount(Math.abs(stats.debits))}</p>
                  </div>
                  <div className="bg-dark-800 border border-cyan-500/30 rounded-xl p-2 sm:p-4">
                    <p className="text-cyan-400 text-xs sm:text-sm">Net</p>
                    <p className={`text-sm sm:text-xl font-bold ${stats.txNet >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{formatAmount(stats.txNet)}</p>
                  </div>
                  <div className="bg-dark-800 border border-orange-500/30 rounded-xl p-2 sm:p-4">
                    <p className="text-orange-400 text-xs sm:text-sm">Total GB</p>
                    <p className="text-sm sm:text-xl font-bold text-orange-400">{stats.totalGB.toFixed(2)} GB</p>
                  </div>
                </div>

                {/* Filters - Stack on mobile */}
                <div className="flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-4 p-2 sm:p-4 border-b border-dark-700">
                  <div className="relative flex-1 min-w-0 sm:min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-dark-400" />
                    <input type="text" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)}
                      className="w-full bg-dark-900 border border-dark-600 rounded-lg pl-9 sm:pl-10 pr-4 py-2 text-sm sm:text-base text-white placeholder-dark-500 focus:border-indigo-500 focus:outline-none" />
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}
                      className="flex-1 sm:flex-none bg-dark-900 border border-dark-600 rounded-lg px-3 sm:px-4 py-2 text-sm sm:text-base text-white focus:border-indigo-500 focus:outline-none">
                      <option value="">All Types</option>
                      <option value="ORDER">Order</option>
                      <option value="TOPUP_APPROVED">Top-up</option>
                      <option value="REFUND">Refund</option>
                      <option value="LOAN_DEDUCTION">Loan Deduction</option>
                      <option value="LOAN_STATUS">Loan Status</option>
                    </select>
                    <select value={networkFilter} onChange={(e) => setNetworkFilter(e.target.value)}
                      className="flex-1 sm:flex-none bg-dark-900 border border-dark-600 rounded-lg px-3 sm:px-4 py-2 text-sm sm:text-base text-white focus:border-indigo-500 focus:outline-none">
                      <option value="">All Networks</option>
                      <option value="MTN">MTN</option>
                      <option value="AIRTELTIGO">AirtelTigo</option>
                      <option value="TELECEL">Telecel</option>
                    </select>
                    <select value={amountFilter} onChange={(e) => setAmountFilter(e.target.value)}
                      className="flex-1 sm:flex-none bg-dark-900 border border-dark-600 rounded-lg px-3 sm:px-4 py-2 text-sm sm:text-base text-white focus:border-indigo-500 focus:outline-none">
                      <option value="">All Amounts</option>
                      <option value="credits">Credits Only</option>
                      <option value="debits">Debits Only</option>
                    </select>
                    <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
                      className="flex-1 sm:flex-none bg-dark-900 border border-dark-600 rounded-lg px-2 sm:px-4 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none" />
                    <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
                      className="flex-1 sm:flex-none bg-dark-900 border border-dark-600 rounded-lg px-2 sm:px-4 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none" />
                  </div>
                </div>
              </>
            )}

            {/* Content */}
            <div className="p-4 overflow-y-auto flex-1">
              {loading ? (
                <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>
              ) : activeTab === 'transactions' ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-dark-900 sticky top-0">
                      <tr className="text-left text-dark-400 text-sm">
                        <th className="px-4 py-3">Type</th>
                        <th className="px-4 py-3">User</th>
                        <th className="px-4 py-3">Description</th>
                        <th className="px-4 py-3">Amount</th>
                        <th className="px-4 py-3">Balance</th>
                        <th className="px-4 py-3">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTransactions.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((tx, i) => (
                        <tr key={tx.id || i} className="border-t border-dark-700 hover:bg-dark-800/50">
                          <td className="px-4 py-3"><span className={`px-2 py-1 rounded text-xs font-medium ${getTypeColor(tx.type)}`}>{tx.type}</span></td>
                          <td className="px-4 py-3 text-white">{tx.user?.name || 'Unknown'}</td>
                          <td className="px-4 py-3 text-dark-300 max-w-xs truncate">{tx.description}</td>
                          <td className={`px-4 py-3 font-medium ${tx.amount >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{formatAmount(tx.amount)}</td>
                          <td className="px-4 py-3 text-white">{formatAmount(tx.balance)}</td>
                          <td className="px-4 py-3 text-dark-400 text-sm">{new Date(tx.createdAt).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {/* Pagination */}
                  {filteredTransactions.length > itemsPerPage && (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4 pt-4 border-t border-dark-700">
                      <p className="text-dark-400 text-sm">Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredTransactions.length)} of {filteredTransactions.length}</p>
                      <div className="flex items-center gap-2">
                        <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1} className="px-3 py-1.5 bg-dark-700 hover:bg-dark-600 text-dark-300 rounded-lg text-sm disabled:opacity-50">First</button>
                        <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-3 py-1.5 bg-dark-700 hover:bg-dark-600 text-dark-300 rounded-lg text-sm disabled:opacity-50">Prev</button>
                        <span className="px-4 py-1.5 bg-indigo-500 text-white rounded-lg text-sm font-medium">Page {currentPage} of {Math.ceil(filteredTransactions.length / itemsPerPage)}</span>
                        <button onClick={() => setCurrentPage(p => Math.min(Math.ceil(filteredTransactions.length / itemsPerPage), p + 1))} disabled={currentPage >= Math.ceil(filteredTransactions.length / itemsPerPage)} className="px-3 py-1.5 bg-dark-700 hover:bg-dark-600 text-dark-300 rounded-lg text-sm disabled:opacity-50">Next</button>
                        <button onClick={() => setCurrentPage(Math.ceil(filteredTransactions.length / itemsPerPage))} disabled={currentPage >= Math.ceil(filteredTransactions.length / itemsPerPage)} className="px-3 py-1.5 bg-dark-700 hover:bg-dark-600 text-dark-300 rounded-lg text-sm disabled:opacity-50">Last</button>
                      </div>
                    </div>
                  )}
                </div>
              ) : activeTab === 'sales' ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-dark-900">
                      <tr className="text-left text-dark-400 text-sm">
                        <th className="px-4 py-3">User</th>
                        <th className="px-4 py-3">Orders</th>
                        <th className="px-4 py-3">Total Sales</th>
                        <th className="px-4 py-3">Avg Order</th>
                      </tr>
                    </thead>
                    <tbody>
                      {userSales.map((user, i) => (
                        <tr key={i} className="border-t border-dark-700 hover:bg-dark-800/50">
                          <td className="px-4 py-3 text-white font-medium">{user.name}</td>
                          <td className="px-4 py-3 text-dark-300">{user.orders}</td>
                          <td className="px-4 py-3 text-cyan-400 font-semibold">{formatAmount(user.total)}</td>
                          <td className="px-4 py-3 text-dark-300">{formatAmount(user.total / user.orders)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : activeTab === 'balance' ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-dark-900/50 border border-emerald-500/30 rounded-xl p-6">
                    <h3 className="text-emerald-400 font-semibold mb-4">Revenue</h3>
                    <p className="text-3xl font-bold text-white">{formatAmount(stats.revenue)}</p>
                    <p className="text-dark-400 text-sm mt-2">From {stats.revenueOrderCount} orders</p>
                  </div>
                  <div className="bg-dark-900/50 border border-red-500/30 rounded-xl p-6">
                    <h3 className="text-red-400 font-semibold mb-4">Expenses</h3>
                    <p className="text-3xl font-bold text-white">{formatAmount(stats.expenses)}</p>
                    <p className="text-dark-400 text-sm mt-2">From {stats.expenseCount} refunds/cancellations</p>
                  </div>
                  <div className="bg-dark-900/50 border border-cyan-500/30 rounded-xl p-6">
                    <h3 className="text-cyan-400 font-semibold mb-4">Net Position</h3>
                    <p className={`text-3xl font-bold ${stats.net >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{formatAmount(stats.net)}</p>
                    <p className="text-dark-400 text-sm mt-2">Revenue minus expenses</p>
                  </div>
                </div>
              ) : activeTab === 'shop' ? (
                /* Shop Orders Tab - With its own filters and stats */
                <div>
                  <h3 className="text-lg font-bold text-white mb-4">Shop Orders</h3>
                  
                  {/* Shop-specific Filters */}
                  <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 mb-4">
                    <input type="text" placeholder="Customer name..." value={shopFilters.name} onChange={(e) => setShopFilters(s => ({ ...s, name: e.target.value }))}
                      className="bg-dark-900 border border-dark-600 rounded-lg px-3 py-2 text-sm text-white placeholder-dark-500 focus:border-indigo-500 focus:outline-none" />
                    <input type="text" placeholder="Phone..." value={shopFilters.phone} onChange={(e) => setShopFilters(s => ({ ...s, phone: e.target.value }))}
                      className="bg-dark-900 border border-dark-600 rounded-lg px-3 py-2 text-sm text-white placeholder-dark-500 focus:border-indigo-500 focus:outline-none" />
                    <input type="text" placeholder="Product..." value={shopFilters.product} onChange={(e) => setShopFilters(s => ({ ...s, product: e.target.value }))}
                      className="bg-dark-900 border border-dark-600 rounded-lg px-3 py-2 text-sm text-white placeholder-dark-500 focus:border-indigo-500 focus:outline-none" />
                    <select value={shopFilters.status} onChange={(e) => setShopFilters(s => ({ ...s, status: e.target.value }))}
                      className="bg-dark-900 border border-dark-600 rounded-lg px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none">
                      <option value="">All Status</option>
                      <option value="Pending">Pending</option>
                      <option value="Processing">Processing</option>
                      <option value="Completed">Completed</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>
                    <input type="date" value={shopFilters.startDate} onChange={(e) => setShopFilters(s => ({ ...s, startDate: e.target.value }))}
                      className="bg-dark-900 border border-dark-600 rounded-lg px-2 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none" />
                    <input type="date" value={shopFilters.endDate} onChange={(e) => setShopFilters(s => ({ ...s, endDate: e.target.value }))}
                      className="bg-dark-900 border border-dark-600 rounded-lg px-2 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none" />
                  </div>
                  
                  {/* Shop-specific Stats */}
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="bg-dark-900/50 border border-cyan-500/30 rounded-xl p-4">
                      <p className="text-cyan-400 text-sm">Total Orders</p>
                      <p className="text-2xl font-bold text-white">{shopStats.total}</p>
                    </div>
                    <div className="bg-dark-900/50 border border-emerald-500/30 rounded-xl p-4">
                      <p className="text-emerald-400 text-sm">Total Amount</p>
                      <p className="text-2xl font-bold text-emerald-400">{formatAmount(shopStats.totalAmount)}</p>
                    </div>
                    <div className="bg-dark-900/50 border border-orange-500/30 rounded-xl p-4">
                      <p className="text-orange-400 text-sm">Total GB Data (Completed)</p>
                      <p className="text-2xl font-bold text-orange-400">{shopStats.totalGB.toFixed(2)} GB</p>
                    </div>
                  </div>
                  
                  {/* Shop Orders Table */}
                  {shopLoading ? (
                    <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>
                  ) : (
                    <>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-dark-900 sticky top-0">
                            <tr className="text-left text-dark-400 text-sm">
                              <th className="px-4 py-3">ID</th>
                              <th className="px-4 py-3">Customer</th>
                              <th className="px-4 py-3">Phone</th>
                              <th className="px-4 py-3">Product</th>
                              <th className="px-4 py-3">Description</th>
                              <th className="px-4 py-3">Amount</th>
                              <th className="px-4 py-3">Status</th>
                              <th className="px-4 py-3">Date</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredShopOrders.slice((shopPage - 1) * itemsPerPage, shopPage * itemsPerPage).map((order, i) => {
                              const status = order.status || 'N/A';
                              const statusColor = status.toLowerCase() === 'completed' ? 'bg-emerald-500/20 text-emerald-400' : status.toLowerCase() === 'pending' ? 'bg-amber-500/20 text-amber-400' : status.toLowerCase() === 'processing' ? 'bg-cyan-500/20 text-cyan-400' : 'bg-red-500/20 text-red-400';
                              return (
                                <tr key={order.id || i} className="border-t border-dark-700 hover:bg-dark-800/50">
                                  <td className="px-4 py-3 text-white font-medium">{order.id}</td>
                                  <td className="px-4 py-3 text-cyan-400">{order.customerName || 'Shop Customer'}</td>
                                  <td className="px-4 py-3 text-dark-300">{formatPhoneNumber(order.phone)}</td>
                                  <td className="px-4 py-3 text-cyan-400">{order.product || 'N/A'}</td>
                                  <td className="px-4 py-3 text-dark-300">{order.description || 'N/A'}</td>
                                  <td className="px-4 py-3 text-emerald-400 font-medium">{formatAmount(order.amount || 0)}</td>
                                  <td className="px-4 py-3"><span className={`px-2 py-1 rounded text-xs font-medium ${statusColor}`}>{status}</span></td>
                                  <td className="px-4 py-3 text-dark-400 text-sm">{new Date(order.date).toLocaleString()}</td>
                                </tr>
                              );
                            })}
                            {filteredShopOrders.length === 0 && (
                              <tr><td colSpan="8" className="px-4 py-8 text-center text-dark-400">No shop orders found</td></tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                      {/* Shop Pagination */}
                      {filteredShopOrders.length > itemsPerPage && (
                        <div className="flex items-center justify-between mt-4 pt-4 border-t border-dark-700">
                          <p className="text-dark-400 text-sm">Showing {((shopPage - 1) * itemsPerPage) + 1} to {Math.min(shopPage * itemsPerPage, filteredShopOrders.length)} of {filteredShopOrders.length}</p>
                          <div className="flex items-center gap-2">
                            <button onClick={() => setShopPage(p => Math.max(1, p - 1))} disabled={shopPage === 1} className="px-3 py-1.5 bg-dark-700 hover:bg-dark-600 text-dark-300 rounded-lg text-sm disabled:opacity-50">Prev</button>
                            <span className="px-4 py-1.5 bg-indigo-500 text-white rounded-lg text-sm font-medium">Page {shopPage}</span>
                            <button onClick={() => setShopPage(p => Math.min(Math.ceil(filteredShopOrders.length / itemsPerPage), p + 1))} disabled={shopPage >= Math.ceil(filteredShopOrders.length / itemsPerPage)} className="px-3 py-1.5 bg-dark-700 hover:bg-dark-600 text-dark-300 rounded-lg text-sm disabled:opacity-50">Next</button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              ) : activeTab === 'referrals' ? (
                /* Referrals Tab */
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Users className="w-5 h-5 text-violet-400" />
                    <h3 className="text-lg font-bold text-white">Agent Referral Commissions</h3>
                  </div>
                  
                  {/* Referral Filters */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
                    <input type="text" placeholder="Agent name..." value={referralFilters.agent} onChange={(e) => setReferralFilters(s => ({ ...s, agent: e.target.value }))}
                      className="bg-dark-900 border border-dark-600 rounded-lg px-3 py-2 text-sm text-white placeholder-dark-500 focus:border-violet-500 focus:outline-none" />
                    <select value={referralFilters.status} onChange={(e) => setReferralFilters(s => ({ ...s, status: e.target.value }))}
                      className="bg-dark-900 border border-dark-600 rounded-lg px-3 py-2 text-sm text-white focus:border-violet-500 focus:outline-none">
                      <option value="">All Status</option>
                      <option value="Paid">Paid</option>
                      <option value="Pending">Pending</option>
                      <option value="Failed">Failed</option>
                    </select>
                    <input type="date" value={referralFilters.startDate} onChange={(e) => setReferralFilters(s => ({ ...s, startDate: e.target.value }))}
                      className="bg-dark-900 border border-dark-600 rounded-lg px-2 py-2 text-sm text-white focus:border-violet-500 focus:outline-none" />
                    <input type="date" value={referralFilters.endDate} onChange={(e) => setReferralFilters(s => ({ ...s, endDate: e.target.value }))}
                      className="bg-dark-900 border border-dark-600 rounded-lg px-2 py-2 text-sm text-white focus:border-violet-500 focus:outline-none" />
                  </div>

                  {/* Referral Stats */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                    <div className="bg-dark-900/50 border border-cyan-500/30 rounded-xl p-4">
                      <p className="text-cyan-400 text-sm">Total Orders</p>
                      <p className="text-2xl font-bold text-white">{referralData.stats.totalOrders || 0}</p>
                    </div>
                    <div className="bg-dark-900/50 border border-emerald-500/30 rounded-xl p-4">
                      <p className="text-emerald-400 text-sm">Paid Orders</p>
                      <p className="text-2xl font-bold text-emerald-400">{referralData.stats.paidOrders || 0}</p>
                    </div>
                    <div className="bg-dark-900/50 border border-violet-500/30 rounded-xl p-4">
                      <p className="text-violet-400 text-sm">Total Commission</p>
                      <p className="text-2xl font-bold text-violet-400">{formatAmount(referralData.stats.totalCommission || 0)}</p>
                    </div>
                    <div className="bg-dark-900/50 border border-amber-500/30 rounded-xl p-4">
                      <p className="text-amber-400 text-sm">Unpaid Commission</p>
                      <p className="text-2xl font-bold text-amber-400">{formatAmount(referralData.stats.unpaidCommission || 0)}</p>
                    </div>
                  </div>

                  {/* Agent Summary */}
                  {referralData.agentSummary.length > 0 && (
                    <div className="mb-6">
                      <h4 className="text-white font-semibold mb-3">Agent Commission Summary</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {referralData.agentSummary.map((agent, i) => (
                          <div key={i} className="bg-dark-900/50 border border-dark-700 rounded-xl p-4">
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <p className="text-white font-medium">{agent.agent?.name}</p>
                                <p className="text-dark-400 text-xs">{agent.agent?.role} • {agent.totalOrders} orders</p>
                              </div>
                              {agent.unpaidCommission > 0 && (
                                <button
                                  onClick={() => {
                                    const unpaidOrders = referralData.orders
                                      .filter(o => o.agentId === agent.agent?.id && o.paymentStatus === 'Paid' && !o.commissionPaid)
                                      .map(o => o.id);
                                    if (unpaidOrders.length > 0) {
                                      handleMarkCommissionPaid(agent.agent?.id, unpaidOrders);
                                    }
                                  }}
                                  className="px-2 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 text-xs rounded-lg flex items-center gap-1"
                                >
                                  <CheckCircle className="w-3 h-3" /> Pay
                                </button>
                              )}
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-dark-400">Total:</span>
                              <span className="text-violet-400 font-medium">{formatAmount(agent.totalCommission)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-dark-400">Unpaid:</span>
                              <span className="text-amber-400 font-medium">{formatAmount(agent.unpaidCommission)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Referral Orders Table */}
                  {referralLoading ? (
                    <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-violet-500" /></div>
                  ) : (
                    <>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-dark-900 sticky top-0">
                            <tr className="text-left text-dark-400 text-sm">
                              <th className="px-4 py-3">Date</th>
                              <th className="px-4 py-3">Agent</th>
                              <th className="px-4 py-3">Customer</th>
                              <th className="px-4 py-3">Product</th>
                              <th className="px-4 py-3">Amount</th>
                              <th className="px-4 py-3">Commission</th>
                              <th className="px-4 py-3">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredReferralOrders.slice((referralPage - 1) * itemsPerPage, referralPage * itemsPerPage).map((order, i) => {
                              const statusColor = order.paymentStatus === 'Paid' ? 'bg-emerald-500/20 text-emerald-400' : order.paymentStatus === 'Pending' ? 'bg-amber-500/20 text-amber-400' : 'bg-red-500/20 text-red-400';
                              return (
                                <tr key={order.id || i} className="border-t border-dark-700 hover:bg-dark-800/50">
                                  <td className="px-4 py-3 text-dark-300 text-sm">{new Date(order.createdAt).toLocaleDateString()}</td>
                                  <td className="px-4 py-3 text-violet-400 font-medium">{order.agent?.name}</td>
                                  <td className="px-4 py-3 text-white">{order.customerName}</td>
                                  <td className="px-4 py-3 text-dark-300">{order.product?.name}</td>
                                  <td className="px-4 py-3 text-cyan-400">{formatAmount(order.agentPrice)}</td>
                                  <td className="px-4 py-3 text-emerald-400 font-medium">{formatAmount(order.commission)}</td>
                                  <td className="px-4 py-3">
                                    <span className={`px-2 py-1 rounded text-xs font-medium ${statusColor}`}>{order.paymentStatus}</span>
                                    {order.commissionPaid && <span className="ml-1 px-2 py-1 rounded text-xs font-medium bg-violet-500/20 text-violet-400">Paid</span>}
                                  </td>
                                </tr>
                              );
                            })}
                            {filteredReferralOrders.length === 0 && (
                              <tr><td colSpan="7" className="px-4 py-8 text-center text-dark-400">No referral orders found</td></tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                      {/* Referral Pagination */}
                      {filteredReferralOrders.length > itemsPerPage && (
                        <div className="flex items-center justify-between mt-4 pt-4 border-t border-dark-700">
                          <p className="text-dark-400 text-sm">Showing {((referralPage - 1) * itemsPerPage) + 1} to {Math.min(referralPage * itemsPerPage, filteredReferralOrders.length)} of {filteredReferralOrders.length}</p>
                          <div className="flex items-center gap-2">
                            <button onClick={() => setReferralPage(p => Math.max(1, p - 1))} disabled={referralPage === 1} className="px-3 py-1.5 bg-dark-700 hover:bg-dark-600 text-dark-300 rounded-lg text-sm disabled:opacity-50">Prev</button>
                            <span className="px-4 py-1.5 bg-violet-500 text-white rounded-lg text-sm font-medium">Page {referralPage}</span>
                            <button onClick={() => setReferralPage(p => Math.min(Math.ceil(filteredReferralOrders.length / itemsPerPage), p + 1))} disabled={referralPage >= Math.ceil(filteredReferralOrders.length / itemsPerPage)} className="px-3 py-1.5 bg-dark-700 hover:bg-dark-600 text-dark-300 rounded-lg text-sm disabled:opacity-50">Next</button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              ) : null}
            </div>
          </div>
    </div>
  );
};

export default TransactionalAdminModal;
