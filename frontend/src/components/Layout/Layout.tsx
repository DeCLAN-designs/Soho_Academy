import React, { useEffect, useRef, useState } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { busAssistantDashboardConfig } from '../Dashboard/BusAssistantDashboard/BusAssistantDashboard'
import { transportManagerDashboardConfig } from '../Dashboard/TransportManagerDashboard/transportManagerDashboard.config'
import { driverDashboardConfig } from '../Dashboard/DriverDashboard/DriverDashboard'
import { parentDashboardConfig } from '../Dashboard/ParentDashboard/ParentDashboard'
import { schoolAdminDashboardConfig } from '../Dashboard/SchoolAdminDashboard/SchoolAdminDashboard'
import type { DashboardRoleConfig } from '../Dashboard/dashboard.types'
import DashboardHeader from '../DashboardHeader/DashboardHeader'
import Loader from '../Loader/Loader'
import SideBar from '../SideBar/SideBar'
import { getSidebarNavigationFlatItems } from '../SideBar/sidebarNavigation'
import './Layout.css'

const MIN_SECTION_TRANSITION_MS = 550

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

const resolveActiveSection = (role: string, pathname: string) => {
  const navigationItems = getSidebarNavigationFlatItems(role)
  const defaultSectionId = navigationItems[0]?.id || 'overview'
  const pathSegments = pathname.split('/').filter(Boolean)
  const basePath = ROLE_BASE_PATH[role]

  if (pathSegments.length === 1 && pathSegments[0] === 'dashboard') {
    return defaultSectionId
  }

  if (pathSegments.length >= 2 && pathSegments[0] === 'dashboard') {
    const sectionFromUrl = pathSegments[1]
    const isValidSection = navigationItems.some((item) => item.id === sectionFromUrl)

    return isValidSection ? sectionFromUrl : defaultSectionId
  }

  if (pathSegments.length >= 2 && basePath && pathSegments[0] === basePath) {
    const sectionFromUrl = pathSegments[1]
    const isValidSection = navigationItems.some((item) => item.id === sectionFromUrl)

    return isValidSection ? sectionFromUrl : defaultSectionId
  }

  return defaultSectionId
}

const buildSectionPath = (role: string, section: string) => {
  const basePath = ROLE_BASE_PATH[role]

  if (!basePath) {
    return '/dashboard'
  }

  return `/${basePath}/${section}`
}

export const Layout: React.FC = () => {
  const { user, logout } = useAuth()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isSectionTransitioning, setIsSectionTransitioning] = useState(false)
  const [transitionLabel, setTransitionLabel] = useState('Loading')
  const contentRef = useRef<HTMLElement | null>(null)
  const transitionTimeoutRef = useRef<ReturnType<typeof window.setTimeout> | null>(null)
  const transitionStartedAtRef = useRef(0)
  const transitionPathRef = useRef('')
  const transitionTokenRef = useRef(0)
  const navigate = useNavigate()
  const location = useLocation()
  const role = user?.role || ''
  const activeSection = resolveActiveSection(role, location.pathname)
  
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

  const clearTransitionTimeout = () => {
    if (transitionTimeoutRef.current) {
      window.clearTimeout(transitionTimeoutRef.current)
      transitionTimeoutRef.current = null
    }
  }

  useEffect(() => {
    setIsMobileMenuOpen(false)

    if (contentRef.current) {
      contentRef.current.scrollTop = 0
    }
  }, [location.pathname, role])

  useEffect(() => {
    document.body.style.overflow = isMobileMenuOpen ? 'hidden' : ''

    return () => {
      document.body.style.overflow = ''
    }
  }, [isMobileMenuOpen])

  useEffect(() => {
    if (!isSectionTransitioning) {
      return
    }

    if (!transitionPathRef.current || location.pathname !== transitionPathRef.current) {
      return
    }

    clearTransitionTimeout()

    const activeToken = transitionTokenRef.current
    const elapsed = Date.now() - transitionStartedAtRef.current
    const remainingDuration = Math.max(0, MIN_SECTION_TRANSITION_MS - elapsed)

    transitionTimeoutRef.current = window.setTimeout(() => {
      if (activeToken !== transitionTokenRef.current) {
        return
      }

      setIsSectionTransitioning(false)
      setTransitionLabel('Loading')
      transitionPathRef.current = ''
      transitionStartedAtRef.current = 0
      transitionTimeoutRef.current = null
    }, remainingDuration)

    return () => {
      clearTransitionTimeout()
    }
  }, [isSectionTransitioning, location.pathname])

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768) {
        setIsMobileMenuOpen(false)
      }
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    return () => {
      clearTransitionTimeout()
    }
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
            const navigationItems = getSidebarNavigationFlatItems(role)
            const sectionLabel =
              navigationItems.find((item) => item.id === section)?.label || 'Section'
            const targetPath = buildSectionPath(role, section)

            closeMobileMenu()

            if (section === activeSection || targetPath === location.pathname) {
              return
            }

            transitionTokenRef.current += 1
            transitionStartedAtRef.current = Date.now()
            transitionPathRef.current = targetPath
            setTransitionLabel(`Loading ${sectionLabel}`)
            setIsSectionTransitioning(true)
            clearTransitionTimeout()
            navigate(targetPath)
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
            userName={fullName || displayName}
            profilePhotoUrl={user?.profilePhotoUrl || null}
          />
        </header>
        
        <main
          ref={contentRef}
          className={isSectionTransitioning ? 'layout__content layout__content--transitioning' : 'layout__content'}
        >
          <div className="layout__contentInner">
            <Outlet context={{ activeSection, role }} />
          </div>

          <div className="layout__transitionOverlay" aria-hidden={!isSectionTransitioning}>
            <Loader
              variant="inline"
              label={transitionLabel}
              className="layout__transitionLoader"
            />
          </div>
        </main>
      </div>
    </div>
  )
}

export default Layout
