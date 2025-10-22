import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { Plus, Search, Edit2, Trash2, FlaskConical, Calendar, X } from 'lucide-react'
import './SharedStyles.css'

function ExperimentsView({ profile }) {
  const [experiments, setExperiments] = useState([])
  const [projects, setProjects] = useState([])
  const [protocols, setProtocols] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [formData, setFormData] = useState({
    experiment_id: '',
    project_id: '',
    protocol_id: '',
    title: '',
    objective: '',
    start_date: '',
    end_date: '',
    status: 'Planned'
  })
  const [editingId, setEditingId] = useState(null)

  useEffect(() => {
    fetchExperiments()
    fetchProjects()
    fetchProtocols()
  }, [])

  const fetchExperiments = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('experiments')
        .select(`
          *,
          projects(title, project_id),
          protocols(title, protocol_id),
          created_by_profile:profiles!experiments_created_by_fkey(full_name)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      setExperiments(data || [])
    } catch (error) {
      console.error('Error fetching experiments:', error)
      alert('Error loading experiments')
    } finally {
      setLoading(false)
    }
  }

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('id, project_id, title')
        .eq('status', 'Approved')
        .order('title')

      if (error) throw error
      setProjects(data || [])
    } catch (error) {
      console.error('Error fetching projects:', error)
    }
  }

  const fetchProtocols = async () => {
    try {
      const { data, error } = await supabase
        .from('protocols')
        .select('id, protocol_id, title')
        .eq('status', 'Approved')
        .order('title')

      if (error) throw error
      setProtocols(data || [])
    } catch (error) {
      console.error('Error fetching protocols:', error)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (editingId) {
        const { error } = await supabase
          .from('experiments')
          .update({
            ...formData,
            project_id: formData.project_id || null,
            protocol_id: formData.protocol_id || null,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingId)

        if (error) throw error
      } else {
        const { error } = await supabase
          .from('experiments')
          .insert([
            {
              ...formData,
              project_id: formData.project_id || null,
              protocol_id: formData.protocol_id || null,
              created_by: profile.id
            }
          ])

        if (error) throw error
      }

      fetchExperiments()
      resetForm()
      setShowModal(false)
      alert(editingId ? 'Experiment updated successfully!' : 'Experiment created successfully!')
    } catch (error) {
      console.error('Error saving experiment:', error)
      alert('Error saving experiment: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (experiment) => {
    setFormData({
      experiment_id: experiment.experiment_id,
      project_id: experiment.project_id || '',
      protocol_id: experiment.protocol_id || '',
      title: experiment.title,
      objective: experiment.objective || '',
      start_date: experiment.start_date || '',
      end_date: experiment.end_date || '',
      status: experiment.status
    })
    setEditingId(experiment.id)
    setShowModal(true)
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this experiment?')) return

    try {
      const { error } = await supabase
        .from('experiments')
        .delete()
        .eq('id', id)

      if (error) throw error

      fetchExperiments()
      alert('Experiment deleted successfully!')
    } catch (error) {
      console.error('Error deleting experiment:', error)
      alert('Error deleting experiment')
    }
  }

  const resetForm = () => {
    setFormData({
      experiment_id: '',
      project_id: '',
      protocol_id: '',
      title: '',
      objective: '',
      start_date: '',
      end_date: '',
      status: 'Planned'
    })
    setEditingId(null)
  }

  const filteredExperiments = experiments.filter(experiment =>
    experiment.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    experiment.experiment_id.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="view-container">
      <div className="view-header">
        <div>
          <h1>Experiments</h1>
          <p>Track and manage your laboratory experiments</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary">
          <Plus size={20} />
          New Experiment
        </button>
      </div>

      <div className="search-bar">
        <Search size={20} />
        <input
          type="text"
          placeholder="Search experiments..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {loading && experiments.length === 0 ? (
        <div className="loading-state">Loading experiments...</div>
      ) : filteredExperiments.length === 0 ? (
        <div className="empty-state">
          <FlaskConical size={48} />
          <p>No experiments found</p>
          <button onClick={() => setShowModal(true)} className="btn-secondary">
            Create your first experiment
          </button>
        </div>
      ) : (
        <div className="data-grid">
          {filteredExperiments.map((experiment) => (
            <div key={experiment.id} className="data-card">
              <div className="card-header">
                <div>
                  <h3>{experiment.title}</h3>
                  <p className="card-id">ID: {experiment.experiment_id}</p>
                </div>
                <span className={`status-badge status-${experiment.status.replace(' ', '-').toLowerCase()}`}>
                  {experiment.status}
                </span>
              </div>
              
              <div className="card-body">
                {experiment.objective && (
                  <div className="experiment-section">
                    <h4>Objective:</h4>
                    <p>{experiment.objective}</p>
                  </div>
                )}

                <div className="card-meta">
                  {experiment.projects && (
                    <div className="meta-item">
                      <span className="meta-label">Project:</span>
                      <span>{experiment.projects.title}</span>
                    </div>
                  )}
                  {experiment.protocols && (
                    <div className="meta-item">
                      <span className="meta-label">Protocol:</span>
                      <span>{experiment.protocols.title}</span>
                    </div>
                  )}
                  {experiment.start_date && (
                    <div className="meta-item">
                      <span className="meta-label">Start Date:</span>
                      <span>{new Date(experiment.start_date).toLocaleDateString()}</span>
                    </div>
                  )}
                  {experiment.end_date && (
                    <div className="meta-item">
                      <span className="meta-label">End Date:</span>
                      <span>{new Date(experiment.end_date).toLocaleDateString()}</span>
                    </div>
                  )}
                  <div className="meta-item">
                    <span className="meta-label">Created by:</span>
                    <span>{experiment.created_by_profile?.full_name || 'Unknown'}</span>
                  </div>
                </div>
              </div>

              <div className="card-actions">
                <button
                  onClick={() => handleEdit(experiment)}
                  className="btn-icon"
                  title="Edit"
                >
                  <Edit2 size={18} />
                </button>
                <button
                  onClick={() => handleDelete(experiment.id)}
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
              <h2>{editingId ? 'Edit Experiment' : 'Create New Experiment'}</h2>
              <button onClick={() => { setShowModal(false); resetForm(); }} className="btn-close">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-group">
                <label htmlFor="experiment_id">Experiment ID *</label>
                <input
                  id="experiment_id"
                  type="text"
                  placeholder="e.g., EXP-2025-001"
                  value={formData.experiment_id}
                  onChange={(e) => setFormData({ ...formData, experiment_id: e.target.value })}
                  required
                  disabled={editingId !== null}
                />
              </div>

              <div className="form-group">
                <label htmlFor="title">Experiment Title *</label>
                <input
                  id="title"
                  type="text"
                  placeholder="Enter experiment title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="project_id">Project</label>
                <select
                  id="project_id"
                  value={formData.project_id}
                  onChange={(e) => setFormData({ ...formData, project_id: e.target.value })}
                >
                  <option value="">Select a project (optional)</option>
                  {projects.map(project => (
                    <option key={project.id} value={project.id}>
                      {project.project_id} - {project.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="protocol_id">Protocol</label>
                <select
                  id="protocol_id"
                  value={formData.protocol_id}
                  onChange={(e) => setFormData({ ...formData, protocol_id: e.target.value })}
                >
                  <option value="">Select a protocol (optional)</option>
                  {protocols.map(protocol => (
                    <option key={protocol.id} value={protocol.id}>
                      {protocol.protocol_id} - {protocol.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="objective">Objective</label>
                <textarea
                  id="objective"
                  placeholder="Enter experiment objective"
                  value={formData.objective}
                  onChange={(e) => setFormData({ ...formData, objective: e.target.value })}
                  rows={4}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="start_date">Start Date</label>
                  <input
                    id="start_date"
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="end_date">End Date</label>
                  <input
                    id="end_date"
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
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
                  <option value="Planned">Planned</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                  <option value="On Hold">On Hold</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>

              <div className="modal-actions">
                <button type="button" onClick={() => { setShowModal(false); resetForm(); }} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? 'Saving...' : (editingId ? 'Update Experiment' : 'Create Experiment')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default ExperimentsView

