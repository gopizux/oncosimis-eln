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
  Shield,
  Package,
  Dna,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import ProjectsView from '../components/ProjectsView'
import ProtocolsView from '../components/ProtocolsView'
import ExperimentsView from '../components/ExperimentsView'
import ChemicalInventoryView from '../components/ChemicalInventoryView'
import DashboardHome from '../components/DashboardHome'
import AdminDashboard from '../components/AdminDashboard'
import ProductsView from '../components/ProductsView'
import PlasmidOrdersView from '../components/PlasmidOrdersView'
import './Dashboard.css'

function Dashboard({ session }) {
  const [activeView, setActiveView] = useState('home')
  const [profile, setProfile] = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

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
    if (window.innerWidth < 768) {
      setSidebarOpen(false)
    }
  }

  const isAdmin = profile?.role === 'admin'
  const isResearchAssociate = profile?.role === 'research_associate'
  const isAccounts = profile?.role === 'accounts'
  const isGuest = profile?.role === 'guest'

  const menuItems = [
    { id: 'home', label: 'Dashboard', icon: Home },
    ...(isAdmin ? [{ id: 'admin', label: 'Admin Panel', icon: Shield }] : []),
    // Accounts only sees Chemical Inventory
    ...(!isAccounts ? [
      { id: 'projects', label: 'Projects', icon: FolderOpen },
      { id: 'experiments', label: 'Experiments', icon: FlaskConical },
      { id: 'protocols', label: 'Protocols', icon: FileText },
      { id: 'products', label: 'Products', icon: Package },
    ] : []),
    { id: 'inventory', label: 'Chemical Inventory', icon: TestTube2 },
    ...(isAdmin ? [{ id: 'plasmids', label: 'Plasmid Orders', icon: Dna }] : []),
  ]

  const getRoleDisplay = (role) => {
    const roleMap = {
      'admin': 'Admin',
      'research_associate': 'Research Associate',
      'accounts': 'Accounts',
      'guest': 'Guest'
    }
    return roleMap[role] || role
  }

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

      <aside className={`sidebar ${sidebarOpen ? 'open' : ''} ${sidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-header">
          <img src="/favicon-32x32.png" alt="Oncosimis" className="sidebar-logo-round" />
          {!sidebarCollapsed && (
            <div className="sidebar-title">
              <h2>Oncosimis ELN</h2>
              <p>Lost files? Not in this lab</p>
            </div>
          )}
        </div>

        <button 
          className="sidebar-toggle-btn"
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {sidebarCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>

        <nav className="sidebar-nav">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              className={`nav-item ${activeView === item.id ? 'active' : ''}`}
              title={sidebarCollapsed ? item.label : ''}
            >
              <item.icon size={20} />
              {!sidebarCollapsed && <span>{item.label}</span>}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-avatar">
              {profile?.full_name?.charAt(0) || session.user.email.charAt(0).toUpperCase()}
            </div>
            {!sidebarCollapsed && (
              <div className="user-details">
                <p className="user-name">{profile?.full_name || 'User'}</p>
                <p className="user-role">{getRoleDisplay(profile?.role) || 'Loading...'}</p>
              </div>
            )}
          </div>
          <button onClick={handleSignOut} className="btn-logout" title="Sign Out">
            <LogOut size={20} />
          </button>
        </div>

        <div className="developer-contact">
          <a href="mailto:gopizux@gmail.com?subject=Feedback%20on%20ELN%20App" className="dev-link">
            <span>💬</span>
            {!sidebarCollapsed && (
              <div>
                <p>Talk to Developer</p>
                <small>Something broke? Tell the Dev before it mutates</small>
              </div>
            )}
          </a>
        </div>
      </aside>

      <main className={`main-content ${sidebarCollapsed ? 'expanded' : ''}`}>
        {activeView === 'home' && <DashboardHome profile={profile} onNavigate={setActiveView} />}
        {activeView === 'admin' && isAdmin && <AdminDashboard profile={profile} />}
        {activeView === 'projects' && <ProjectsView profile={profile} />}
        {activeView === 'experiments' && <ExperimentsView profile={profile} />}
        {activeView === 'protocols' && <ProtocolsView profile={profile} />}
        {activeView === 'products' && <ProductsView profile={profile} />}
        {activeView === 'inventory' && <ChemicalInventoryView profile={profile} />}
        {activeView === 'plasmids' && isAdmin && <PlasmidOrdersView profile={profile} />}
      </main>
    </div>
  )
}

export default Dashboard

