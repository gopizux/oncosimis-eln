import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { Plus, Search, Edit2, Trash2, FileText, Check, X } from 'lucide-react'
import './SharedStyles.css'

function ProtocolsView({ profile }) {
  const [protocols, setProtocols] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [formData, setFormData] = useState({
    protocol_id: '',
    title: '',
    version: '1.0',
    description: '',
    steps: '',
    safety_notes: '',
    required_materials: '',
    status: 'Draft'
  })
  const [editingId, setEditingId] = useState(null)

  useEffect(() => {
    fetchProtocols()
  }, [])

  const fetchProtocols = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('protocols')
        .select(`
          *,
          created_by_profile:profiles!protocols_created_by_fkey(full_name),
          approved_by_profile:profiles!protocols_approved_by_fkey(full_name)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      setProtocols(data || [])
    } catch (error) {
      console.error('Error fetching protocols:', error)
      alert('Error loading protocols')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const dataToSave = {
        ...formData,
        steps: formData.steps ? JSON.parse(`[${formData.steps.split('\n').map(s => `"${s.trim()}"`).join(',')}]`) : [],
        required_materials: formData.required_materials ? JSON.parse(`[${formData.required_materials.split('\n').map(s => `"${s.trim()}"`).join(',')}]`) : []
      }

      if (editingId) {
        const { error } = await supabase
          .from('protocols')
          .update({
            ...dataToSave,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingId)

        if (error) throw error
      } else {
        const { error } = await supabase
          .from('protocols')
          .insert([
            {
              ...dataToSave,
              created_by: profile.id
            }
          ])

        if (error) throw error
      }

      fetchProtocols()
      resetForm()
      setShowModal(false)
      alert(editingId ? 'Protocol updated successfully!' : 'Protocol created successfully!')
    } catch (error) {
      console.error('Error saving protocol:', error)
      alert('Error saving protocol: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (protocol) => {
    setFormData({
      protocol_id: protocol.protocol_id,
      title: protocol.title,
      version: protocol.version,
      description: protocol.description || '',
      steps: Array.isArray(protocol.steps) ? protocol.steps.join('\n') : '',
      safety_notes: protocol.safety_notes || '',
      required_materials: Array.isArray(protocol.required_materials) ? protocol.required_materials.join('\n') : '',
      status: protocol.status
    })
    setEditingId(protocol.id)
    setShowModal(true)
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this protocol?')) return

    try {
      const { error } = await supabase
        .from('protocols')
        .delete()
        .eq('id', id)

      if (error) throw error

      fetchProtocols()
      alert('Protocol deleted successfully!')
    } catch (error) {
      console.error('Error deleting protocol:', error)
      alert('Error deleting protocol')
    }
  }

  const handleApprove = async (id, status) => {
    try {
      const { error } = await supabase
        .from('protocols')
        .update({
          status: status,
          approved_by: profile.id,
          approval_date: new Date().toISOString()
        })
        .eq('id', id)

      if (error) throw error

      fetchProtocols()
      alert(`Protocol ${status.toLowerCase()} successfully!`)
    } catch (error) {
      console.error('Error updating protocol status:', error)
      alert('Error updating protocol status')
    }
  }

  const resetForm = () => {
    setFormData({
      protocol_id: '',
      title: '',
      version: '1.0',
      description: '',
      steps: '',
      safety_notes: '',
      required_materials: '',
      status: 'Draft'
    })
    setEditingId(null)
  }

  const filteredProtocols = protocols.filter(protocol =>
    protocol.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    protocol.protocol_id.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="view-container">
      <div className="view-header">
        <div>
          <h1>Protocols</h1>
          <p>Manage standard operating procedures</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary">
          <Plus size={20} />
          New Protocol
        </button>
      </div>

      <div className="search-bar">
        <Search size={20} />
        <input
          type="text"
          placeholder="Search protocols..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {loading && protocols.length === 0 ? (
        <div className="loading-state">Loading protocols...</div>
      ) : filteredProtocols.length === 0 ? (
        <div className="empty-state">
          <FileText size={48} />
          <p>No protocols found</p>
          <button onClick={() => setShowModal(true)} className="btn-secondary">
            Create your first protocol
          </button>
        </div>
      ) : (
        <div className="data-grid">
          {filteredProtocols.map((protocol) => (
            <div key={protocol.id} className="data-card">
              <div className="card-header">
                <div>
                  <h3>{protocol.title}</h3>
                  <p className="card-id">ID: {protocol.protocol_id} | Version: {protocol.version}</p>
                </div>
                <span className={`status-badge status-${protocol.status.replace(' ', '-').toLowerCase()}`}>
                  {protocol.status}
                </span>
              </div>
              
              <div className="card-body">
                <p className="card-description">{protocol.description || 'No description provided'}</p>
                
                {protocol.steps && protocol.steps.length > 0 && (
                  <div className="protocol-section">
                    <h4>Steps:</h4>
                    <ol className="protocol-steps">
                      {protocol.steps.slice(0, 3).map((step, idx) => (
                        <li key={idx}>{step}</li>
                      ))}
                      {protocol.steps.length > 3 && <li>... and {protocol.steps.length - 3} more</li>}
                    </ol>
                  </div>
                )}

                {protocol.safety_notes && (
                  <div className="protocol-section safety-notes">
                    <h4>⚠️ Safety Notes:</h4>
                    <p>{protocol.safety_notes}</p>
                  </div>
                )}
                
                <div className="card-meta">
                  <div className="meta-item">
                    <span className="meta-label">Created by:</span>
                    <span>{protocol.created_by_profile?.full_name || 'Unknown'}</span>
                  </div>
                  <div className="meta-item">
                    <span className="meta-label">Created:</span>
                    <span>{new Date(protocol.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              <div className="card-actions">
                {protocol.status === 'Pending Approval' && (profile.role === 'admin' || profile.role === 'principal_investigator') && (
                  <>
                    <button
                      onClick={() => handleApprove(protocol.id, 'Approved')}
                      className="btn-icon btn-success"
                      title="Approve"
                    >
                      <Check size={18} />
                    </button>
                    <button
                      onClick={() => handleApprove(protocol.id, 'Rejected')}
                      className="btn-icon btn-danger"
                      title="Reject"
                    >
                      <X size={18} />
                    </button>
                  </>
                )}
                <button
                  onClick={() => handleEdit(protocol)}
                  className="btn-icon"
                  title="Edit"
                >
                  <Edit2 size={18} />
                </button>
                <button
                  onClick={() => handleDelete(protocol.id)}
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
          <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingId ? 'Edit Protocol' : 'Create New Protocol'}</h2>
              <button onClick={() => { setShowModal(false); resetForm(); }} className="btn-close">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="protocol_id">Protocol ID *</label>
                  <input
                    id="protocol_id"
                    type="text"
                    placeholder="e.g., PROT-001"
                    value={formData.protocol_id}
                    onChange={(e) => setFormData({ ...formData, protocol_id: e.target.value })}
                    required
                    disabled={editingId !== null}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="version">Version *</label>
                  <input
                    id="version"
                    type="text"
                    placeholder="e.g., 1.0"
                    value={formData.version}
                    onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="title">Protocol Title *</label>
                <input
                  id="title"
                  type="text"
                  placeholder="Enter protocol title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="description">Description</label>
                <textarea
                  id="description"
                  placeholder="Enter protocol description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="form-group">
                <label htmlFor="steps">Procedure Steps (one per line)</label>
                <textarea
                  id="steps"
                  placeholder="Step 1&#10;Step 2&#10;Step 3"
                  value={formData.steps}
                  onChange={(e) => setFormData({ ...formData, steps: e.target.value })}
                  rows={6}
                />
              </div>

              <div className="form-group">
                <label htmlFor="required_materials">Required Materials (one per line)</label>
                <textarea
                  id="required_materials"
                  placeholder="Material 1&#10;Material 2&#10;Material 3"
                  value={formData.required_materials}
                  onChange={(e) => setFormData({ ...formData, required_materials: e.target.value })}
                  rows={4}
                />
              </div>

              <div className="form-group">
                <label htmlFor="safety_notes">Safety Notes</label>
                <textarea
                  id="safety_notes"
                  placeholder="Enter safety precautions and warnings"
                  value={formData.safety_notes}
                  onChange={(e) => setFormData({ ...formData, safety_notes: e.target.value })}
                  rows={3}
                />
              </div>

              {editingId && (
                <div className="form-group">
                  <label htmlFor="status">Status</label>
                  <select
                    id="status"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  >
                    <option value="Draft">Draft</option>
                    <option value="Pending Approval">Pending Approval</option>
                    <option value="Approved">Approved</option>
                    <option value="Rejected">Rejected</option>
                    <option value="Archived">Archived</option>
                  </select>
                </div>
              )}

              <div className="modal-actions">
                <button type="button" onClick={() => { setShowModal(false); resetForm(); }} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? 'Saving...' : (editingId ? 'Update Protocol' : 'Create Protocol')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default ProtocolsView

