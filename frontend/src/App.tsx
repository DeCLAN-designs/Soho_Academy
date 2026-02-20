import './App.css'
import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute/ProtectedRoute'
import Layout from './components/Layout/Layout'
import Login from './components/Auth/Login/Login'
import Register from './components/Auth/Register/Register'
import Dashboard from './components/Dashboard/Dashboard'

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/auth/login" element={<Login />} />
          <Route path="/auth/register" element={<Register />} />
          <Route path="/signin" element={<Login />} />
          <Route path="/signup" element={<Register />} />
          <Route path="/user/login" element={<Login />} />
          <Route path="/user/register" element={<Register />} />
          
          {/* Protected Routes */}
          <Route path="/" element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="home" element={<Dashboard />} />
            <Route path="overview" element={<Dashboard />} />
            
            {/* Role-specific routes */}
            <Route path="parent" element={<Dashboard role="Parent" />} />
            <Route path="parent/dashboard" element={<Dashboard role="Parent" />} />
            <Route path="parent/home" element={<Dashboard role="Parent" />} />
            <Route path="parent/overview" element={<Dashboard role="Parent" />} />
            
            <Route path="driver" element={<Dashboard role="Driver" />} />
            <Route path="driver/dashboard" element={<Dashboard role="Driver" />} />
            <Route path="driver/home" element={<Dashboard role="Driver" />} />
            <Route path="driver/overview" element={<Dashboard role="Driver" />} />
            
            <Route path="assistant" element={<Dashboard role="Bus Assistant" />} />
            <Route path="assistant/dashboard" element={<Dashboard role="Bus Assistant" />} />
            <Route path="assistant/home" element={<Dashboard role="Bus Assistant" />} />
            <Route path="assistant/overview" element={<Dashboard role="Bus Assistant" />} />
            
            <Route path="manager" element={<Dashboard role="Transport Manager" />} />
            <Route path="manager/dashboard" element={<Dashboard role="Transport Manager" />} />
            <Route path="manager/home" element={<Dashboard role="Transport Manager" />} />
            <Route path="manager/overview" element={<Dashboard role="Transport Manager" />} />

            <Route path="school-admin" element={<Dashboard role="School Admin" />} />
            <Route path="school-admin/dashboard" element={<Dashboard role="School Admin" />} />
            <Route path="school-admin/home" element={<Dashboard role="School Admin" />} />
            <Route path="school-admin/overview" element={<Dashboard role="School Admin" />} />
            
            {/* Additional descriptive routes */}
            <Route path="transport/dashboard" element={<Dashboard />} />
            <Route path="transport/management" element={<Dashboard />} />
            <Route path="school/dashboard" element={<Dashboard />} />
            <Route path="school/management" element={<Dashboard />} />
            
            {/* Catch all for protected routes */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Route>
          
          {/* Fallback for unauthenticated */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
