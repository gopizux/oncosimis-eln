import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { Plus, Search, Edit2, Trash2, Dna, X, Check } from 'lucide-react'
import './SharedStyles.css'

function PlasmidOrdersView({ profile }) {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [formData, setFormData] = useState({
    order_id: '',
    plasmid_name: '',
    gene: '',
    place: '',
    quantity: '',
    status: 'Ordered',
    order_date: new Date().toISOString().split('T')[0],
    received_date: '',
    notes: ''
  })
  const [editingId, setEditingId] = useState(null)

  useEffect(() => {
    fetchOrders()
  }, [])

  const fetchOrders = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('plasmid_orders')
        .select(`
          *,
          ordered_by_profile:profiles!plasmid_orders_ordered_by_fkey(full_name)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      setOrders(data || [])
    } catch (error) {
      console.error('Error fetching plasmid orders:', error)
      alert('Error loading plasmid orders')
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
          .from('plasmid_orders')
          .update({
            ...formData,
            received_date: formData.received_date || null,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingId)

        if (error) throw error
      } else {
        const { error } = await supabase
          .from('plasmid_orders')
          .insert([
            {
              ...formData,
              received_date: formData.received_date || null,
              ordered_by: profile.id
            }
          ])

        if (error) throw error
      }

      fetchOrders()
      resetForm()
      setShowModal(false)
      alert(editingId ? 'Plasmid order updated!' : 'Plasmid order placed!')
    } catch (error) {
      console.error('Error saving order:', error)
      alert('Error saving order: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (order) => {
    setFormData({
      order_id: order.order_id,
      plasmid_name: order.plasmid_name,
      gene: order.gene || '',
      place: order.place || '',
      quantity: order.quantity || '',
      status: order.status,
      order_date: order.order_date,
      received_date: order.received_date || '',
      notes: order.notes || ''
    })
    setEditingId(order.id)
    setShowModal(true)
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this order?')) return

    try {
      const { error } = await supabase
        .from('plasmid_orders')
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

  const handleMarkReceived = async (id) => {
    try {
      const { error } = await supabase
        .from('plasmid_orders')
        .update({
          status: 'Received',
          received_date: new Date().toISOString().split('T')[0]
        })
        .eq('id', id)

      if (error) throw error

      fetchOrders()
      alert('Marked as received!')
    } catch (error) {
      console.error('Error updating status:', error)
      alert('Error updating status')
    }
  }

  const resetForm = () => {
    setFormData({
      order_id: '',
      plasmid_name: '',
      gene: '',
      place: '',
      quantity: '',
      status: 'Ordered',
      order_date: new Date().toISOString().split('T')[0],
      received_date: '',
      notes: ''
    })
    setEditingId(null)
  }

  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      order.plasmid_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.order_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.gene?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesFilter = filterStatus === 'all' || order.status === filterStatus
    
    return matchesSearch && matchesFilter
  })

  return (
    <div className="view-container">
      <div className="view-header">
        <div>
          <h1>Plasmid Orders</h1>
          <p>Track plasmid orders and inventory (Admin Only)</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary">
          <Plus size={20} />
          New Order
        </button>
      </div>

      <div className="filters-bar">
        <div className="search-bar">
          <Search size={20} />
          <input
            type="text"
            placeholder="Search plasmid orders..."
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
          <option value="Ordered">Ordered</option>
          <option value="In Transit">In Transit</option>
          <option value="Received">Received</option>
          <option value="Cancelled">Cancelled</option>
        </select>
      </div>

      {loading && orders.length === 0 ? (
        <div className="loading-state">Loading plasmid orders...</div>
      ) : filteredOrders.length === 0 ? (
        <div className="empty-state">
          <Dna size={48} />
          <p>No plasmid orders found</p>
          <button onClick={() => setShowModal(true)} className="btn-secondary">
            Place your first order
          </button>
        </div>
      ) : (
        <div className="data-grid">
          {filteredOrders.map((order) => (
            <div key={order.id} className="data-card">
              <div className="card-header">
                <div>
                  <h3>{order.plasmid_name}</h3>
                  <p className="card-id">Order ID: {order.order_id}</p>
                  {order.gene && <p className="card-id">Gene: {order.gene}</p>}
                </div>
                <span className={`status-badge status-${order.status.replace(' ', '-').toLowerCase()}`}>
                  {order.status}
                </span>
              </div>
              
              <div className="card-body">
                <div className="plasmid-info">
                  {order.place && (
                    <div className="info-item">
                      <span className="info-label">Place:</span>
                      <span className="info-value">{order.place}</span>
                    </div>
                  )}
                  {order.quantity && (
                    <div className="info-item">
                      <span className="info-label">Quantity:</span>
                      <span className="info-value">{order.quantity}</span>
                    </div>
                  )}
                  <div className="info-item">
                    <span className="info-label">Order Date:</span>
                    <span className="info-value">
                      {new Date(order.order_date).toLocaleDateString()}
                    </span>
                  </div>
                  {order.received_date && (
                    <div className="info-item">
                      <span className="info-label">Received:</span>
                      <span className="info-value">
                        {new Date(order.received_date).toLocaleDateString()}
                      </span>
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
                {order.status !== 'Received' && order.status !== 'Cancelled' && (
                  <button
                    onClick={() => handleMarkReceived(order.id)}
                    className="btn-icon btn-success"
                    title="Mark as Received"
                  >
                    <Check size={18} />
                  </button>
                )}
                <button
                  onClick={() => handleEdit(order)}
                  className="btn-icon"
                  title="Edit"
                >
                  <Edit2 size={18} />
                </button>
                <button
                  onClick={() => handleDelete(order.id)}
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
              <h2>{editingId ? 'Edit Plasmid Order' : 'New Plasmid Order'}</h2>
              <button onClick={() => { setShowModal(false); resetForm(); }} className="btn-close">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-group">
                <label htmlFor="order_id">Order ID *</label>
                <input
                  id="order_id"
                  type="text"
                  placeholder="e.g., PLAS-001"
                  value={formData.order_id}
                  onChange={(e) => setFormData({ ...formData, order_id: e.target.value })}
                  required
                  disabled={editingId !== null}
                />
              </div>

              <div className="form-group">
                <label htmlFor="plasmid_name">Plasmid Name *</label>
                <input
                  id="plasmid_name"
                  type="text"
                  placeholder="Enter plasmid name"
                  value={formData.plasmid_name}
                  onChange={(e) => setFormData({ ...formData, plasmid_name: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="gene">Gene</label>
                <input
                  id="gene"
                  type="text"
                  placeholder="Enter gene name"
                  value={formData.gene}
                  onChange={(e) => setFormData({ ...formData, gene: e.target.value })}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="place">Place</label>
                  <input
                    id="place"
                    type="text"
                    placeholder="e.g., Addgene"
                    value={formData.place}
                    onChange={(e) => setFormData({ ...formData, place: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="quantity">Quantity</label>
                  <input
                    id="quantity"
                    type="text"
                    placeholder="e.g., 1 tube"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="order_date">Order Date *</label>
                  <input
                    id="order_date"
                    type="date"
                    value={formData.order_date}
                    onChange={(e) => setFormData({ ...formData, order_date: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="received_date">Received Date</label>
                  <input
                    id="received_date"
                    type="date"
                    value={formData.received_date}
                    onChange={(e) => setFormData({ ...formData, received_date: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="status">Status</label>
                <select
                  id="status"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                >
                  <option value="Ordered">Ordered</option>
                  <option value="In Transit">In Transit</option>
                  <option value="Received">Received</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="notes">Notes</label>
                <textarea
                  id="notes"
                  placeholder="Additional notes"
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

export default PlasmidOrdersView

