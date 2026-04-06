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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Close button */}
        <div className="flex justify-end p-3 pb-0">
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 pb-6 pt-1">
          {/* Product info badge */}
          <div className="text-center mb-4">
            <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold text-white bg-gradient-to-r ${headerGradient}`}>
              {product.name} — {product.description}
            </span>
            <p className="text-gray-800 text-lg font-bold mt-2">GHS {effectivePrice}</p>
          </div>

          {/* Title */}
          <h3 className="text-xl font-bold text-gray-900 text-center mb-3">Enter Phone Number</h3>

          {/* Warning text + network announcement */}
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
            {networkMessage && (
              <div className="flex items-start gap-2">
                <Megaphone className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-red-700 text-xs font-semibold">{networkMessage.title}</p>
                  <p className="text-red-600 text-xs mt-0.5">{networkMessage.message}</p>
                </div>
              </div>
            )}
          </div>

          {/* Phone input */}
          <input
            type="tel"
            inputMode="numeric"
            placeholder="e.g. 0244123456"
            value={mobileNumber}
            onChange={(e) => handleMobileChange(e.target.value)}
            className={`w-full px-4 py-3 bg-gray-50 border-2 ${error ? 'border-red-400' : 'border-gray-200'} rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-emerald-500 text-base mb-2`}
            maxLength={10}
            autoFocus
          />
          {error && <p className="text-red-500 text-xs mb-2">{error}</p>}

          {product.stock === 0 && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-center mb-3">
              <span className="text-red-500 text-sm font-semibold">Out of Stock</span>
            </div>
          )}

          {/* Add to Cart button */}
          <button
            onClick={handleSubmit}
            disabled={adding || balance === 0 || product.stock === 0 || mobileNumber.length !== 10}
            className={`w-full py-3.5 px-4 rounded-xl font-bold text-white transition-all active:scale-95 flex items-center justify-center gap-2 text-base ${
              adding || balance === 0 || product.stock === 0 || mobileNumber.length !== 10
                ? 'bg-gray-300 cursor-not-allowed text-gray-500'
                : 'bg-emerald-500 hover:bg-emerald-600 shadow-lg shadow-emerald-500/25'
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

          {/* Done Bond Payment link */}
          <p className="text-center text-gray-400 text-xs mt-3">Secure Transaction</p>
        </div>
      </div>
    </div>
  );
};

export default ProductCardPopup;
