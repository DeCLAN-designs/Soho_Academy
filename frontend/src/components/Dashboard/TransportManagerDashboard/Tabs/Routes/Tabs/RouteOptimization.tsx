import React, { useState, useEffect } from 'react';
import axios from 'axios';
import type { RoleSection } from '../../../../dashboard.types';
import './RouteOptimization.css';

// ─── Types ────────────────────────────────────────────────────────────────────

interface RouteOptimizationProps {
  section: RoleSection;
}

interface Route {
  id: number;
  routeCode: string;
  routeName: string;
  totalDistance: number;
  estimatedTime: number;
  studentCount: number;
  status: string;
}

interface OptimizationSuggestion {
  routeId: number;
  routeName: string;
  currentDistance: number;
  optimizedDistance: number;
  savings: number;
  suggestion: string;
  priority: 'high' | 'medium' | 'low';
}

// ─── Main Component ───────────────────────────────────────────────────────────

const RouteOptimization: React.FC<RouteOptimizationProps> = ({ section }) => {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [suggestions, setSuggestions] = useState<OptimizationSuggestion[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'}/api`;

  const axiosInstance = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true,
    headers: { 'Content-Type': 'application/json' },
  });

  axiosInstance.interceptors.request.use((config) => {
    const token = localStorage.getItem('soho_auth_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  });

  useEffect(() => {
    fetchRoutes();
  }, []);

  const fetchRoutes = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axiosInstance.get('/routes');
      const routesData = response.data?.data?.routes || response.data?.routes || [];
      setRoutes(routesData.filter((r: Route) => r.status === 'Active'));
    } catch (err) {
      console.error('Error fetching routes:', err);
      setError('Failed to load routes. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const analyzeRoutes = () => {
    setIsAnalyzing(true);
    // Simulate optimization analysis
    setTimeout(() => {
      const mockSuggestions: OptimizationSuggestion[] = routes.map(route => ({
        routeId: route.id,
        routeName: route.routeName,
        currentDistance: route.totalDistance || Math.floor(Math.random() * 50) + 20,
        optimizedDistance: Math.floor((route.totalDistance || Math.floor(Math.random() * 50) + 20) * 0.85),
        savings: Math.floor(Math.random() * 20) + 5,
        suggestion: getRandomSuggestion(),
        priority: Math.random() > 0.5 ? 'high' : Math.random() > 0.5 ? 'medium' : 'low'
      }));
      setSuggestions(mockSuggestions);
      setIsAnalyzing(false);
    }, 1500);
  };

  const getRandomSuggestion = () => {
    const suggestions = [
      'Consider consolidating stops 3 and 4 to reduce backtracking',
      'Alternative route via Highway A1 could save 3.2 km',
      'Reorder stops to follow clockwise pattern for efficiency',
      'Combine morning and evening routes for better utilization',
      'Shift departure time by 15 minutes to avoid peak traffic'
    ];
    return suggestions[Math.floor(Math.random() * suggestions.length)];
  };

  const applyOptimization = (routeId: number) => {
    setSelectedRoute(routeId);
    // In a real implementation, this would call an API to apply the optimization
    alert('Optimization applied successfully! (This is a demo)');
  };

  const totalSavings = suggestions.reduce((acc, s) => acc + s.savings, 0);
  const avgSavings = suggestions.length > 0 ? Math.round(totalSavings / suggestions.length) : 0;

  return (
    <div className="ro-page">
      {/* Page Header */}
      <div className="ro-page-header">
        <h1 className="ro-page-title">{section.heading}</h1>
        <p className="ro-page-sub">{section.description}</p>
      </div>

      {/* Stats Overview */}
      <div className="ro-stats-grid">
        <div className="ro-stat-card">
          <div className="ro-stat-icon ro-stat-icon--distance">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"></path>
            </svg>
          </div>
          <div className="ro-stat-content">
            <div className="ro-stat-value">{totalSavings} km</div>
            <div className="ro-stat-label">Total Distance Savings</div>
          </div>
        </div>
        <div className="ro-stat-card">
          <div className="ro-stat-icon ro-stat-icon--time">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
          </div>
          <div className="ro-stat-content">
            <div className="ro-stat-value">{avgSavings}%</div>
            <div className="ro-stat-label">Average Efficiency Gain</div>
          </div>
        </div>
        <div className="ro-stat-card">
          <div className="ro-stat-icon ro-stat-icon--routes">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"></path>
            </svg>
          </div>
          <div className="ro-stat-content">
            <div className="ro-stat-value">{routes.length}</div>
            <div className="ro-stat-label">Active Routes Analyzed</div>
          </div>
        </div>
        <div className="ro-stat-card">
          <div className="ro-stat-icon ro-stat-icon--fuel">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 22v-8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8"></path>
              <path d="M18 10h2a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2h-2"></path>
              <path d="M14 22v-4a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v4"></path>
            </svg>
          </div>
          <div className="ro-stat-content">
            <div className="ro-stat-value">~KSh {Math.round(totalSavings * 120)}</div>
            <div className="ro-stat-label">Estimated Fuel Savings</div>
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="ro-action-bar">
        <button 
          className="ro-analyze-btn"
          onClick={analyzeRoutes}
          disabled={isAnalyzing || routes.length === 0}
        >
          {isAnalyzing ? (
            <>
              <svg className="ro-spinner" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" strokeDasharray="4 4"></circle>
              </svg>
              Analyzing Routes...
            </>
          ) : (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              Analyze Routes for Optimization
            </>
          )}
        </button>
      </div>

      {loading ? (
        <div className="ro-loading">Loading routes...</div>
      ) : error ? (
        <div className="ro-error">{error}</div>
      ) : suggestions.length === 0 ? (
        <div className="ro-empty">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"></path>
          </svg>
          <h3>No Optimization Data</h3>
          <p>Click "Analyze Routes" to generate optimization suggestions for your active routes.</p>
        </div>
      ) : (
        <div className="ro-suggestions-grid">
          {suggestions.map((suggestion) => (
            <div key={suggestion.routeId} className="ro-suggestion-card">
              <div className="ro-suggestion-header">
                <div className="ro-suggestion-title">
                  <h3>{suggestion.routeName}</h3>
                  <span className={`ro-priority-badge ro-priority--${suggestion.priority}`}>
                    {suggestion.priority} priority
                  </span>
                </div>
                <div className="ro-savings-badge">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
                    <polyline points="17 6 23 6 23 12"></polyline>
                  </svg>
                  {suggestion.savings}% savings
                </div>
              </div>

              <div className="ro-suggestion-metrics">
                <div className="ro-metric">
                  <span className="ro-metric-label">Current Distance</span>
                  <span className="ro-metric-value">{suggestion.currentDistance} km</span>
                </div>
                <div className="ro-metric-divider">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                    <polyline points="12 5 19 12 12 19"></polyline>
                  </svg>
                </div>
                <div className="ro-metric">
                  <span className="ro-metric-label">Optimized Distance</span>
                  <span className="ro-metric-value ro-metric-value--optimized">{suggestion.optimizedDistance} km</span>
                </div>
              </div>

              <div className="ro-suggestion-text">
                <p>{suggestion.suggestion}</p>
              </div>

              <div className="ro-suggestion-actions">
                <button 
                  className="ro-action-btn ro-action-btn--secondary"
                  onClick={() => setSelectedRoute(suggestion.routeId)}
                >
                  View Details
                </button>
                <button 
                  className="ro-action-btn ro-action-btn--primary"
                  onClick={() => applyOptimization(suggestion.routeId)}
                >
                  Apply Optimization
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RouteOptimization;