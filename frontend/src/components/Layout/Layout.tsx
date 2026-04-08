import React, { useEffect, useRef, useState } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { busAssistantDashboardConfig } from '../Dashboard/BusAssistantDashboard/BusAssistantDashboard'
import { transportManagerDashboardConfig } from '../Dashboard/TransportManagerDashboard/TransportManagerDashboard'
import { driverDashboardConfig } from '../Dashboard/DriverDashboard/DriverDashboard'
import { parentDashboardConfig } from '../Dashboard/ParentDashboard/ParentDashboard'
import { schoolAdminDashboardConfig } from '../Dashboard/SchoolAdminDashboard/SchoolAdminDashboard'
import type { DashboardRoleConfig } from '../Dashboard/dashboard.types'
import DashboardHeader from '../DashboardHeader/DashboardHeader'
import SideBar, { getSidebarNavigationItems } from '../SideBar/SideBar'
import './Layout.css'

const ROLE_BASE_PATH: Record<string, string> = {
  'Parent': 'parent',
  'Driver': 'driver',
  'Bus Assistant': 'bus-assistant',
  'Transport Manager': 'transport-manager',
  'School Admin': 'school-admin',
}

const ROLE_CONFIG_MAP: Record<string, DashboardRoleConfig> = {
  Parent: parentDashboardConfig,
  Driver: driverDashboardConfig,
  'Bus Assistant': busAssistantDashboardConfig,
  'Transport Manager': transportManagerDashboardConfig,
  'School Admin': schoolAdminDashboardConfig,
}

const FALLBACK_HEADER_CONFIG: DashboardRoleConfig = {
  title: 'Dashboard',
  subtitle: 'Role not configured yet.',
  quickActions: ['Help'],
  navigation: [{ id: 'overview', label: 'Overview' }],
  sections: {
    overview: {
      heading: 'Overview',
      description: 'No role-specific dashboard setup available for this account.',
      cards: [],
    },
  },
}

export const Layout: React.FC = () => {
  const { user, logout } = useAuth()
  const [activeSection, setActiveSection] = useState('overview')
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const contentRef = useRef<HTMLElement | null>(null)
  const navigate = useNavigate()
  const location = useLocation()
  const role = user?.role || ''
  
  const roleConfig = ROLE_CONFIG_MAP[role] || FALLBACK_HEADER_CONFIG
  const currentSection =
    roleConfig.sections[activeSection] ||
    roleConfig.sections[roleConfig.navigation[0]?.id] ||
    roleConfig.sections.overview
  const dashboardTitle = currentSection?.heading || roleConfig.title
  const dashboardSubtitle = currentSection?.description || roleConfig.subtitle
  const quickActions = roleConfig.quickActions
  const fullName = [user?.firstName, user?.lastName]
    .filter((namePart) => Boolean(namePart && namePart.trim()))
    .join(' ')
    .trim()
  const displayName = user?.firstName?.trim() || fullName
  const welcomeMessage = displayName ? `Welcome ${displayName}` : 'Welcome'

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen((currentValue) => !currentValue)
  }

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false)
  }

  // Sync active section with URL
  useEffect(() => {
    const pathSegments = location.pathname.split('/').filter(Boolean)
    const basePath = ROLE_BASE_PATH[role]
    
    if (pathSegments.length >= 2 && pathSegments[0] === basePath) {
      const sectionFromUrl = pathSegments[1]
      const validSection = getSidebarNavigationItems(role).find(item => item.id === sectionFromUrl)
      
      if (validSection && sectionFromUrl !== activeSection) {
        setActiveSection(sectionFromUrl)
      }
    } else {
      // Set default section if URL doesn't match
      const firstSection = getSidebarNavigationItems(role)[0]?.id || 'overview'
      setActiveSection(firstSection)
    }
  }, [location.pathname, role, activeSection])

  useEffect(() => {
    const firstSection = getSidebarNavigationItems(role)[0]?.id || 'overview'
    setActiveSection(firstSection)
    setIsMobileMenuOpen(false)

    if (contentRef.current) {
      contentRef.current.scrollTop = 0
    }
  }, [role])

  useEffect(() => {
    document.body.style.overflow = isMobileMenuOpen ? 'hidden' : ''

    return () => {
      document.body.style.overflow = ''
    }
  }, [isMobileMenuOpen])

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768) {
        setIsMobileMenuOpen(false)
      }
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return (
    <div className="layout">
      {/* Mobile Menu Button */}
      <button 
        className="mobile-menu-button" 
        onClick={toggleMobileMenu}
        aria-label="Toggle mobile menu"
        aria-expanded={isMobileMenuOpen}
        aria-controls="mobile-sidebar"
      >
        <span className={`hamburger ${isMobileMenuOpen ? 'open' : ''}`}>
          <span></span>
          <span></span>
          <span></span>
        </span>
      </button>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div className="mobile-overlay" onClick={closeMobileMenu}></div>
      )}

      <aside 
        id="mobile-sidebar"
        className={`layout__sidebar ${isMobileMenuOpen ? 'mobile-open' : ''}`}
      >
        <SideBar 
          role={role} 
          activeItem={activeSection}
          onLogout={logout}
          onSelect={(section) => {
            setActiveSection(section)
            closeMobileMenu()
            // Navigate to the specific route
            const basePath = ROLE_BASE_PATH[role]
            navigate(`/${basePath}/${section}`)
          }}
        />
      </aside>
      
      <div className="layout__main">
        <header className="layout__header">
          <DashboardHeader
            role={role}
            welcomeMessage={welcomeMessage}
            title={dashboardTitle}
            subtitle={dashboardSubtitle}
            quickActions={quickActions}
          />
        </header>
        
        <main ref={contentRef} className="layout__content">
          <Outlet context={{ activeSection, role }} />
        </main>
      </div>
    </div>
  )
}

export default Layout
