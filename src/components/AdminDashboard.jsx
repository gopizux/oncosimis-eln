import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { Check, X, Clock, FolderOpen, FileText, FlaskConical } from 'lucide-react'
import './AdminDashboard.css'

function AdminDashboard({ profile }) {
  const [pendingItems, setPendingItems] = useState({
    projects: [],
    protocols: [],
    experiments: []
  })
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('projects')

  useEffect(() => {
    fetchPendingItems()
  }, [])

  const fetchPendingItems = async () => {
    try {
      setLoading(true)

      const [projectsRes, protocolsRes, experimentsRes] = await Promise.all([
        supabase
          .from('projects')
          .select('*, created_by_profile:profiles!projects_created_by_fkey(full_name)')
          .eq('status', 'Pending Approval')
          .order('created_at', { ascending: false }),
        supabase
          .from('protocols')
          .select('*, created_by_profile:profiles!protocols_created_by_fkey(full_name)')
          .eq('status', 'Pending Approval')
          .order('created_at', { ascending: false }),
        supabase
          .from('experiments')
          .select('*, created_by_profile:profiles!experiments_created_by_fkey(full_name)')
          .eq('status', 'Planned')
          .order('created_at', { ascending: false })
      ])

      setPendingItems({
        projects: projectsRes.data || [],
        protocols: protocolsRes.data || [],
        experiments: experimentsRes.data || []
      })
    } catch (error) {
      console.error('Error fetching pending items:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (type, id) => {
    try {
      const table = type === 'projects' ? 'projects' : type === 'protocols' ? 'protocols' : 'experiments'
      const status = type === 'experiments' ? 'In Progress' : 'Approved'

      const { error } = await supabase
        .from(table)
        .update({
          status: status,
          approved_by: profile.id,
          approval_date: new Date().toISOString()
        })
        .eq('id', id)

      if (error) throw error

      alert(`${type.slice(0, -1).charAt(0).toUpperCase() + type.slice(1, -1)} approved successfully!`)
      fetchPendingItems()
    } catch (error) {
      console.error('Error approving:', error)
      alert('Error approving item')
    }
  }

  const handleReject = async (type, id) => {
    try {
      const table = type === 'projects' ? 'projects' : type === 'protocols' ? 'protocols' : 'experiments'
      const status = type === 'experiments' ? 'Cancelled' : 'Rejected'

      const { error } = await supabase
        .from(table)
        .update({
          status: status,
          approved_by: profile.id,
          approval_date: new Date().toISOString()
        })
        .eq('id', id)

      if (error) throw error

      alert(`${type.slice(0, -1).charAt(0).toUpperCase() + type.slice(1, -1)} rejected!`)
      fetchPendingItems()
    } catch (error) {
      console.error('Error rejecting:', error)
      alert('Error rejecting item')
    }
  }

  const renderItems = (items, type) => {
    if (items.length === 0) {
      return (
        <div className="empty-state">
          <Clock size={48} />
          <p>No pending {type} for approval</p>
        </div>
      )
    }

    return (
      <div className="admin-grid">
        {items.map((item) => (
          <div key={item.id} className="admin-card">
            <div className="admin-card-header">
              <div>
                <h3>{item.title}</h3>
                <p className="admin-card-id">
                  ID: {item.project_id || item.protocol_id || item.experiment_id}
                </p>
              </div>
            </div>

            <div className="admin-card-body">
              {item.description && (
                <p className="admin-description">{item.description}</p>
              )}
              {item.objective && (
                <p className="admin-description">{item.objective}</p>
              )}

              <div className="admin-meta">
                <div className="meta-item">
                  <span className="meta-label">Submitted by:</span>
                  <span>{item.created_by_profile?.full_name || 'Unknown'}</span>
                </div>
                <div className="meta-item">
                  <span className="meta-label">Date:</span>
                  <span>{new Date(item.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            </div>

            <div className="admin-card-actions">
              <button
                onClick={() => handleApprove(type, item.id)}
                className="btn-approve"
              >
                <Check size={18} />
                Approve
              </button>
              <button
                onClick={() => handleReject(type, item.id)}
                className="btn-reject"
              >
                <X size={18} />
                Reject
              </button>
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="admin-container">
      <div className="admin-header">
        <div>
          <h1>Admin Dashboard</h1>
          <p>Review and approve pending submissions</p>
        </div>
      </div>

      <div className="admin-stats">
        <div className="stat-card">
          <FolderOpen size={24} />
          <div>
            <p className="stat-value">{pendingItems.projects.length}</p>
            <p className="stat-label">Pending Projects</p>
          </div>
        </div>
        <div className="stat-card">
          <FileText size={24} />
          <div>
            <p className="stat-value">{pendingItems.protocols.length}</p>
            <p className="stat-label">Pending Protocols</p>
          </div>
        </div>
        <div className="stat-card">
          <FlaskConical size={24} />
          <div>
            <p className="stat-value">{pendingItems.experiments.length}</p>
            <p className="stat-label">Pending Experiments</p>
          </div>
        </div>
      </div>

      <div className="admin-tabs">
        <button
          className={`tab-btn ${activeTab === 'projects' ? 'active' : ''}`}
          onClick={() => setActiveTab('projects')}
        >
          <FolderOpen size={18} />
          Projects ({pendingItems.projects.length})
        </button>
        <button
          className={`tab-btn ${activeTab === 'protocols' ? 'active' : ''}`}
          onClick={() => setActiveTab('protocols')}
        >
          <FileText size={18} />
          Protocols ({pendingItems.protocols.length})
        </button>
        <button
          className={`tab-btn ${activeTab === 'experiments' ? 'active' : ''}`}
          onClick={() => setActiveTab('experiments')}
        >
          <FlaskConical size={18} />
          Experiments ({pendingItems.experiments.length})
        </button>
      </div>

      <div className="admin-content">
        {loading ? (
          <div className="loading-state">Loading pending items...</div>
        ) : (
          <>
            {activeTab === 'projects' && renderItems(pendingItems.projects, 'projects')}
            {activeTab === 'protocols' && renderItems(pendingItems.protocols, 'protocols')}
            {activeTab === 'experiments' && renderItems(pendingItems.experiments, 'experiments')}
          </>
        )}
      </div>
    </div>
  )
}

export default AdminDashboard

