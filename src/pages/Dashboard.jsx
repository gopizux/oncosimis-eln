import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { 
  Home, 
  FolderOpen, 
  FlaskConical, 
  FileText, 
  TestTube2, 
  BarChart3, 
  Settings, 
  LogOut,
  Plus,
  Search,
  Filter,
  Menu,
  X,
  Shield
} from 'lucide-react'
import ProjectsView from '../components/ProjectsView'
import ProtocolsView from '../components/ProtocolsView'
import ExperimentsView from '../components/ExperimentsView'
import ChemicalInventoryView from '../components/ChemicalInventoryView'
import DashboardHome from '../components/DashboardHome'
import AdminDashboard from '../components/AdminDashboard'
import './Dashboard.css'

function Dashboard({ session }) {
  const [activeView, setActiveView] = useState('home')
  const [profile, setProfile] = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    fetchProfile()
  }, [session])

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single()

      if (error && error.code === 'PGRST116') {
        await new Promise(resolve => setTimeout(resolve, 1000))
        const { data: retryData, error: retryError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()
        
        if (!retryError) {
          setProfile(retryData)
        }
      } else if (error) {
        console.error('Error fetching profile:', error)
      } else {
        setProfile(data)
      }
    } catch (error) {
      console.error('Error fetching profile:', error)
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
  }

  const handleNavClick = (viewId) => {
    setActiveView(viewId)
    setSidebarOpen(false)
  }

  const isAdmin = profile?.role === 'admin' || profile?.role === 'principal_investigator'

  const menuItems = [
    { id: 'home', label: 'Dashboard', icon: Home },
    ...(isAdmin ? [{ id: 'admin', label: 'Admin Panel', icon: Shield }] : []),
    { id: 'projects', label: 'Projects', icon: FolderOpen },
    { id: 'experiments', label: 'Experiments', icon: FlaskConical },
    { id: 'protocols', label: 'Protocols', icon: FileText },
    { id: 'inventory', label: 'Chemical Inventory', icon: TestTube2 },
  ]

  return (
    <div className="dashboard">
      <button 
        className="mobile-menu-btn"
        onClick={() => setSidebarOpen(!sidebarOpen)}
        aria-label="Toggle menu"
      >
        {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {sidebarOpen && (
        <div 
          className="sidebar-overlay" 
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <img src="/favicon-32x32.png" alt="Oncosimis" className="sidebar-logo" />
          <div className="sidebar-title">
            <h2>Oncosimis ELN</h2>
            <p>Electronic Lab Notebook</p>
          </div>
        </div>

        <nav className="sidebar-nav">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              className={`nav-item ${activeView === item.id ? 'active' : ''}`}
            >
              <item.icon size={20} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-avatar">
              {profile?.full_name?.charAt(0) || session.user.email.charAt(0).toUpperCase()}
            </div>
            <div className="user-details">
              <p className="user-name">{profile?.full_name || 'User'}</p>
              <p className="user-role">{profile?.role?.replace('_', ' ') || 'Researcher'}</p>
            </div>
          </div>
          <button onClick={handleSignOut} className="btn-logout" title="Sign Out">
            <LogOut size={20} />
          </button>
        </div>
      </aside>

      <main className="main-content">
        {activeView === 'home' && <DashboardHome profile={profile} />}
        {activeView === 'admin' && isAdmin && <AdminDashboard profile={profile} />}
        {activeView === 'projects' && <ProjectsView profile={profile} />}
        {activeView === 'experiments' && <ExperimentsView profile={profile} />}
        {activeView === 'protocols' && <ProtocolsView profile={profile} />}
        {activeView === 'inventory' && <ChemicalInventoryView profile={profile} />}
      </main>
    </div>
  )
}

export default Dashboard

