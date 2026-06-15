import React, { useState } from 'react';
import type { RoleSection } from '../../../../dashboard.types';
import './RouteOptimization.css';

// ─── Types ────────────────────────────────────────────────────────────────────

interface RouteOptimizationProps {
  section: RoleSection;
}

// ─── Main Component ───────────────────────────────────────────────────────────

const RouteOptimization: React.FC<RouteOptimizationProps> = ({ section }) => {
  const [notifyMessage, setNotifyMessage] = useState<string | null>(null);
  const [notifyEmail, setNotifyEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleNotify = async () => {
    if (!notifyEmail.trim()) {
      setNotifyMessage('Please enter your email address.');
      setTimeout(() => setNotifyMessage(null), 3000);
      return;
    }

    setIsSubmitting(true);
    
    // Simulate API call - replace with actual endpoint when ready
    try {
      // await axiosInstance.post('/optimization/notify', { email: notifyEmail });
      console.log('Notification requested for:', notifyEmail);
      setNotifyMessage('Thank you! We will notify you when this feature becomes available.');
      setNotifyEmail('');
      setTimeout(() => setNotifyMessage(null), 5000);
    } catch {
      setNotifyMessage('Something went wrong. Please try again later.');
      setTimeout(() => setNotifyMessage(null), 3000);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="ro-page">

      {/* Page Header */}
      <div className="ro-page-header">
        <div className="ro-title-row">
          <h1 className="ro-page-title">{section.heading}</h1>
          <span className="ro-coming-soon-badge">Coming Soon</span>
        </div>
        <p className="ro-page-sub">{section.description}</p>
      </div>

      {/* Notice Banner */}
      <div className="ro-banner">
        <div className="ro-banner-icon">🔮</div>
        <div className="ro-banner-content">
          <h3 className="ro-banner-title">Route Optimization — In Development</h3>
          <p className="ro-banner-text">
            This feature is currently under active development. When complete, it will include 
            distance optimization, fuel-efficient routing, traffic-aware planning, and real-time 
            route adjustments based on current road conditions.
          </p>
        </div>
      </div>

      {/* Preview Cards Grid */}
      <div className="ro-preview-grid">
        
        {/* Card 1: Distance Optimizer */}
        <div className="ro-preview-card ro-preview-card--muted">
          <div className="ro-preview-card-header">
            <div className="ro-preview-icon">📏</div>
            <div className="ro-preview-pill">Preview</div>
          </div>
          <h3 className="ro-preview-title">Distance Optimizer</h3>
          <div className="ro-preview-value">~47 km saved/week</div>
          <p className="ro-preview-description">
            Suggested shorter routes with alternative paths that reduce overall distance by up to 23%.
          </p>
          <div className="ro-preview-stats">
            <div className="ro-preview-stat">
              <span className="ro-preview-stat-label">Current avg.</span>
              <span className="ro-preview-stat-value">204 km/week</span>
            </div>
            <div className="ro-preview-stat">
              <span className="ro-preview-stat-label">Optimized</span>
              <span className="ro-preview-stat-value">157 km/week</span>
            </div>
          </div>
          <div className="ro-preview-lock">
            <LockIcon />
            <span>Available in full release</span>
          </div>
        </div>

        {/* Card 2: Fuel Savings Estimator */}
        <div className="ro-preview-card ro-preview-card--muted">
          <div className="ro-preview-card-header">
            <div className="ro-preview-icon">⛽</div>
            <div className="ro-preview-pill">Preview</div>
          </div>
          <h3 className="ro-preview-title">Fuel Savings Estimator</h3>
          <div className="ro-preview-value">~KSh 6,200 / month</div>
          <p className="ro-preview-description">
            Projected reduction in fuel costs based on efficient routing and reduced idling time.
          </p>
          <div className="ro-preview-stats">
            <div className="ro-preview-stat">
              <span className="ro-preview-stat-label">Current avg.</span>
              <span className="ro-preview-stat-value">KSh 28,500</span>
            </div>
            <div className="ro-preview-stat">
              <span className="ro-preview-stat-label">Projected</span>
              <span className="ro-preview-stat-value">KSh 22,300</span>
            </div>
          </div>
          <div className="ro-preview-lock">
            <LockIcon />
            <span>Available in full release</span>
          </div>
        </div>

        {/* Card 3: Traffic-Aware Planning */}
        <div className="ro-preview-card ro-preview-card--muted">
          <div className="ro-preview-card-header">
            <div className="ro-preview-icon">🚦</div>
            <div className="ro-preview-pill">Preview</div>
          </div>
          <h3 className="ro-preview-title">Traffic-Aware Planning</h3>
          <div className="ro-preview-value">Peak hour avoidance</div>
          <p className="ro-preview-description">
            Alternate route suggestions during heavy traffic, real-time congestion monitoring, 
            and dynamic re-routing.
          </p>
          <div className="ro-preview-features">
            <div className="ro-preview-feature">
              <CheckIcon />
              <span>Morning peak (7:00-9:00)</span>
            </div>
            <div className="ro-preview-feature">
              <CheckIcon />
              <span>Evening peak (16:30-18:30)</span>
            </div>
            <div className="ro-preview-feature ro-preview-feature--muted">
              <ClockIcon />
              <span>Real-time traffic data</span>
            </div>
          </div>
          <div className="ro-preview-lock">
            <LockIcon />
            <span>Available in full release</span>
          </div>
        </div>
      </div>

      {/* Notify Section */}
      <div className="ro-notify-section">
        <div className="ro-notify-content">
          <h3 className="ro-notify-title">Be the first to know</h3>
          <p className="ro-notify-text">
            Get notified when Route Optimization is ready. We'll send you an email 
            as soon as this feature launches.
          </p>
        </div>
        <div className="ro-notify-form">
          <div className="ro-notify-input-group">
            <input
              type="email"
              className="ro-notify-input"
              placeholder="Enter your email address"
              value={notifyEmail}
              onChange={(e) => setNotifyEmail(e.target.value)}
              disabled={isSubmitting}
            />
            <button
              className="ro-notify-btn"
              onClick={handleNotify}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Sending...' : 'Notify me when available'}
            </button>
          </div>
          {notifyMessage && (
            <div className={`ro-notify-message ${notifyMessage.includes('Thank you') ? 'ro-notify-message--success' : 'ro-notify-message--error'}`}>
              {notifyMessage.includes('Thank you') ? <BellIcon /> : <AlertIcon />}
              <span>{notifyMessage}</span>
            </div>
          )}
        </div>
      </div>

      {/* Roadmap Timeline */}
      <div className="ro-roadmap">
        <h3 className="ro-roadmap-title">Feature Roadmap</h3>
        <div className="ro-timeline">
          <div className="ro-timeline-item">
            <div className="ro-timeline-dot ro-timeline-dot--completed" />
            <div className="ro-timeline-content">
              <div className="ro-timeline-header">
                <span className="ro-timeline-phase">Phase 1</span>
                <span className="ro-timeline-status ro-timeline-status--completed">Completed</span>
              </div>
              <h4 className="ro-timeline-name">Route Data Collection</h4>
              <p className="ro-timeline-desc">Gathering historical route data and stop patterns</p>
            </div>
          </div>
          <div className="ro-timeline-item">
            <div className="ro-timeline-dot ro-timeline-dot--completed" />
            <div className="ro-timeline-content">
              <div className="ro-timeline-header">
                <span className="ro-timeline-phase">Phase 2</span>
                <span className="ro-timeline-status ro-timeline-status--completed">Completed</span>
              </div>
              <h4 className="ro-timeline-name">Distance Calculation Engine</h4>
              <p className="ro-timeline-desc">Implementing shortest path algorithms for route optimization</p>
            </div>
          </div>
          <div className="ro-timeline-item">
            <div className="ro-timeline-dot ro-timeline-dot--active" />
            <div className="ro-timeline-content">
              <div className="ro-timeline-header">
                <span className="ro-timeline-phase">Phase 3</span>
                <span className="ro-timeline-status ro-timeline-status--active">In Progress</span>
              </div>
              <h4 className="ro-timeline-name">Fuel & Traffic Integration</h4>
              <p className="ro-timeline-desc">Connecting with fuel price APIs and live traffic data</p>
            </div>
          </div>
          <div className="ro-timeline-item">
            <div className="ro-timeline-dot ro-timeline-dot--upcoming" />
            <div className="ro-timeline-content">
              <div className="ro-timeline-header">
                <span className="ro-timeline-phase">Phase 4</span>
                <span className="ro-timeline-status ro-timeline-status--upcoming">Upcoming</span>
              </div>
              <h4 className="ro-timeline-name">Full Launch</h4>
              <p className="ro-timeline-desc">Release of complete optimization dashboard with real-time recommendations</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Icons ────────────────────────────────────────────────────────────────────

const LockIcon: React.FC = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

const CheckIcon: React.FC = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const ClockIcon: React.FC = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const BellIcon: React.FC = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
);

const AlertIcon: React.FC = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

export default RouteOptimization;