import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { Plus, Search, Edit2, Trash2, Package, X, Calendar } from 'lucide-react'
import './SharedStyles.css'

function ProductsView({ profile }) {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [formData, setFormData] = useState({
    product_id: '',
    name: '',
    mfg_date: '',
    quantity: '',
    unit: '',
    location: '',
    batch_number: '',
    lot_no: '',
    qc_tested: 'Pending',
    notes: ''
  })
  const [editingId, setEditingId] = useState(null)

  useEffect(() => {
    fetchProducts()
  }, [])

  const fetchProducts = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          created_by_profile:profiles!products_created_by_fkey(full_name)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      setProducts(data || [])
    } catch (error) {
      console.error('Error fetching products:', error)
      alert('Error loading products')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (editingId) {
        const { error } = await supabase
          .from('products')
          .update({
            ...formData,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingId)

        if (error) throw error
      } else {
        const { error } = await supabase
          .from('products')
          .insert([
            {
              ...formData,
              created_by: profile.id
            }
          ])

        if (error) throw error
      }

      fetchProducts()
      resetForm()
      setShowModal(false)
      alert(editingId ? 'Product updated successfully!' : 'Product added successfully!')
    } catch (error) {
      console.error('Error saving product:', error)
      alert('Error saving product: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (product) => {
    setFormData({
      product_id: product.product_id,
      name: product.name,
      mfg_date: product.mfg_date || '',
      quantity: product.quantity?.toString() || '',
      unit: product.unit || '',
      location: product.location || '',
      batch_number: product.batch_number || '',
      lot_no: product.lot_no || '',
      qc_tested: product.qc_tested,
      notes: product.notes || ''
    })
    setEditingId(product.id)
    setShowModal(true)
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this product?')) return

    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id)

      if (error) throw error

      fetchProducts()
      alert('Product deleted successfully!')
    } catch (error) {
      console.error('Error deleting product:', error)
      alert('Error deleting product')
    }
  }

  const resetForm = () => {
    setFormData({
      product_id: '',
      name: '',
      mfg_date: '',
      quantity: '',
      unit: '',
      location: '',
      batch_number: '',
      lot_no: '',
      qc_tested: 'Pending',
      notes: ''
    })
    setEditingId(null)
  }

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.product_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.batch_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.lot_no?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="view-container">
      <div className="view-header">
        <div>
          <h1>Products</h1>
          <p>Manage product inventory and quality control</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary">
          <Plus size={20} />
          Add Product
        </button>
      </div>

      <div className="search-bar">
        <Search size={20} />
        <input
          type="text"
          placeholder="Search products..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {loading && products.length === 0 ? (
        <div className="loading-state">Loading products...</div>
      ) : filteredProducts.length === 0 ? (
        <div className="empty-state">
          <Package size={48} />
          <p>No products found</p>
          <button onClick={() => setShowModal(true)} className="btn-secondary">
            Add your first product
          </button>
        </div>
      ) : (
        <div className="data-grid">
          {filteredProducts.map((product) => (
            <div key={product.id} className="data-card">
              <div className="card-header">
                <div>
                  <h3>{product.name}</h3>
                  <p className="card-id">ID: {product.product_id}</p>
                  {product.batch_number && (
                    <p className="card-id">Batch: {product.batch_number}</p>
                  )}
                </div>
                <span className={`status-badge status-qc-${product.qc_tested.toLowerCase()}`}>
                  QC: {product.qc_tested}
                </span>
              </div>
              
              <div className="card-body">
                <div className="product-info">
                  {product.quantity && (
                    <div className="info-item">
                      <span className="info-label">Quantity:</span>
                      <span className="info-value">
                        {product.quantity} {product.unit || ''}
                      </span>
                    </div>
                  )}
                  {product.lot_no && (
                    <div className="info-item">
                      <span className="info-label">Lot No:</span>
                      <span className="info-value">{product.lot_no}</span>
                    </div>
                  )}
                  {product.location && (
                    <div className="info-item">
                      <span className="info-label">Location:</span>
                      <span className="info-value">{product.location}</span>
                    </div>
                  )}
                  {product.mfg_date && (
                    <div className="info-item">
                      <span className="info-label">Mfg Date:</span>
                      <span className="info-value">
                        {new Date(product.mfg_date).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>

                {product.notes && (
                  <div className="product-notes">
                    <strong>Notes:</strong> {product.notes}
                  </div>
                )}

                <div className="card-meta">
                  <div className="meta-item">
                    <span className="meta-label">Added by:</span>
                    <span>{product.created_by_profile?.full_name || 'Unknown'}</span>
                  </div>
                  <div className="meta-item">
                    <span className="meta-label">Added:</span>
                    <span>{new Date(product.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              <div className="card-actions">
                <button
                  onClick={() => handleEdit(product)}
                  className="btn-icon"
                  title="Edit"
                >
                  <Edit2 size={18} />
                </button>
                <button
                  onClick={() => handleDelete(product.id)}
                  className="btn-icon btn-danger"
                  title="Delete"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => { setShowModal(false); resetForm(); }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingId ? 'Edit Product' : 'Add New Product'}</h2>
              <button onClick={() => { setShowModal(false); resetForm(); }} className="btn-close">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-group">
                <label htmlFor="product_id">Product ID *</label>
                <input
                  id="product_id"
                  type="text"
                  placeholder="e.g., PROD-001"
                  value={formData.product_id}
                  onChange={(e) => setFormData({ ...formData, product_id: e.target.value })}
                  required
                  disabled={editingId !== null}
                />
              </div>

              <div className="form-group">
                <label htmlFor="name">Product Name *</label>
                <input
                  id="name"
                  type="text"
                  placeholder="Enter product name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="quantity">Quantity</label>
                  <input
                    id="quantity"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="unit">Unit</label>
                  <input
                    id="unit"
                    type="text"
                    placeholder="g, mg, mL, units"
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="batch_number">Batch Number</label>
                  <input
                    id="batch_number"
                    type="text"
                    placeholder="Enter batch number"
                    value={formData.batch_number}
                    onChange={(e) => setFormData({ ...formData, batch_number: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="lot_no">Lot No</label>
                  <input
                    id="lot_no"
                    type="text"
                    placeholder="Enter lot number"
                    value={formData.lot_no}
                    onChange={(e) => setFormData({ ...formData, lot_no: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="mfg_date">Manufacturing Date</label>
                <input
                  id="mfg_date"
                  type="date"
                  value={formData.mfg_date}
                  onChange={(e) => setFormData({ ...formData, mfg_date: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label htmlFor="location">Location</label>
                <input
                  id="location"
                  type="text"
                  placeholder="e.g., Storage Room A, Shelf 3"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label htmlFor="qc_tested">QC Status *</label>
                <select
                  id="qc_tested"
                  value={formData.qc_tested}
                  onChange={(e) => setFormData({ ...formData, qc_tested: e.target.value })}
                  required
                >
                  <option value="Pending">Pending</option>
                  <option value="Pass">Pass</option>
                  <option value="Fail">Fail</option>
                  <option value="N/A">N/A</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="notes">Notes</label>
                <textarea
                  id="notes"
                  placeholder="Additional notes or comments"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="modal-actions">
                <button type="button" onClick={() => { setShowModal(false); resetForm(); }} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? 'Saving...' : (editingId ? 'Update Product' : 'Add Product')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default ProductsView

