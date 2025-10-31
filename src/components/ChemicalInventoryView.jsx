import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { Plus, Search, Edit2, Trash2, TestTube2, AlertTriangle, X, Package, TrendingUp } from 'lucide-react'
import './SharedStyles.css'

function ChemicalInventoryView({ profile }) {
  const [activeTab, setActiveTab] = useState('inventory')
  const [chemicals, setChemicals] = useState([])
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  
  // Role-based permissions
  const isAdmin = profile?.role === 'admin'
  const isResearchAssociate = profile?.role === 'research_associate'
  const isAccounts = profile?.role === 'accounts'
  const isGuest = profile?.role === 'guest'
  const canEdit = isAdmin || isResearchAssociate || isAccounts
  const viewOnly = isGuest
  
  const [chemFormData, setChemFormData] = useState({
    chemical_id: '',
    name: '',
    cas_number: '',
    quantity: '',
    unit: 'mL',
    location: '',
    expiry_date: '',
    safety_data_sheet_url: '',
    status: 'Available'
  })

  const [orderFormData, setOrderFormData] = useState({
    order_id: '',
    chemical_name: '',
    catalog_number: '',
    provider: '',
    manufacturer: '',
    quantity: '',
    unit: 'g',
    status: 'Requested',
    expected_delivery: '',
    cost: '',
    notes: ''
  })

  const [editingId, setEditingId] = useState(null)
  const [modalType, setModalType] = useState('chemical')

  useEffect(() => {
    fetchChemicals()
    fetchOrders()
  }, [])

  const fetchChemicals = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('chemical_inventory')
        .select(`
          *,
          created_by_profile:profiles!chemical_inventory_created_by_fkey(full_name)
        `)
        .order('name')

      if (error) throw error
      
      const updatedData = (data || []).map(chem => {
        let status = chem.status
        if (chem.expiry_date && new Date(chem.expiry_date) < new Date()) {
          status = 'Expired'
        } else if (parseFloat(chem.quantity) <= 0) {
          status = 'Out of Stock'
        } else if (parseFloat(chem.quantity) <= 10) {
          status = 'Low Stock'
        } else {
          status = 'Available'
        }
        return { ...chem, status }
      })

      setChemicals(updatedData)
    } catch (error) {
      console.error('Error fetching chemicals:', error)
      alert('Error loading chemical inventory')
    } finally {
      setLoading(false)
    }
  }

  const fetchOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('chemical_orders')
        .select(`
          *,
          ordered_by_profile:profiles!chemical_orders_ordered_by_fkey(full_name)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      setOrders(data || [])
    } catch (error) {
      console.error('Error fetching orders:', error)
    }
  }

  const handleChemicalSubmit = async (e) => {
    e.preventDefault()
    if (viewOnly) {
      alert('You do not have permission to modify data')
      return
    }
    setLoading(true)

    try {
      let status = chemFormData.status
      if (chemFormData.expiry_date && new Date(chemFormData.expiry_date) < new Date()) {
        status = 'Expired'
      } else if (parseFloat(chemFormData.quantity) <= 0) {
        status = 'Out of Stock'
      } else if (parseFloat(chemFormData.quantity) <= 10) {
        status = 'Low Stock'
      } else {
        status = 'Available'
      }

      if (editingId) {
        const { error } = await supabase
          .from('chemical_inventory')
          .update({
            ...chemFormData,
            status,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingId)

        if (error) throw error
      } else {
        const { error } = await supabase
          .from('chemical_inventory')
          .insert([
            {
              ...chemFormData,
              status,
              created_by: profile.id
            }
          ])

        if (error) throw error
      }

      fetchChemicals()
      resetForm()
      setShowModal(false)
      alert(editingId ? 'Chemical updated successfully!' : 'Chemical added successfully!')
    } catch (error) {
      console.error('Error saving chemical:', error)
      alert('Error saving chemical: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleOrderSubmit = async (e) => {
    e.preventDefault()
    if (viewOnly) {
      alert('You do not have permission to modify data')
      return
    }
    setLoading(true)

    try {
      if (editingId) {
        const { error } = await supabase
          .from('chemical_orders')
          .update({
            ...orderFormData,
            expected_delivery: orderFormData.expected_delivery || null,
            cost: orderFormData.cost || null,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingId)

        if (error) throw error
      } else {
        const { error } = await supabase
          .from('chemical_orders')
          .insert([
            {
              ...orderFormData,
              expected_delivery: orderFormData.expected_delivery || null,
              cost: orderFormData.cost || null,
              ordered_by: profile.id
            }
          ])

        if (error) throw error
      }

      fetchOrders()
      resetForm()
      setShowModal(false)
      alert(editingId ? 'Order updated successfully!' : 'Order placed successfully!')
    } catch (error) {
      console.error('Error saving order:', error)
      alert('Error saving order: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleEditChemical = (chemical) => {
    if (viewOnly) {
      alert('You do not have permission to edit data')
      return
    }
    setChemFormData({
      chemical_id: chemical.chemical_id,
      name: chemical.name,
      cas_number: chemical.cas_number || '',
      quantity: chemical.quantity.toString(),
      unit: chemical.unit,
      location: chemical.location || '',
      expiry_date: chemical.expiry_date || '',
      safety_data_sheet_url: chemical.safety_data_sheet_url || '',
      status: chemical.status
    })
    setEditingId(chemical.id)
    setModalType('chemical')
    setShowModal(true)
  }

  const handleEditOrder = (order) => {
    if (viewOnly) {
      alert('You do not have permission to edit data')
      return
    }
    setOrderFormData({
      order_id: order.order_id,
      chemical_name: order.chemical_name,
      catalog_number: order.catalog_number || '',
      provider: order.provider || '',
      manufacturer: order.manufacturer || '',
      quantity: order.quantity?.toString() || '',
      unit: order.unit || 'g',
      status: order.status,
      expected_delivery: order.expected_delivery || '',
      cost: order.cost?.toString() || '',
      notes: order.notes || ''
    })
    setEditingId(order.id)
    setModalType('order')
    setShowModal(true)
  }

  const handleDeleteChemical = async (id) => {
    if (viewOnly) {
      alert('You do not have permission to delete data')
      return
    }
    if (!confirm('Are you sure you want to delete this chemical?')) return

    try {
      const { error } = await supabase
        .from('chemical_inventory')
        .delete()
        .eq('id', id)

      if (error) throw error

      fetchChemicals()
      alert('Chemical deleted successfully!')
    } catch (error) {
      console.error('Error deleting chemical:', error)
      alert('Error deleting chemical')
    }
  }

  const handleDeleteOrder = async (id) => {
    if (viewOnly) {
      alert('You do not have permission to delete data')
      return
    }
    if (!confirm('Are you sure you want to delete this order?')) return

    try {
      const { error} = await supabase
        .from('chemical_orders')
        .delete()
        .eq('id', id)

      if (error) throw error

      fetchOrders()
      alert('Order deleted successfully!')
    } catch (error) {
      console.error('Error deleting order:', error)
      alert('Error deleting order')
    }
  }

  const resetForm = () => {
    setChemFormData({
      chemical_id: '',
      name: '',
      cas_number: '',
      quantity: '',
      unit: 'mL',
      location: '',
      expiry_date: '',
      safety_data_sheet_url: '',
      status: 'Available'
    })
    setOrderFormData({
      order_id: '',
      chemical_name: '',
      catalog_number: '',
      provider: '',
      manufacturer: '',
      quantity: '',
      unit: 'g',
      status: 'Requested',
      expected_delivery: '',
      cost: '',
      notes: ''
    })
    setEditingId(null)
  }

  const filteredChemicals = chemicals.filter(chemical => {
    const matchesSearch = 
      chemical.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      chemical.chemical_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      chemical.cas_number?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesFilter = filterStatus === 'all' || chemical.status === filterStatus
    
    return matchesSearch && matchesFilter
  })

  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      order.chemical_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.order_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.catalog_number?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesFilter = filterStatus === 'all' || order.status === filterStatus
    
    return matchesSearch && matchesFilter
  })

  return (
    <div className="view-container">
      <div className="view-header">
        <div>
          <h1>Chemical Management</h1>
          <p>Manage chemical inventory and track orders</p>
        </div>
        {canEdit && (
          <button 
            onClick={() => { 
              setModalType(activeTab === 'inventory' ? 'chemical' : 'order')
              setShowModal(true) 
            }} 
            className="btn-primary"
          >
            <Plus size={20} />
            {activeTab === 'inventory' ? 'Add Chemical' : 'New Order'}
          </button>
        )}
      </div>

      <div className="tabs-container">
        <button
          className={`tab-btn ${activeTab === 'inventory' ? 'active' : ''}`}
          onClick={() => setActiveTab('inventory')}
        >
          <TestTube2 size={18} />
          Inventory ({chemicals.length})
        </button>
        <button
          className={`tab-btn ${activeTab === 'orders' ? 'active' : ''}`}
          onClick={() => setActiveTab('orders')}
        >
          <Package size={18} />
          Order Tracking ({orders.length})
        </button>
      </div>

      <div className="filters-bar">
        <div className="search-bar">
          <Search size={20} />
          <input
            type="text"
            placeholder={activeTab === 'inventory' ? "Search chemicals..." : "Search orders..."}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <select 
          className="filter-select"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="all">All Status</option>
          {activeTab === 'inventory' ? (
            <>
              <option value="Available">Available</option>
              <option value="Low Stock">Low Stock</option>
              <option value="Out of Stock">Out of Stock</option>
              <option value="Expired">Expired</option>
            </>
          ) : (
            <>
              <option value="Requested">Requested</option>
              <option value="Ordered">Ordered</option>
              <option value="Shipped">Shipped</option>
              <option value="Received">Received</option>
              <option value="Cancelled">Cancelled</option>
            </>
          )}
        </select>
      </div>

      {/* Inventory Tab Content */}
      {activeTab === 'inventory' && (
        <>
          {loading && chemicals.length === 0 ? (
            <div className="loading-state">Loading chemical inventory...</div>
          ) : filteredChemicals.length === 0 ? (
            <div className="empty-state">
              <TestTube2 size={48} />
              <p>No chemicals found</p>
              {canEdit && (
                <button onClick={() => { setModalType('chemical'); setShowModal(true) }} className="btn-secondary">
                  Add your first chemical
                </button>
              )}
            </div>
          ) : (
            <div className="data-grid">
              {filteredChemicals.map((chemical) => (
                <div key={chemical.id} className="data-card">
                  <div className="card-header">
                    <div>
                      <h3>{chemical.name}</h3>
                      <p className="card-id">ID: {chemical.chemical_id}</p>
                      {chemical.cas_number && (
                        <p className="card-id">CAS: {chemical.cas_number}</p>
                      )}
                    </div>
                    <span className={`status-badge status-${chemical.status.replace(' ', '-').toLowerCase()}`}>
                      {chemical.status}
                    </span>
                  </div>
                  
                  <div className="card-body">
                    <div className="chemical-info">
                      <div className="info-item">
                        <span className="info-label">Quantity:</span>
                        <span className="info-value">
                          {chemical.quantity} {chemical.unit}
                        </span>
                      </div>
                      {chemical.location && (
                        <div className="info-item">
                          <span className="info-label">Location:</span>
                          <span className="info-value">{chemical.location}</span>
                        </div>
                      )}
                      {chemical.expiry_date && (
                        <div className="info-item">
                          <span className="info-label">Expiry:</span>
                          <span className={`info-value ${new Date(chemical.expiry_date) < new Date() ? 'expired-date' : ''}`}>
                            {new Date(chemical.expiry_date).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                    </div>

                    {(chemical.status === 'Expired' || chemical.status === 'Low Stock' || chemical.status === 'Out of Stock') && (
                      <div className="warning-message">
                        <AlertTriangle size={16} />
                        <span>
                          {chemical.status === 'Expired' && 'This chemical has expired'}
                          {chemical.status === 'Low Stock' && 'Stock is running low'}
                          {chemical.status === 'Out of Stock' && 'This chemical is out of stock'}
                        </span>
                      </div>
                    )}

                    {chemical.safety_data_sheet_url && (
                      <a 
                        href={chemical.safety_data_sheet_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="sds-link"
                      >
                        View Safety Data Sheet →
                      </a>
                    )}
                  </div>

                  <div className="card-actions">
                    {canEdit && (
                      <>
                        <button
                          onClick={() => handleEditChemical(chemical)}
                          className="btn-icon"
                          title="Edit"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={() => handleDeleteChemical(chemical.id)}
                          className="btn-icon btn-danger"
                          title="Delete"
                        >
                          <Trash2 size={18} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Orders Tab Content */}
      {activeTab === 'orders' && (
        <>
          {loading && orders.length === 0 ? (
            <div className="loading-state">Loading orders...</div>
          ) : filteredOrders.length === 0 ? (
            <div className="empty-state">
              <Package size={48} />
              <p>No orders found</p>
              {canEdit && (
                <button onClick={() => { setModalType('order'); setShowModal(true) }} className="btn-secondary">
                  Place your first order
                </button>
              )}
            </div>
          ) : (
            <div className="data-grid">
              {filteredOrders.map((order) => (
                <div key={order.id} className="data-card">
                  <div className="card-header">
                    <div>
                      <h3>{order.chemical_name}</h3>
                      <p className="card-id">Order ID: {order.order_id}</p>
                      {order.catalog_number && (
                        <p className="card-id">Catalog #: {order.catalog_number}</p>
                      )}
                    </div>
                    <span className={`status-badge status-${order.status.toLowerCase()}`}>
                      {order.status}
                    </span>
                  </div>
                  
                  <div className="card-body">
                    <div className="order-info">
                      {order.provider && (
                        <div className="info-item">
                          <span className="info-label">Provider:</span>
                          <span className="info-value">{order.provider}</span>
                        </div>
                      )}
                      {order.manufacturer && (
                        <div className="info-item">
                          <span className="info-label">Manufacturer:</span>
                          <span className="info-value">{order.manufacturer}</span>
                        </div>
                      )}
                      {order.quantity && (
                        <div className="info-item">
                          <span className="info-label">Quantity:</span>
                          <span className="info-value">{order.quantity} {order.unit}</span>
                        </div>
                      )}
                      <div className="info-item">
                        <span className="info-label">Order Date:</span>
                        <span className="info-value">
                          {new Date(order.order_date).toLocaleDateString()}
                        </span>
                      </div>
                      {order.expected_delivery && (
                        <div className="info-item">
                          <span className="info-label">Expected:</span>
                          <span className="info-value">
                            {new Date(order.expected_delivery).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                      {order.cost && (
                        <div className="info-item">
                          <span className="info-label">Cost:</span>
                          <span className="info-value">₹{order.cost}</span>
                        </div>
                      )}
                    </div>

                    {order.notes && (
                      <div className="order-notes">
                        <strong>Notes:</strong> {order.notes}
                      </div>
                    )}

                    <div className="card-meta">
                      <div className="meta-item">
                        <span className="meta-label">Ordered by:</span>
                        <span>{order.ordered_by_profile?.full_name || 'Unknown'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="card-actions">
                    {canEdit && (
                      <>
                        <button
                          onClick={() => handleEditOrder(order)}
                          className="btn-icon"
                          title="Edit"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={() => handleDeleteOrder(order.id)}
                          className="btn-icon btn-danger"
                          title="Delete"
                        >
                          <Trash2 size={18} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Modal for Chemical */}
      {showModal && modalType === 'chemical' && (
        <div className="modal-overlay" onClick={() => { setShowModal(false); resetForm(); }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingId ? 'Edit Chemical' : 'Add New Chemical'}</h2>
              <button onClick={() => { setShowModal(false); resetForm(); }} className="btn-close">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleChemicalSubmit} className="modal-form">
              <div className="form-group">
                <label htmlFor="chemical_id">Chemical ID *</label>
                <input
                  id="chemical_id"
                  type="text"
                  placeholder="e.g., CHEM-001"
                  value={chemFormData.chemical_id}
                  onChange={(e) => setChemFormData({ ...chemFormData, chemical_id: e.target.value })}
                  required
                  disabled={editingId !== null}
                />
              </div>

              <div className="form-group">
                <label htmlFor="name">Chemical Name *</label>
                <input
                  id="name"
                  type="text"
                  placeholder="e.g., Sodium Chloride"
                  value={chemFormData.name}
                  onChange={(e) => setChemFormData({ ...chemFormData, name: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="cas_number">CAS Number</label>
                <input
                  id="cas_number"
                  type="text"
                  placeholder="e.g., 7647-14-5"
                  value={chemFormData.cas_number}
                  onChange={(e) => setChemFormData({ ...chemFormData, cas_number: e.target.value })}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="quantity">Quantity *</label>
                  <input
                    id="quantity"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={chemFormData.quantity}
                    onChange={(e) => setChemFormData({ ...chemFormData, quantity: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="unit">Unit *</label>
                  <select
                    id="unit"
                    value={chemFormData.unit}
                    onChange={(e) => setChemFormData({ ...chemFormData, unit: e.target.value })}
                  >
                    <option value="mL">mL</option>
                    <option value="L">L</option>
                    <option value="mg">mg</option>
                    <option value="g">g</option>
                    <option value="kg">kg</option>
                    <option value="units">units</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="location">Storage Location</label>
                <input
                  id="location"
                  type="text"
                  placeholder="e.g., Cabinet A, Shelf 2"
                  value={chemFormData.location}
                  onChange={(e) => setChemFormData({ ...chemFormData, location: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label htmlFor="expiry_date">Expiry Date</label>
                <input
                  id="expiry_date"
                  type="date"
                  value={chemFormData.expiry_date}
                  onChange={(e) => setChemFormData({ ...chemFormData, expiry_date: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label htmlFor="safety_data_sheet_url">Safety Data Sheet URL</label>
                <input
                  id="safety_data_sheet_url"
                  type="url"
                  placeholder="https://..."
                  value={chemFormData.safety_data_sheet_url}
                  onChange={(e) => setChemFormData({ ...chemFormData, safety_data_sheet_url: e.target.value })}
                />
              </div>

              <div className="modal-actions">
                <button type="button" onClick={() => { setShowModal(false); resetForm(); }} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? 'Saving...' : (editingId ? 'Update Chemical' : 'Add Chemical')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal for Order */}
      {showModal && modalType === 'order' && (
        <div className="modal-overlay" onClick={() => { setShowModal(false); resetForm(); }}>
          <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingId ? 'Edit Order' : 'New Chemical Order'}</h2>
              <button onClick={() => { setShowModal(false); resetForm(); }} className="btn-close">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleOrderSubmit} className="modal-form">
              <div className="form-group">
                <label htmlFor="order_id">Order ID *</label>
                <input
                  id="order_id"
                  type="text"
                  placeholder="e.g., ORD-001"
                  value={orderFormData.order_id}
                  onChange={(e) => setOrderFormData({ ...orderFormData, order_id: e.target.value })}
                  required
                  disabled={editingId !== null}
                />
              </div>

              <div className="form-group">
                <label htmlFor="chemical_name">Chemical Name *</label>
                <input
                  id="chemical_name"
                  type="text"
                  placeholder="Enter chemical name"
                  value={orderFormData.chemical_name}
                  onChange={(e) => setOrderFormData({ ...orderFormData, chemical_name: e.target.value })}
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="catalog_number">Catalog Number</label>
                  <input
                    id="catalog_number"
                    type="text"
                    placeholder="e.g., CAT-12345"
                    value={orderFormData.catalog_number}
                    onChange={(e) => setOrderFormData({ ...orderFormData, catalog_number: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="provider">Provider</label>
                  <input
                    id="provider"
                    type="text"
                    placeholder="e.g., Sigma-Aldrich"
                    value={orderFormData.provider}
                    onChange={(e) => setOrderFormData({ ...orderFormData, provider: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="manufacturer">Manufacturer</label>
                <input
                  id="manufacturer"
                  type="text"
                  placeholder="Enter manufacturer"
                  value={orderFormData.manufacturer}
                  onChange={(e) => setOrderFormData({ ...orderFormData, manufacturer: e.target.value })}
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
                    value={orderFormData.quantity}
                    onChange={(e) => setOrderFormData({ ...orderFormData, quantity: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="unit">Unit</label>
                  <select
                    id="unit"
                    value={orderFormData.unit}
                    onChange={(e) => setOrderFormData({ ...orderFormData, unit: e.target.value })}
                  >
                    <option value="g">g</option>
                    <option value="kg">kg</option>
                    <option value="mg">mg</option>
                    <option value="mL">mL</option>
                    <option value="L">L</option>
                    <option value="units">units</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="expected_delivery">Expected Delivery</label>
                  <input
                    id="expected_delivery"
                    type="date"
                    value={orderFormData.expected_delivery}
                    onChange={(e) => setOrderFormData({ ...orderFormData, expected_delivery: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="cost">Cost (₹)</label>
                  <input
                    id="cost"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={orderFormData.cost}
                    onChange={(e) => setOrderFormData({ ...orderFormData, cost: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="status">Status</label>
                <select
                  id="status"
                  value={orderFormData.status}
                  onChange={(e) => setOrderFormData({ ...orderFormData, status: e.target.value })}
                >
                  <option value="Requested">Requested</option>
                  <option value="Ordered">Ordered</option>
                  <option value="Shipped">Shipped</option>
                  <option value="Received">Received</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="notes">Notes</label>
                <textarea
                  id="notes"
                  placeholder="Additional notes or special instructions"
                  value={orderFormData.notes}
                  onChange={(e) => setOrderFormData({ ...orderFormData, notes: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="modal-actions">
                <button type="button" onClick={() => { setShowModal(false); resetForm(); }} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? 'Saving...' : (editingId ? 'Update Order' : 'Place Order')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default ChemicalInventoryView

