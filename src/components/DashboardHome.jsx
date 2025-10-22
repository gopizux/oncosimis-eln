import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { FolderOpen, FlaskConical, FileText, TestTube2, TrendingUp, AlertCircle } from 'lucide-react'
import './DashboardHome.css'

function DashboardHome({ profile }) {
  const [stats, setStats] = useState({
    projects: 0,
    experiments: 0,
    protocols: 0,
    chemicals: 0,
    lowStockChemicals: 0,
    recentActivity: []
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [profile])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)

      // Fetch counts
      const [projectsRes, experimentsRes, protocolsRes, chemicalsRes, lowStockRes] = await Promise.all([
        supabase.from('projects').select('*', { count: 'exact', head: true }),
        supabase.from('experiments').select('*', { count: 'exact', head: true }),
        supabase.from('protocols').select('*', { count: 'exact', head: true }),
        supabase.from('chemical_inventory').select('*', { count: 'exact', head: true }),
        supabase.from('chemical_inventory').select('*', { count: 'exact', head: true }).eq('status', 'Low Stock')
      ])

      // Fetch recent activity
      const { data: recentProjects } = await supabase
        .from('projects')
        .select('*, profiles(full_name)')
        .order('created_at', { ascending: false })
        .limit(5)

      setStats({
        projects: projectsRes.count || 0,
        experiments: experimentsRes.count || 0,
        protocols: protocolsRes.count || 0,
        chemicals: chemicalsRes.count || 0,
        lowStockChemicals: lowStockRes.count || 0,
        recentActivity: recentProjects || []
      })
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const statCards = [
    { title: 'Projects', value: stats.projects, icon: FolderOpen, color: '#3b82f6' },
    { title: 'Experiments', value: stats.experiments, icon: FlaskConical, color: '#8b5cf6' },
    { title: 'Protocols', value: stats.protocols, icon: FileText, color: '#06b6d4' },
    { title: 'Chemicals', value: stats.chemicals, icon: TestTube2, color: '#10b981' }
  ]

  if (loading) {
    return (
      <div className="dashboard-home">
        <div className="loading">Loading dashboard...</div>
      </div>
    )
  }

  return (
    <div className="dashboard-home">
      <div className="page-header">
        <div>
          <h1>Welcome back, {profile?.full_name || 'Researcher'}!</h1>
          <p>Here's what's happening in your lab today</p>
        </div>
      </div>

      <div className="stats-grid">
        {statCards.map((stat) => (
          <div key={stat.title} className="stat-card">
            <div className="stat-icon" style={{ background: `${stat.color}15`, color: stat.color }}>
              <stat.icon size={24} />
            </div>
            <div className="stat-info">
              <p className="stat-label">{stat.title}</p>
              <p className="stat-value">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {stats.lowStockChemicals > 0 && (
        <div className="alert-card">
          <AlertCircle size={24} />
          <div>
            <h3>Low Stock Alert</h3>
            <p>{stats.lowStockChemicals} chemical(s) are running low on stock. Please review and reorder.</p>
          </div>
        </div>
      )}

      <div className="recent-activity-section">
        <h2>Recent Projects</h2>
        {stats.recentActivity.length === 0 ? (
          <div className="empty-state">
            <FolderOpen size={48} />
            <p>No projects yet. Create your first project to get started!</p>
          </div>
        ) : (
          <div className="activity-list">
            {stats.recentActivity.map((project) => (
              <div key={project.id} className="activity-item">
                <div className="activity-icon">
                  <FolderOpen size={20} />
                </div>
                <div className="activity-info">
                  <h4>{project.title}</h4>
                  <p>{project.description?.substring(0, 100) || 'No description'}</p>
                  <div className="activity-meta">
                    <span className={`status-badge status-${project.status.replace(' ', '-').toLowerCase()}`}>
                      {project.status}
                    </span>
                    <span>Created by {project.profiles?.full_name || 'Unknown'}</span>
                    <span>{new Date(project.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default DashboardHome

