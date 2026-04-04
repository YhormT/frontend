import React, { useState, useEffect } from 'react';
import { X, Loader2, ShoppingCart, Megaphone } from 'lucide-react';
import axios from 'axios';
import BASE_URL from '../endpoints/endpoints';

const ProductCardPopup = ({ isOpen, onClose, product, onAddToCart, balance, cart }) => {
  const [mobileNumber, setMobileNumber] = useState('');
  const [error, setError] = useState('');
  const [networkMessage, setNetworkMessage] = useState(null);
  const [adding, setAdding] = useState(false);

  const validPrefixes = ['024', '025', '053', '054', '055', '059', '020', '050', '027', '057', '026', '056', '028'];

  useEffect(() => {
    if (isOpen && product) {
      setMobileNumber('');
      setError('');
      // Fetch product card announcement for this network
      const networkName = product.name?.split(' - ')[0] || '';
      if (networkName) {
        axios.get(`${BASE_URL}/api/announcement/product-card?network=${networkName.toLowerCase()}`)
          .then(res => {
            const msgs = res.data?.data;
            if (msgs && msgs.length > 0) setNetworkMessage(msgs[0]);
            else setNetworkMessage(null);
          })
          .catch(() => setNetworkMessage(null));
      }
    }
  }, [isOpen, product]);

  if (!isOpen || !product) return null;

  const isMTN = product.name?.includes('MTN');
  const isTelecel = product.name?.includes('TELECEL');
  const isAirtelTigo = product.name?.includes('AIRTEL');
  const effectivePrice = (product.usePromoPrice && product.promoPrice != null) ? product.promoPrice : product.price;

  const headerGradient = isMTN ? 'from-yellow-500 to-amber-600' : isTelecel ? 'from-red-500 to-rose-600' : isAirtelTigo ? 'from-blue-500 to-indigo-600' : 'from-amber-500 to-yellow-600';
  const buttonColor = isMTN ? 'from-yellow-600 to-yellow-700' : isTelecel ? 'from-red-600 to-red-700' : isAirtelTigo ? 'from-blue-600 to-blue-700' : 'from-amber-600 to-amber-700';

  const handleMobileChange = (value) => {
    if (/^\d{0,10}$/.test(value)) {
      setError('');
      setMobileNumber(value);
    }
  };

  const handleSubmit = async () => {
    if (!mobileNumber.trim() || mobileNumber.length !== 10) {
      setError('Enter a valid 10-digit number');
      return;
    }
    const prefix = mobileNumber.substring(0, 3);
    if (!validPrefixes.includes(prefix)) {
      setError('Invalid prefix. Use 024, 054, 055, 059, 020, 050, 027, 057, 026, 056, 028');
      return;
    }

    setAdding(true);
    try {
      await onAddToCart(product.id, mobileNumber);
      onClose();
    } catch (e) {
      // Error handled by parent
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-dark-800 border border-dark-700 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className={`bg-gradient-to-r ${headerGradient} p-5 relative overflow-hidden`}>
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
          <div className="flex items-center justify-between relative z-10">
            <div>
              <span className="inline-block px-2 py-1 bg-white/20 backdrop-blur-sm rounded-lg text-xs font-medium text-white mb-2">{product.name}</span>
              <h3 className="text-xl font-bold text-white">{product.description}</h3>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-sm text-white/70">GHS</span>
                <span className="text-2xl font-bold text-white">{effectivePrice}</span>
              </div>
            </div>
            <button onClick={onClose} className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors active:scale-95">
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        {/* Network message */}
        {networkMessage && (
          <div className="mx-4 mt-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
            <div className="flex items-start gap-2">
              <Megaphone className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-amber-400 text-xs font-semibold">{networkMessage.title}</p>
                <p className="text-amber-300/80 text-xs mt-0.5">{networkMessage.message}</p>
              </div>
            </div>
          </div>
        )}

        {/* Input */}
        <div className="p-4 space-y-3">
          <div>
            <label className="block text-xs text-dark-400 mb-1.5">Mobile Number</label>
            <input
              type="tel"
              inputMode="numeric"
              placeholder="Enter 10-digit mobile number"
              value={mobileNumber}
              onChange={(e) => handleMobileChange(e.target.value)}
              className={`w-full px-4 py-3 bg-dark-900 border-2 ${error ? 'border-red-500/50' : 'border-dark-600'} rounded-xl text-white placeholder-dark-500 focus:outline-none focus:border-cyan-500 text-base`}
              maxLength={10}
              autoFocus
            />
            {error && <p className="text-red-400 text-xs mt-1.5">{error}</p>}
          </div>

          {product.stock === 0 && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-center">
              <span className="text-red-400 text-sm font-semibold">Out of Stock</span>
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={adding || balance === 0 || product.stock === 0 || mobileNumber.length !== 10}
            className={`w-full py-3 px-4 rounded-xl font-semibold text-white transition-all active:scale-95 flex items-center justify-center gap-2 ${
              adding || balance === 0 || product.stock === 0 || mobileNumber.length !== 10
                ? 'bg-dark-700 cursor-not-allowed text-dark-400'
                : `bg-gradient-to-r ${buttonColor} shadow-lg hover:shadow-xl`
            }`}
          >
            {adding ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> Adding...</>
            ) : balance === 0 ? (
              'Insufficient Balance'
            ) : product.stock === 0 ? (
              'Out of Stock'
            ) : (
              <><ShoppingCart className="w-5 h-5" /> Add to Cart</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductCardPopup;
