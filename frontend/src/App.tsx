import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { FraudDNA } from './pages/FraudDNA';
import { FraudGraph } from './pages/FraudGraph';
import { InvestigationCenter } from './pages/InvestigationCenter';
import { GeospatialDashboard } from './pages/GeospatialDashboard';
import { CitizenCopilot } from './pages/CitizenCopilot';
import { ProfilePage } from './pages/ProfilePage';
import { MyAccountPage } from './pages/MyAccountPage';
import { SettingsPage } from './pages/SettingsPage';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />
          <Route path="/dna" element={
            <ProtectedRoute>
              <FraudDNA />
            </ProtectedRoute>
          } />
          <Route path="/graph" element={
            <ProtectedRoute>
              <FraudGraph />
            </ProtectedRoute>
          } />
          <Route path="/investigations" element={
            <ProtectedRoute>
              <InvestigationCenter />
            </ProtectedRoute>
          } />
          <Route path="/geospatial" element={
            <ProtectedRoute>
              <GeospatialDashboard />
            </ProtectedRoute>
          } />
          <Route path="/copilot" element={
            <ProtectedRoute>
              <CitizenCopilot />
            </ProtectedRoute>
          } />
          <Route path="/profile" element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          } />
          <Route path="/my-account" element={
            <ProtectedRoute>
              <MyAccountPage />
            </ProtectedRoute>
          } />
          <Route path="/settings" element={
            <ProtectedRoute>
              <SettingsPage />
            </ProtectedRoute>
          } />
          
          {/* Redirect default and unmatched routes to /dashboard */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
