import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { FolderOpen, FlaskConical, FileText, TestTube2, TrendingUp, AlertCircle, Clock, Package } from 'lucide-react'
import './DashboardHome.css'

function DashboardHome({ profile, onNavigate }) {
  const [stats, setStats] = useState({
    projects: 0,
    experiments: 0,
    protocols: 0,
    chemicals: 0,
    products: 0,
    lowStockChemicals: 0,
    expiringChemicals: 0
  })
  const [recentActivity, setRecentActivity] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [profile])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)

      // Fetch counts
      const [projectsRes, experimentsRes, protocolsRes, chemicalsRes, productsRes] = await Promise.all([
        supabase.from('projects').select('*', { count: 'exact', head: true }),
        supabase.from('experiments').select('*', { count: 'exact', head: true }),
        supabase.from('protocols').select('*', { count: 'exact', head: true }),
        supabase.from('chemical_inventory').select('*', { count: 'exact', head: true }),
        supabase.from('products').select('*', { count: 'exact', head: true })
      ])

      // Fetch chemicals with issues
      const { data: chemicalsData } = await supabase
        .from('chemical_inventory')
        .select('*')

      const lowStock = chemicalsData?.filter(c => 
        parseFloat(c.quantity) > 0 && parseFloat(c.quantity) <= 10
      ).length || 0

      const expiring = chemicalsData?.filter(c => {
        if (!c.expiry_date) return false
        const daysUntilExpiry = Math.floor((new Date(c.expiry_date) - new Date()) / (1000 * 60 * 60 * 24))
        return daysUntilExpiry <= 30 && daysUntilExpiry >= 0
      }).length || 0

      // Fetch recent activity from all modules
      const [recentProjects, recentExperiments, recentProtocols, recentProducts] = await Promise.all([
        supabase
          .from('projects')
          .select('id, project_id, title, status, created_at, updated_at, profiles(full_name)')
          .order('updated_at', { ascending: false })
          .limit(5),
        supabase
          .from('experiments')
          .select('id, experiment_id, title, status, created_at, updated_at, profiles(full_name)')
          .order('updated_at', { ascending: false })
          .limit(5),
        supabase
          .from('protocols')
          .select('id, protocol_id, title, status, created_at, updated_at, profiles(full_name)')
          .order('updated_at', { ascending: false })
          .limit(5),
        supabase
          .from('products')
          .select('id, product_id, name, qc_tested, created_at, updated_at, profiles(full_name)')
          .order('updated_at', { ascending: false })
          .limit(5)
      ])

      // Combine and sort all recent activities
      const allActivities = [
        ...(recentProjects.data || []).map(item => ({ ...item, type: 'project', icon: FolderOpen })),
        ...(recentExperiments.data || []).map(item => ({ ...item, type: 'experiment', icon: FlaskConical })),
        ...(recentProtocols.data || []).map(item => ({ ...item, type: 'protocol', icon: FileText })),
        ...(recentProducts.data || []).map(item => ({ ...item, type: 'product', icon: Package })),
      ].sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at)).slice(0, 10)

      // Add chemicals that need attention
      const chemicalsNeedingAttention = chemicalsData?.filter(c => {
        const isLowStock = parseFloat(c.quantity) > 0 && parseFloat(c.quantity) <= 10
        const isExpiringSoon = c.expiry_date && 
          Math.floor((new Date(c.expiry_date) - new Date()) / (1000 * 60 * 60 * 24)) <= 30 &&
          Math.floor((new Date(c.expiry_date) - new Date()) / (1000 * 60 * 60 * 24)) >= 0
        return isLowStock || isExpiringSoon
      }).slice(0, 5) || []

      const chemicalActivities = chemicalsNeedingAttention.map(chem => ({
        ...chem,
        type: 'chemical-alert',
        icon: AlertCircle,
        title: chem.name,
        alert: parseFloat(chem.quantity) <= 10 ? 'Low Stock' : 'Expiring Soon'
      }))

      const combinedRecents = [...allActivities, ...chemicalActivities]
        .sort((a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at))
        .slice(0, 12)

      setStats({
        projects: projectsRes.count || 0,
        experiments: experimentsRes.count || 0,
        protocols: protocolsRes.count || 0,
        chemicals: chemicalsRes.count || 0,
        products: productsRes.count || 0,
        lowStockChemicals: lowStock,
        expiringChemicals: expiring
      })

      setRecentActivity(combinedRecents)
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const statCards = [
    { title: 'Projects', value: stats.projects, icon: FolderOpen, color: '#3b82f6', view: 'projects' },
    { title: 'Experiments', value: stats.experiments, icon: FlaskConical, color: '#8b5cf6', view: 'experiments' },
    { title: 'Protocols', value: stats.protocols, icon: FileText, color: '#06b6d4', view: 'protocols' },
    { title: 'Products', value: stats.products, icon: Package, color: '#f59e0b', view: 'products' },
    { title: 'Chemicals', value: stats.chemicals, icon: TestTube2, color: '#10b981', view: 'inventory' }
  ]

  const getTimeAgo = (date) => {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000)
    
    const intervals = {
      year: 31536000,
      month: 2592000,
      week: 604800,
      day: 86400,
      hour: 3600,
      minute: 60
    }

    for (const [unit, secondsInUnit] of Object.entries(intervals)) {
      const interval = Math.floor(seconds / secondsInUnit)
      if (interval >= 1) {
        return `${interval} ${unit}${interval > 1 ? 's' : ''} ago`
      }
    }
    
    return 'Just now'
  }

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
          <div 
            key={stat.title} 
            className="stat-card clickable"
            onClick={() => onNavigate && onNavigate(stat.view)}
            style={{ cursor: 'pointer' }}
          >
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

      {(stats.lowStockChemicals > 0 || stats.expiringChemicals > 0) && (
        <div className="alert-cards">
          {stats.lowStockChemicals > 0 && (
            <div className="alert-card alert-warning" onClick={() => onNavigate && onNavigate('inventory')}>
              <AlertCircle size={24} />
              <div>
                <h3>Low Stock Alert</h3>
                <p>{stats.lowStockChemicals} chemical(s) are running low on stock. Review inventory now.</p>
              </div>
            </div>
          )}
          {stats.expiringChemicals > 0 && (
            <div className="alert-card alert-danger" onClick={() => onNavigate && onNavigate('inventory')}>
              <Clock size={24} />
              <div>
                <h3>Expiring Soon</h3>
                <p>{stats.expiringChemicals} chemical(s) will expire within 30 days.</p>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="recent-activity-section">
        <h2>Recent Activity</h2>
        {recentActivity.length === 0 ? (
          <div className="empty-state">
            <TrendingUp size={48} />
            <p>No recent activity. Start by creating a project or experiment!</p>
          </div>
        ) : (
          <div className="activity-list">
            {recentActivity.map((item, index) => (
              <div key={`${item.type}-${item.id}-${index}`} className="activity-item">
                <div className={`activity-icon ${item.type === 'chemical-alert' ? 'alert-icon' : ''}`}>
                  <item.icon size={20} />
                </div>
                <div className="activity-info">
                  <h4>{item.title || item.name || item.plasmid_name}</h4>
                  {item.type === 'chemical-alert' ? (
                    <p className="activity-alert">
                      <strong>{item.alert}:</strong> {item.quantity} {item.unit} remaining
                      {item.expiry_date && ` • Expires ${new Date(item.expiry_date).toLocaleDateString()}`}
                    </p>
                  ) : (
                    <>
                      {(item.description || item.objective) && (
                        <p>{(item.description || item.objective)?.substring(0, 100) || 'No description'}</p>
                      )}
                    </>
                  )}
                  <div className="activity-meta">
                    <span className={`status-badge status-${(item.status || item.qc_tested || 'pending').replace(' ', '-').toLowerCase()}`}>
                      {item.type === 'chemical-alert' ? item.alert : (item.status || item.qc_tested || 'Pending')}
                    </span>
                    <span className="activity-type">{item.type.replace('-', ' ')}</span>
                    {item.profiles?.full_name && <span>by {item.profiles.full_name}</span>}
                    <span>{getTimeAgo(item.updated_at || item.created_at)}</span>
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

