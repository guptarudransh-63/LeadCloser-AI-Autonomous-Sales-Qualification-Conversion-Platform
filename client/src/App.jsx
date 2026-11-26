import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import Header from './components/Header';

import Overview from './pages/Overview';
import Inbox from './pages/Inbox';
import Leads from './pages/Leads';
import Pipeline from './pages/Pipeline';
import Appointments from './pages/Appointments';
import Estimates from './pages/Estimates';
import Services from './pages/Services';
import Automation from './pages/Automation';
import Analytics from './pages/Analytics';
import ProspectWidget from './pages/ProspectWidget';
import Login from './pages/Login';

function ProtectedLayout({ children, title }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-main flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-accent-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return (
    <div className="min-h-screen bg-bg-main flex">
      <Sidebar />
      <div className="flex-1 ml-64 flex flex-col min-h-screen">
        <Header title={title} />
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public End-User / Prospect Portal */}
          <Route path="/widget" element={<ProspectWidget />} />
          <Route path="/login" element={<Login />} />

          {/* Authenticated Workspace CRM Dashboard */}
          <Route
            path="/"
            element={
              <ProtectedLayout title="Sales Executive Overview">
                <Overview />
              </ProtectedLayout>
            }
          />
          <Route
            path="/inbox"
            element={
              <ProtectedLayout title="AI Sales Conversation Inbox">
                <Inbox />
              </ProtectedLayout>
            }
          />
          <Route
            path="/leads"
            element={
              <ProtectedLayout title="Leads & CRM Directory">
                <Leads />
              </ProtectedLayout>
            }
          />
          <Route
            path="/pipeline"
            element={
              <ProtectedLayout title="Commercial Sales Pipeline">
                <Pipeline />
              </ProtectedLayout>
            }
          />
          <Route
            path="/appointments"
            element={
              <ProtectedLayout title="Appointment Scheduling Engine">
                <Appointments />
              </ProtectedLayout>
            }
          />
          <Route
            path="/estimates"
            element={
              <ProtectedLayout title="Estimates & Quoting Vault">
                <Estimates />
              </ProtectedLayout>
            }
          />
          <Route
            path="/services"
            element={
              <ProtectedLayout title="Services Catalog & Pricing Engine">
                <Services />
              </ProtectedLayout>
            }
          />
          <Route
            path="/automation"
            element={
              <ProtectedLayout title="Automated Follow-Ups & Audit Logs">
                <Automation />
              </ProtectedLayout>
            }
          />
          <Route
            path="/analytics"
            element={
              <ProtectedLayout title="Sales Conversion Analytics">
                <Analytics />
              </ProtectedLayout>
            }
          />

          {/* Catch-all fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
