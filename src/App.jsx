import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import DashboardLayout from './components/layout/DashboardLayout';
import LandingPage from './pages/LandingPage';
import Dashboard from './pages/Dashboard';
import NewInspection from './pages/NewInspection';
import OCRResults from './pages/OCRResults';
import ComplianceResults from './pages/ComplianceResults';
import InspectionHistory from './pages/InspectionHistory';
import InspectionReport from './pages/InspectionReport';
import Reports from './pages/Reports';
import ComplianceRules from './pages/ComplianceRules';
import Settings from './pages/Settings';
import Login from './pages/Login';
import Signup from './pages/Signup';

const GOOGLE_CLIENT_ID =
  import.meta.env.VITE_GOOGLE_CLIENT_ID ||
  'placeholder-client-id.apps.googleusercontent.com';

export default function App() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <ThemeProvider>
        <ToastProvider>
          <AuthProvider>
            <BrowserRouter>
              <Routes>
                {/* 1. Public Landing Page */}
                <Route path="/" element={<LandingPage />} />

                {/* 2. Public Authentication Routes */}
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />

                {/* 3. Protected Dashboard and Inspection Suite Routes */}
                <Route
                  element={
                    <ProtectedRoute>
                      <DashboardLayout />
                    </ProtectedRoute>
                  }
                >
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/new-inspection" element={<NewInspection />} />
                  <Route path="/ocr-results" element={<OCRResults />} />
                  <Route path="/compliance-results" element={<ComplianceResults />} />
                  {/* Alias for backward compatibility */}
                  <Route path="/inspection/new" element={<Navigate to="/new-inspection" replace />} />
                  <Route path="/history" element={<InspectionHistory />} />
                  <Route
                    path="/inspections/:inspectionId/report"
                    element={<InspectionReport />}
                  />
                  <Route path="/reports" element={<Reports />} />
                  <Route path="/rules" element={<ComplianceRules />} />
                  <Route path="/settings" element={<Settings />} />
                </Route>

                {/* 4. Catch-all redirect to public homepage */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </BrowserRouter>
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </GoogleOAuthProvider>
  );
}
