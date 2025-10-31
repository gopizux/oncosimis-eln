import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { exportToWord } from '../lib/exportUtils'
import { Plus, Search, Edit2, Trash2, FileText, Check, X, Upload, Download, File, BookOpen } from 'lucide-react'
import './SharedStyles.css'

function ProtocolsView({ profile }) {
  const [activeTab, setActiveTab] = useState('protocols')
  const [protocols, setProtocols] = useState([])
  const [sops, setSops] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [uploadingFiles, setUploadingFiles] = useState(false)
  const [formData, setFormData] = useState({
    protocol_id: '',
    title: '',
    version: '1.0',
    description: '',
    steps: '',
    safety_notes: '',
    required_materials: '',
    status: 'Draft',
    is_sop: false
  })
  const [selectedFiles, setSelectedFiles] = useState([])
  const [editingId, setEditingId] = useState(null)

  useEffect(() => {
    fetchProtocols()
    fetchSOPs()
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
        .eq('is_sop', false)
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

  const fetchSOPs = async () => {
    try {
      const { data, error } = await supabase
        .from('protocols')
        .select(`
          *,
          created_by_profile:profiles!protocols_created_by_fkey(full_name)
        `)
        .eq('is_sop', true)
        .order('created_at', { ascending: false })

      if (error) throw error
      setSops(data || [])
    } catch (error) {
      console.error('Error fetching SOPs:', error)
    }
  }

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files)
    setSelectedFiles(files)
  }

  const uploadSOPFiles = async (protocolId) => {
    if (selectedFiles.length === 0) return []

    setUploadingFiles(true)
    const uploadedFiles = []

    try {
      for (const file of selectedFiles) {
        const fileName = `${protocolId}/${Date.now()}_${file.name}`
        
        const { data, error } = await supabase.storage
          .from('sop-documents')
          .upload(fileName, file)

        if (error) throw error

        const { data: { publicUrl } } = supabase.storage
          .from('sop-documents')
          .getPublicUrl(fileName)

        uploadedFiles.push({
          name: file.name,
          path: fileName,
          url: publicUrl,
          size: file.size,
          type: file.type,
          uploaded_at: new Date().toISOString()
        })
      }

      return uploadedFiles
    } catch (error) {
      console.error('Error uploading files:', error)
      throw error
    } finally {
      setUploadingFiles(false)
    }
  }

  const handleExportToWord = async (protocol) => {
    try {
      await exportToWord(protocol, 'protocol')
      alert('Protocol exported successfully!')
    } catch (error) {
      console.error('Export error:', error)
      alert('Failed to export protocol')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const dataToSave = {
        ...formData,
        steps: formData.steps ? JSON.parse(`[${formData.steps.split('\n').filter(s => s.trim()).map(s => `"${s.trim().replace(/"/g, '\\"')}"`).join(',')}]`) : [],
        required_materials: formData.required_materials ? JSON.parse(`[${formData.required_materials.split('\n').filter(s => s.trim()).map(s => `"${s.trim().replace(/"/g, '\\"')}"`).join(',')}]`) : []
      }

      let attachments = []

      if (editingId) {
        const { data: existingProtocol } = await supabase
          .from('protocols')
          .select('attachments')
          .eq('id', editingId)
          .single()

        attachments = existingProtocol?.attachments || []

        if (selectedFiles.length > 0 && formData.is_sop) {
          const newFiles = await uploadSOPFiles(formData.protocol_id)
          attachments = [...attachments, ...newFiles]
        }

        const { error } = await supabase
          .from('protocols')
          .update({
            ...dataToSave,
            attachments: attachments,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingId)

        if (error) throw error
      } else {
        const { data: newProtocol, error } = await supabase
          .from('protocols')
          .insert([
            {
              ...dataToSave,
              created_by: profile.id,
              attachments: []
            }
          ])
          .select()
          .single()

        if (error) throw error

        if (selectedFiles.length > 0 && formData.is_sop) {
          const uploadedFiles = await uploadSOPFiles(newProtocol.protocol_id)
          
          await supabase
            .from('protocols')
            .update({ attachments: uploadedFiles })
            .eq('id', newProtocol.id)
        }
      }

      fetchProtocols()
      fetchSOPs()
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
      status: protocol.status,
      is_sop: protocol.is_sop || false
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
      fetchSOPs()
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

  const handleDownloadFile = (fileUrl, fileName) => {
    const link = document.createElement('a')
    link.href = fileUrl
    link.download = fileName
    link.target = '_blank'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
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
      status: 'Draft',
      is_sop: false
    })
    setSelectedFiles([])
    setEditingId(null)
  }

  const filteredProtocols = protocols.filter(protocol =>
    protocol.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    protocol.protocol_id.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const filteredSOPs = sops.filter(sop =>
    sop.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sop.protocol_id.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="view-container">
      <div className="view-header">
        <div>
          <h1>Protocols & SOPs</h1>
          <p>Manage standard operating procedures and protocols</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary">
          <Plus size={20} />
          New {activeTab === 'protocols' ? 'Protocol' : 'SOP'}
        </button>
      </div>

      <div className="tabs-container">
        <button
          className={`tab-btn ${activeTab === 'protocols' ? 'active' : ''}`}
          onClick={() => setActiveTab('protocols')}
        >
          <FileText size={18} />
          Protocols ({protocols.length})
        </button>
        <button
          className={`tab-btn ${activeTab === 'sops' ? 'active' : ''}`}
          onClick={() => setActiveTab('sops')}
        >
          <BookOpen size={18} />
          SOPs ({sops.length})
        </button>
      </div>

      <div className="search-bar">
        <Search size={20} />
        <input
          type="text"
          placeholder={`Search ${activeTab}...`}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Protocols Tab */}
      {activeTab === 'protocols' && (
        <>
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
                    <button
                      onClick={() => handleExportToWord(protocol)}
                      className="btn-icon btn-export"
                      title="Export to Word"
                    >
                      <FileText size={18} />
                    </button>
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
        </>
      )}

      {/* SOPs Tab */}
      {activeTab === 'sops' && (
        <>
          {loading && sops.length === 0 ? (
            <div className="loading-state">Loading SOPs...</div>
          ) : filteredSOPs.length === 0 ? (
            <div className="empty-state">
              <BookOpen size={48} />
              <p>No SOPs found</p>
              <button onClick={() => { setFormData({...formData, is_sop: true}); setShowModal(true) }} className="btn-secondary">
                Upload your first SOP
              </button>
            </div>
          ) : (
            <div className="data-grid">
              {filteredSOPs.map((sop) => (
                <div key={sop.id} className="data-card">
                  <div className="card-header">
                    <div>
                      <h3>{sop.title}</h3>
                      <p className="card-id">ID: {sop.protocol_id} | Version: {sop.version}</p>
                    </div>
                    <span className="status-badge status-sop">
                      SOP
                    </span>
                  </div>
                  
                  <div className="card-body">
                    <p className="card-description">{sop.description || 'No description provided'}</p>

                    {sop.attachments && sop.attachments.length > 0 && (
                      <div className="attachments-section">
                        <h4><File size={16} /> Documents ({sop.attachments.length})</h4>
                        <div className="attachments-list">
                          {sop.attachments.map((file, idx) => (
                            <div key={idx} className="attachment-item">
                              <File size={16} />
                              <span className="attachment-name">{file.name}</span>
                              <button
                                onClick={() => handleDownloadFile(file.url, file.name)}
                                className="btn-download"
                                title="Download"
                              >
                                <Download size={14} />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    <div className="card-meta">
                      <div className="meta-item">
                        <span className="meta-label">Uploaded by:</span>
                        <span>{sop.created_by_profile?.full_name || 'Unknown'}</span>
                      </div>
                      <div className="meta-item">
                        <span className="meta-label">Uploaded:</span>
                        <span>{new Date(sop.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="card-actions">
                    <button
                      onClick={() => handleEdit(sop)}
                      className="btn-icon"
                      title="Edit"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button
                      onClick={() => handleDelete(sop.id)}
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
        </>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => { setShowModal(false); resetForm(); }}>
          <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingId ? 'Edit Protocol/SOP' : 'Create New Protocol/SOP'}</h2>
              <button onClick={() => { setShowModal(false); resetForm(); }} className="btn-close">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={formData.is_sop}
                    onChange={(e) => setFormData({ ...formData, is_sop: e.target.checked })}
                    style={{ marginRight: '0.5rem' }}
                  />
                  This is a Standard Operating Procedure (SOP)
                </label>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="protocol_id">ID *</label>
                  <input
                    id="protocol_id"
                    type="text"
                    placeholder="e.g., PROT-001 or SOP-001"
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
                <label htmlFor="title">Title *</label>
                <input
                  id="title"
                  type="text"
                  placeholder="Enter title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="description">Description</label>
                <textarea
                  id="description"
                  placeholder="Enter description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>

              {!formData.is_sop && (
                <>
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
                </>
              )}

              {formData.is_sop && (
                <div className="form-group">
                  <label htmlFor="attachments">
                    <Upload size={16} /> Upload SOP Documents (Word, Excel, PDF)
                  </label>
                  <input
                    id="attachments"
                    type="file"
                    multiple
                    accept=".doc,.docx,.xls,.xlsx,.pdf"
                    onChange={handleFileSelect}
                    className="file-input"
                  />
                  {selectedFiles.length > 0 && (
                    <div className="selected-files">
                      <p>Selected files: {selectedFiles.length}</p>
                      <ul>
                        {selectedFiles.map((file, idx) => (
                          <li key={idx}>{file.name} ({(file.size / 1024).toFixed(2)} KB)</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {editingId && !formData.is_sop && (
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
                <button type="submit" className="btn-primary" disabled={loading || uploadingFiles}>
                  {uploadingFiles ? 'Uploading...' : loading ? 'Saving...' : (editingId ? 'Update' : 'Create')}
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

