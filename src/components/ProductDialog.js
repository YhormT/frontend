import React, { useState, useEffect, useMemo } from 'react';
import { X, Plus, Edit, Trash2, Search, Package, Loader2 } from 'lucide-react';
import axios from 'axios';
import Swal from 'sweetalert2';
import BASE_URL from '../endpoints/endpoints';

const ProductDialog = ({ isOpen, onClose }) => {
  const [productId, setProductId] = useState(null);
  const [productName, setProductName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('');
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return products;
    return products.filter(product =>
      product.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [products, searchQuery]);

  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get(`${BASE_URL}/products`);
      setProducts(response.data);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) fetchProducts();
  }, [isOpen]);

  const resetForm = () => {
    setProductId(null);
    setProductName('');
    setDescription('');
    setPrice('');
    setStock('');
  };

  const handleEditClick = (product) => {
    setProductId(product.id);
    setProductName(product.name);
    setDescription(product.description);
    setPrice(product.price);
    setStock(product.stock);
  };

  const handleSaveProduct = async () => {
    if (!productName || !description || !price || stock === '') {
      Swal.fire({ title: 'Validation Error', text: 'Please fill in all fields', icon: 'error', background: '#1e293b', color: '#f1f5f9' });
      return;
    }

    setIsLoading(true);
    try {
      const productData = { name: productName, description, price: parseFloat(price), stock: parseInt(stock, 10) };

      if (productId) {
        await axios.put(`${BASE_URL}/products/update/${productId}`, productData);
        Swal.fire({ title: 'Updated!', text: 'Product updated successfully.', icon: 'success', background: '#1e293b', color: '#f1f5f9', timer: 1500 });
      } else {
        await axios.post(`${BASE_URL}/products/add`, productData);
        Swal.fire({ title: 'Success!', text: 'Product added successfully.', icon: 'success', background: '#1e293b', color: '#f1f5f9', timer: 1500 });
      }
      fetchProducts();
      resetForm();
    } catch (error) {
      Swal.fire({ title: 'Error!', text: `Operation failed: ${error.message}`, icon: 'error', background: '#1e293b', color: '#f1f5f9' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteProduct = async (id) => {
    const result = await Swal.fire({
      title: 'Are you sure?', text: "You won't be able to revert this!", icon: 'warning',
      showCancelButton: true, confirmButtonColor: '#ef4444', cancelButtonColor: '#6b7280',
      background: '#1e293b', color: '#f1f5f9', confirmButtonText: 'Yes, delete it!'
    });

    if (result.isConfirmed) {
      setIsLoading(true);
      try {
        await axios.delete(`${BASE_URL}/products/delete/${id}`);
        setProducts(products.filter((p) => p.id !== id));
        Swal.fire({ title: 'Deleted!', text: 'Product deleted.', icon: 'success', background: '#1e293b', color: '#f1f5f9', timer: 1500 });
      } catch (error) {
        Swal.fire({ title: 'Error!', text: 'Failed to delete product.', icon: 'error', background: '#1e293b', color: '#f1f5f9' });
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleToggleShop = async (id, currentValue) => {
    try {
      await axios.put(`${BASE_URL}/products/toggle-shop/${id}`, { showInShop: !currentValue });
      setProducts(products.map(p => p.id === id ? { ...p, showInShop: !currentValue } : p));
    } catch (error) {
      console.error('Error toggling shop visibility:', error);
    }
  };

  const handleToggleShopStock = async (id, currentValue) => {
    try {
      await axios.put(`${BASE_URL}/products/update/${id}`, { shopStockClosed: !currentValue });
      setProducts(products.map(p => p.id === id ? { ...p, shopStockClosed: !currentValue } : p));
      Swal.fire({ 
        title: !currentValue ? 'Stock Closed' : 'Stock Opened', 
        text: !currentValue ? 'Store customers cannot purchase this product' : 'Store customers can now purchase this product', 
        icon: 'success', 
        background: '#1e293b', 
        color: '#f1f5f9', 
        timer: 1500,
        showConfirmButton: false
      });
    } catch (error) {
      console.error('Error toggling shop stock:', error);
      Swal.fire({ title: 'Error!', text: 'Failed to update shop stock status', icon: 'error', background: '#1e293b', color: '#f1f5f9' });
    }
  };

  const handleSetStock = async (id, stockValue) => {
    try {
      await axios.put(`${BASE_URL}/products/update/${id}`, { stock: stockValue });
      setProducts(products.map(p => p.id === id ? { ...p, stock: stockValue } : p));
      Swal.fire({ 
        title: 'Stock Updated!', 
        text: `Stock set to ${stockValue}`, 
        icon: 'success', 
        background: '#1e293b', 
        color: '#f1f5f9', 
        timer: 1500,
        showConfirmButton: false
      });
    } catch (error) {
      console.error('Error updating stock:', error);
      Swal.fire({ title: 'Error!', text: 'Failed to update stock', icon: 'error', background: '#1e293b', color: '#f1f5f9' });
    }
  };

  const handleBulkSetStock = async (carrier, stockValue) => {
    const carrierProducts = products.filter(p => p.name?.toUpperCase().includes(carrier.toUpperCase()));
    if (carrierProducts.length === 0) return;

    try {
      await Promise.all(carrierProducts.map(p => 
        axios.put(`${BASE_URL}/products/update/${p.id}`, { stock: stockValue })
      ));
      setProducts(products.map(p => 
        p.name?.toUpperCase().includes(carrier.toUpperCase()) ? { ...p, stock: stockValue } : p
      ));
      Swal.fire({ 
        title: 'Bulk Update!', 
        text: `All ${carrier} products stock set to ${stockValue}`, 
        icon: 'success', 
        background: '#1e293b', 
        color: '#f1f5f9', 
        timer: 1500,
        showConfirmButton: false
      });
    } catch (error) {
      console.error('Error bulk updating stock:', error);
    }
  };

  const handleBulkShopStock = async (closeStock) => {
    const shopProducts = products.filter(p => p.showInShop);
    if (shopProducts.length === 0) {
      Swal.fire({ title: 'No Shop Products', text: 'No products are enabled for shop', icon: 'info', background: '#1e293b', color: '#f1f5f9' });
      return;
    }

    try {
      await Promise.all(shopProducts.map(p => 
        axios.put(`${BASE_URL}/products/update/${p.id}`, { shopStockClosed: closeStock })
      ));
      setProducts(products.map(p => 
        p.showInShop ? { ...p, shopStockClosed: closeStock } : p
      ));
      Swal.fire({ 
        title: closeStock ? 'All Shop Stock Closed' : 'All Shop Stock Opened', 
        text: closeStock ? 'Store customers cannot purchase any products' : 'Store customers can now purchase products', 
        icon: 'success', 
        background: '#1e293b', 
        color: '#f1f5f9', 
        timer: 1500,
        showConfirmButton: false
      });
    } catch (error) {
      console.error('Error bulk updating shop stock:', error);
      Swal.fire({ title: 'Error!', text: 'Failed to update shop stock', icon: 'error', background: '#1e293b', color: '#f1f5f9' });
    }
  };

  const getCarrierColor = (name) => {
    const upperName = name?.toUpperCase() || '';
    if (upperName.includes('MTN')) return 'bg-yellow-500';
    if (upperName.includes('TELECEL')) return 'bg-red-500';
    if (upperName.includes('AIRTEL') || upperName.includes('TIGO')) return 'bg-blue-500';
    return 'bg-gray-500';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-dark-800 border border-dark-700 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-cyan-600 to-cyan-700 p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Package className="w-8 h-8 text-white" />
            <div>
              <h2 className="text-xl font-bold text-white">Product Management</h2>
              <p className="text-cyan-100 text-sm">{products.length} products</p>
            </div>
          </div>
          <button onClick={() => { resetForm(); onClose(); }} className="p-2 bg-white/20 hover:bg-white/30 rounded-lg">
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {/* Add/Edit Form */}
          <div className="bg-dark-900/50 rounded-xl p-4 mb-6 border border-dark-700">
            <h3 className="text-white font-semibold mb-4">{productId ? 'Edit Product' : 'Add New Product'}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <input type="text" placeholder="Product Name" value={productName} onChange={(e) => setProductName(e.target.value)}
                className="bg-dark-800 border border-dark-600 rounded-lg px-4 py-2 text-white placeholder-dark-400 focus:border-cyan-500 focus:outline-none" />
              <input type="text" placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)}
                className="bg-dark-800 border border-dark-600 rounded-lg px-4 py-2 text-white placeholder-dark-400 focus:border-cyan-500 focus:outline-none" />
              <input type="number" placeholder="Price (GHS)" value={price} onChange={(e) => setPrice(e.target.value)}
                className="bg-dark-800 border border-dark-600 rounded-lg px-4 py-2 text-white placeholder-dark-400 focus:border-cyan-500 focus:outline-none" />
              <input type="number" placeholder="Stock" value={stock} onChange={(e) => setStock(e.target.value)}
                className="bg-dark-800 border border-dark-600 rounded-lg px-4 py-2 text-white placeholder-dark-400 focus:border-cyan-500 focus:outline-none" />
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={handleSaveProduct} disabled={isLoading}
                className="px-6 py-2 bg-gradient-to-r from-cyan-500 to-cyan-600 text-white rounded-lg font-semibold hover:from-cyan-600 hover:to-cyan-700 disabled:opacity-50 flex items-center gap-2">
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                {productId ? 'Update' : 'Add'} Product
              </button>
              {productId && (
                <button onClick={resetForm} className="px-6 py-2 bg-dark-700 text-dark-300 rounded-lg font-semibold hover:bg-dark-600">Cancel</button>
              )}
            </div>
          </div>

          {/* Search and Bulk Stock Controls */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-4">
            <div className="relative flex-1 max-w-md w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
              <input type="text" placeholder="Search products..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-dark-800 border border-dark-600 rounded-lg pl-10 pr-4 py-2 text-white placeholder-dark-400 focus:border-cyan-500 focus:outline-none" />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-dark-400 text-sm">Bulk Stock:</span>
              {['MTN', 'TELECEL', 'AIRTEL TIGO'].map(carrier => (
                <div key={carrier} className="flex items-center gap-1">
                  <span className={`w-2 h-2 rounded-full ${carrier === 'MTN' ? 'bg-yellow-500' : carrier === 'TELECEL' ? 'bg-red-500' : 'bg-blue-500'}`}></span>
                  <button onClick={() => handleBulkSetStock(carrier, 1)} className="px-2 py-1 text-xs bg-emerald-500/20 text-emerald-400 rounded hover:bg-emerald-500/30">1</button>
                  <button onClick={() => handleBulkSetStock(carrier, 0)} className="px-2 py-1 text-xs bg-red-500/20 text-red-400 rounded hover:bg-red-500/30">0</button>
                </div>
              ))}
              <span className="text-dark-600 mx-1">|</span>
              <span className="text-dark-400 text-sm">Shop Stock:</span>
              <button onClick={() => handleBulkShopStock(false)} className="px-2 py-1 text-xs bg-emerald-500/20 text-emerald-400 rounded hover:bg-emerald-500/30">Open All</button>
              <button onClick={() => handleBulkShopStock(true)} className="px-2 py-1 text-xs bg-red-500/20 text-red-400 rounded hover:bg-red-500/30">Close All</button>
            </div>
          </div>

          {/* Products Table */}
          <div className="bg-dark-900/50 rounded-xl border border-dark-700 overflow-hidden">
            <div className="overflow-x-auto max-h-96">
              <table className="w-full">
                <thead className="bg-dark-800 sticky top-0">
                  <tr className="text-left text-dark-400 text-sm">
                    <th className="px-4 py-3 font-medium">ID</th>
                    <th className="px-4 py-3 font-medium">Name</th>
                    <th className="px-4 py-3 font-medium">Description</th>
                    <th className="px-4 py-3 font-medium">Price</th>
                    <th className="px-4 py-3 font-medium">Stock</th>
                    <th className="px-4 py-3 font-medium text-center">Shop</th>
                    <th className="px-4 py-3 font-medium text-center">Shop Stock</th>
                    <th className="px-4 py-3 font-medium text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr><td colSpan="8" className="px-4 py-8 text-center text-dark-400"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></td></tr>
                  ) : filteredProducts.length === 0 ? (
                    <tr><td colSpan="8" className="px-4 py-8 text-center text-dark-400">No products found</td></tr>
                  ) : (
                    filteredProducts.map((product) => (
                      <tr key={product.id} className="border-t border-dark-700 hover:bg-dark-800/50">
                        <td className="px-4 py-3 text-dark-400">#{product.id}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${getCarrierColor(product.name)}`}></span>
                            <span className="text-white font-medium">{product.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-dark-300 max-w-xs truncate">{product.description}</td>
                        <td className="px-4 py-3 text-white font-medium">GHS {product.price?.toFixed(2)}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              product.stock === 0 ? 'bg-red-500/20 text-red-400' :
                              product.stock < 5 ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'
                            }`}>{product.stock}</span>
                            <div className="flex gap-1">
                              <button onClick={() => handleSetStock(product.id, 1)} className="px-1.5 py-0.5 text-xs bg-emerald-500/20 text-emerald-400 rounded hover:bg-emerald-500/30" title="Set to 1">1</button>
                              <button onClick={() => handleSetStock(product.id, 0)} className="px-1.5 py-0.5 text-xs bg-red-500/20 text-red-400 rounded hover:bg-red-500/30" title="Set to 0">0</button>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button onClick={() => handleToggleShop(product.id, product.showInShop)}
                            className={`relative w-10 h-5 rounded-full transition-colors ${product.showInShop ? 'bg-cyan-500' : 'bg-dark-600'}`}>
                            <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${product.showInShop ? 'left-5' : 'left-0.5'}`}></span>
                          </button>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {product.showInShop && (
                            <button onClick={() => handleToggleShopStock(product.id, product.shopStockClosed)}
                              className={`px-2 py-1 rounded-lg text-xs font-medium transition-colors ${product.shopStockClosed ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' : 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'}`}>
                              {product.shopStockClosed ? 'Closed' : 'Open'}
                            </button>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-2">
                            <button onClick={() => handleEditClick(product)} className="p-1.5 text-cyan-400 hover:bg-cyan-500/20 rounded-lg"><Edit className="w-4 h-4" /></button>
                            <button onClick={() => handleDeleteProduct(product.id)} className="p-1.5 text-red-400 hover:bg-red-500/20 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDialog;
