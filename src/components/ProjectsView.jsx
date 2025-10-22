import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { Plus, Search, Edit2, Trash2, Users, Check, X } from 'lucide-react'
import './SharedStyles.css'

function ProjectsView({ profile }) {
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [formData, setFormData] = useState({
    project_id: '',
    title: '',
    description: '',
    status: 'Pending Approval'
  })
  const [editingId, setEditingId] = useState(null)

  useEffect(() => {
    fetchProjects()
  }, [])

  const fetchProjects = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('projects')
        .select(`
          *,
          created_by_profile:profiles!projects_created_by_fkey(full_name),
          approved_by_profile:profiles!projects_approved_by_fkey(full_name)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      setProjects(data || [])
    } catch (error) {
      console.error('Error fetching projects:', error)
      alert('Error loading projects')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (editingId) {
        // Update existing project
        const { error } = await supabase
          .from('projects')
          .update({
            title: formData.title,
            description: formData.description,
            status: formData.status,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingId)

        if (error) throw error

        // Log to audit trail
        await supabase.from('audit_trail').insert([
          {
            record_id: `AUDIT-${Date.now()}`,
            entity: 'projects',
            entity_id: editingId,
            action: 'updated',
            performed_by: profile.id,
            details: { title: formData.title }
          }
        ])
      } else {
        // Create new project
        const { error } = await supabase
          .from('projects')
          .insert([
            {
              ...formData,
              created_by: profile.id
            }
          ])

        if (error) throw error

        // Log to audit trail
        await supabase.from('audit_trail').insert([
          {
            record_id: `AUDIT-${Date.now()}`,
            entity: 'projects',
            entity_id: formData.project_id,
            action: 'created',
            performed_by: profile.id,
            details: { title: formData.title }
          }
        ])
      }

      fetchProjects()
      resetForm()
      setShowModal(false)
      alert(editingId ? 'Project updated successfully!' : 'Project created successfully!')
    } catch (error) {
      console.error('Error saving project:', error)
      alert('Error saving project: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (project) => {
    setFormData({
      project_id: project.project_id,
      title: project.title,
      description: project.description || '',
      status: project.status
    })
    setEditingId(project.id)
    setShowModal(true)
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this project?')) return

    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', id)

      if (error) throw error

      fetchProjects()
      alert('Project deleted successfully!')
    } catch (error) {
      console.error('Error deleting project:', error)
      alert('Error deleting project')
    }
  }

  const handleApprove = async (id, status) => {
    try {
      const { error } = await supabase
        .from('projects')
        .update({
          status: status,
          approved_by: profile.id,
          approval_date: new Date().toISOString()
        })
        .eq('id', id)

      if (error) throw error

      fetchProjects()
      alert(`Project ${status.toLowerCase()} successfully!`)
    } catch (error) {
      console.error('Error updating project status:', error)
      alert('Error updating project status')
    }
  }

  const resetForm = () => {
    setFormData({
      project_id: '',
      title: '',
      description: '',
      status: 'Pending Approval'
    })
    setEditingId(null)
  }

  const filteredProjects = projects.filter(project =>
    project.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    project.project_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    project.description?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="view-container">
      <div className="view-header">
        <div>
          <h1>Projects</h1>
          <p>Manage your research projects</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary">
          <Plus size={20} />
          New Project
        </button>
      </div>

      <div className="search-bar">
        <Search size={20} />
        <input
          type="text"
          placeholder="Search projects..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {loading && projects.length === 0 ? (
        <div className="loading-state">Loading projects...</div>
      ) : filteredProjects.length === 0 ? (
        <div className="empty-state">
          <Users size={48} />
          <p>No projects found</p>
          <button onClick={() => setShowModal(true)} className="btn-secondary">
            Create your first project
          </button>
        </div>
      ) : (
        <div className="data-grid">
          {filteredProjects.map((project) => (
            <div key={project.id} className="data-card">
              <div className="card-header">
                <div>
                  <h3>{project.title}</h3>
                  <p className="card-id">ID: {project.project_id}</p>
                </div>
                <span className={`status-badge status-${project.status.replace(' ', '-').toLowerCase()}`}>
                  {project.status}
                </span>
              </div>
              
              <div className="card-body">
                <p className="card-description">{project.description || 'No description provided'}</p>
                
                <div className="card-meta">
                  <div className="meta-item">
                    <span className="meta-label">Created by:</span>
                    <span>{project.created_by_profile?.full_name || 'Unknown'}</span>
                  </div>
                  <div className="meta-item">
                    <span className="meta-label">Created:</span>
                    <span>{new Date(project.created_at).toLocaleDateString()}</span>
                  </div>
                  {project.approved_by_profile && (
                    <div className="meta-item">
                      <span className="meta-label">Approved by:</span>
                      <span>{project.approved_by_profile.full_name}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="card-actions">
                {project.status === 'Pending Approval' && (profile.role === 'admin' || profile.role === 'principal_investigator') && (
                  <>
                    <button
                      onClick={() => handleApprove(project.id, 'Approved')}
                      className="btn-icon btn-success"
                      title="Approve"
                    >
                      <Check size={18} />
                    </button>
                    <button
                      onClick={() => handleApprove(project.id, 'Rejected')}
                      className="btn-icon btn-danger"
                      title="Reject"
                    >
                      <X size={18} />
                    </button>
                  </>
                )}
                <button
                  onClick={() => handleEdit(project)}
                  className="btn-icon"
                  title="Edit"
                >
                  <Edit2 size={18} />
                </button>
                <button
                  onClick={() => handleDelete(project.id)}
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
              <h2>{editingId ? 'Edit Project' : 'Create New Project'}</h2>
              <button onClick={() => { setShowModal(false); resetForm(); }} className="btn-close">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-group">
                <label htmlFor="project_id">Project ID *</label>
                <input
                  id="project_id"
                  type="text"
                  placeholder="e.g., PROJ-2025-001"
                  value={formData.project_id}
                  onChange={(e) => setFormData({ ...formData, project_id: e.target.value })}
                  required
                  disabled={editingId !== null}
                />
              </div>

              <div className="form-group">
                <label htmlFor="title">Project Title *</label>
                <input
                  id="title"
                  type="text"
                  placeholder="Enter project title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="description">Description</label>
                <textarea
                  id="description"
                  placeholder="Enter project description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={4}
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
                    <option value="Pending Approval">Pending Approval</option>
                    <option value="Approved">Approved</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                </div>
              )}

              <div className="modal-actions">
                <button type="button" onClick={() => { setShowModal(false); resetForm(); }} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? 'Saving...' : (editingId ? 'Update Project' : 'Create Project')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default ProjectsView

