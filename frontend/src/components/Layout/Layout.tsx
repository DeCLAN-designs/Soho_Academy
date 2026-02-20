import React, { useEffect, useRef, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { busAssistantDashboardConfig } from '../Dashboard/BusAssistantDashboard/BusAssistantDashboard'
import { driverDashboardConfig } from '../Dashboard/DriverDashboard/DriverDashboard'
import { parentDashboardConfig } from '../Dashboard/ParentDashboard/ParentDashboard'
import { schoolAdminDashboardConfig } from '../Dashboard/SchoolAdminDashboard/SchoolAdminDashboard'
import { transportManagerDashboardConfig } from '../Dashboard/TransportManagerDashboard/TransportManagerDashboard'
import type { DashboardRoleConfig } from '../Dashboard/dashboard.types'
import DashboardHeader from '../DashboardHeader/DashboardHeader'
import SideBar, { getSidebarNavigationItems } from '../SideBar/SideBar'
import './Layout.css'

const MOBILE_LAYOUT_BREAKPOINT = 768
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

const ROLE_CONFIG_MAP: Record<string, DashboardRoleConfig> = {
  Parent: parentDashboardConfig,
  Driver: driverDashboardConfig,
  'Bus Assistant': busAssistantDashboardConfig,
  'Transport Manager': transportManagerDashboardConfig,
  'School Admin': schoolAdminDashboardConfig,
}

export const Layout: React.FC = () => {
  const { user, logout } = useAuth()
  const [activeSection, setActiveSection] = useState('overview')
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const contentRef = useRef<HTMLElement | null>(null)
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
      if (window.innerWidth > MOBILE_LAYOUT_BREAKPOINT) {
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
