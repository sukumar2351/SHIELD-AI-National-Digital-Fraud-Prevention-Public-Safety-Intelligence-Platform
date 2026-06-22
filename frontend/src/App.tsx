import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Dashboard } from './pages/Dashboard';
import { FraudDNA } from './pages/FraudDNA';
import { FraudGraph } from './pages/FraudGraph';
import { InvestigationCenter } from './pages/InvestigationCenter';
import { GeospatialDashboard } from './pages/GeospatialDashboard';
import { CitizenCopilot } from './pages/CitizenCopilot';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/dna" element={<FraudDNA />} />
        <Route path="/graph" element={<FraudGraph />} />
        <Route path="/investigations" element={<InvestigationCenter />} />
        <Route path="/geospatial" element={<GeospatialDashboard />} />
        <Route path="/copilot" element={<CitizenCopilot />} />
        {/* Redirect default and unmatched routes to /dashboard */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
