import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { Plus, Search, Edit2, Trash2, TestTube2, AlertTriangle, X } from 'lucide-react'
import './SharedStyles.css'

function ChemicalInventoryView({ profile }) {
  const [chemicals, setChemicals] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [formData, setFormData] = useState({
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
  const [editingId, setEditingId] = useState(null)

  useEffect(() => {
    fetchChemicals()
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
      
      // Auto-update status based on expiry and quantity
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

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Determine status
      let status = formData.status
      if (formData.expiry_date && new Date(formData.expiry_date) < new Date()) {
        status = 'Expired'
      } else if (parseFloat(formData.quantity) <= 0) {
        status = 'Out of Stock'
      } else if (parseFloat(formData.quantity) <= 10) {
        status = 'Low Stock'
      } else {
        status = 'Available'
      }

      if (editingId) {
        const { error } = await supabase
          .from('chemical_inventory')
          .update({
            ...formData,
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
              ...formData,
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

  const handleEdit = (chemical) => {
    setFormData({
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
    setShowModal(true)
  }

  const handleDelete = async (id) => {
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

  const resetForm = () => {
    setFormData({
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

  return (
    <div className="view-container">
      <div className="view-header">
        <div>
          <h1>Chemical Inventory</h1>
          <p>Manage laboratory chemical storage and tracking</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary">
          <Plus size={20} />
          Add Chemical
        </button>
      </div>

      <div className="filters-bar">
        <div className="search-bar">
          <Search size={20} />
          <input
            type="text"
            placeholder="Search chemicals..."
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
          <option value="Available">Available</option>
          <option value="Low Stock">Low Stock</option>
          <option value="Out of Stock">Out of Stock</option>
          <option value="Expired">Expired</option>
        </select>
      </div>

      {loading && chemicals.length === 0 ? (
        <div className="loading-state">Loading chemical inventory...</div>
      ) : filteredChemicals.length === 0 ? (
        <div className="empty-state">
          <TestTube2 size={48} />
          <p>No chemicals found</p>
          <button onClick={() => setShowModal(true)} className="btn-secondary">
            Add your first chemical
          </button>
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
                <button
                  onClick={() => handleEdit(chemical)}
                  className="btn-icon"
                  title="Edit"
                >
                  <Edit2 size={18} />
                </button>
                <button
                  onClick={() => handleDelete(chemical.id)}
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
              <h2>{editingId ? 'Edit Chemical' : 'Add New Chemical'}</h2>
              <button onClick={() => { setShowModal(false); resetForm(); }} className="btn-close">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-group">
                <label htmlFor="chemical_id">Chemical ID *</label>
                <input
                  id="chemical_id"
                  type="text"
                  placeholder="e.g., CHEM-001"
                  value={formData.chemical_id}
                  onChange={(e) => setFormData({ ...formData, chemical_id: e.target.value })}
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
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="cas_number">CAS Number</label>
                <input
                  id="cas_number"
                  type="text"
                  placeholder="e.g., 7647-14-5"
                  value={formData.cas_number}
                  onChange={(e) => setFormData({ ...formData, cas_number: e.target.value })}
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
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="unit">Unit *</label>
                  <select
                    id="unit"
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
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
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label htmlFor="expiry_date">Expiry Date</label>
                <input
                  id="expiry_date"
                  type="date"
                  value={formData.expiry_date}
                  onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label htmlFor="safety_data_sheet_url">Safety Data Sheet URL</label>
                <input
                  id="safety_data_sheet_url"
                  type="url"
                  placeholder="https://..."
                  value={formData.safety_data_sheet_url}
                  onChange={(e) => setFormData({ ...formData, safety_data_sheet_url: e.target.value })}
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
    </div>
  )
}

export default ChemicalInventoryView

