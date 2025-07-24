import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import ProtectedRoute from "./components/Auth/ProtectedRoute";
import Login from "./components/Auth/Login";
import Register from "./components/Auth/Register";
import MainLayout from "./components/Layout/MainLayout";
import Dashboard from "./components/Dashboard/Dashboard";
import DocumentList from "./components/Documents/DocumentList";
import DocumentForm from "./components/Documents/DocumentForm";
import DocumentView from "./components/Documents/DocumentView";
import CourrierDepartList from "./components/Documents/CourrierDepartList";
import CourrierArriveeList from "./components/Documents/CourrierArriveeList";
import DRIDepartList from "./components/Documents/DRIDepartList";
import OMApprovalList from "./components/Documents/OMApprovalList";
import Messages from "./components/Messages/Messages";
import FileManager from "./components/FileManager/FileManager";
import Calendar from "./components/Calendar/Calendar";
import Profile from "./components/Profile/Profile";
import UserManagement from "./components/UserManagement/UserManagement";
import Settings from "./components/Settings/Settings";
import {
  PaperAirplaneIcon,
  InboxIcon,
  DocumentCheckIcon,
  ChartBarIcon,
} from "@heroicons/react/24/outline";
import "./App.css";

// Public Route wrapper
const PublicRoute = ({ children }) => {
  const { user } = useAuth();
  return user ? <Navigate to="/" replace /> : children;
};

// Main App Content with Routing
const AppContent = () => {
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route
          path="/login"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />
        <Route
          path="/register"
          element={
            <PublicRoute>
              <Register />
            </PublicRoute>
          }
        />

        {/* Protected Routes */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <MainLayout>
                <Dashboard />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        {/* Document Routes */}
        <Route
          path="/documents/new"
          element={
            <ProtectedRoute>
              <MainLayout title="Create Document" subtitle="Add a new document to the system">
                <DocumentForm />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/documents/:documentId"
          element={
            <ProtectedRoute>
              <MainLayout>
                <DocumentView />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/documents/:documentId/edit"
          element={
            <ProtectedRoute>
              <MainLayout title="Edit Document" subtitle="Update document details">
                <DocumentForm isEdit={true} />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        {/* Specific Document Type Routes */}
        <Route
          path="/outgoing-mail"
          element={
            <ProtectedRoute>
              <MainLayout>
                <CourrierDepartList />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/incoming-mail"
          element={
            <ProtectedRoute>
              <MainLayout>
                <CourrierArriveeList />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/dri-depart"
          element={
            <ProtectedRoute>
              <MainLayout>
                <DRIDepartList />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/om-approval"
          element={
            <ProtectedRoute>
              <MainLayout>
                <OMApprovalList />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/dri-deport"
          element={
            <ProtectedRoute>
              <MainLayout>
                <DocumentList
                  documentType="dri_deport"
                  title="DRI Déport"
                  icon={ChartBarIcon}
                  color="text-indigo-600"
                />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        {/* Other Routes */}
        <Route
          path="/messages"
          element={
            <ProtectedRoute>
              <MainLayout title="Messages" subtitle="Communication center">
                <Messages />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/file-manager"
          element={
            <ProtectedRoute>
              <MainLayout title="File Manager" subtitle="Manage your files and documents">
                <FileManager />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/calendar"
          element={
            <ProtectedRoute>
              <MainLayout title="Calendar" subtitle="Schedule and deadlines">
                <Calendar />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/reports"
          element={
            <ProtectedRoute>
              <MainLayout title="Reports" subtitle="Analytics and insights">
                <div className="bg-white rounded-xl p-8 shadow-lg text-center">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">Reports</h2>
                  <p className="text-gray-600">Reports feature coming soon...</p>
                </div>
              </MainLayout>
            </ProtectedRoute>
          }
        />

        {/* Admin Routes */}
        <Route
          path="/user-management"
          element={
            <ProtectedRoute requireAdmin={true}>
              <MainLayout title="User Management" subtitle="Manage system users">
                <UserManagement />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/settings"
          element={
            <ProtectedRoute requireAdmin={true}>
              <MainLayout title="Settings" subtitle="System configuration">
                <Settings />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        {/* Catch all route */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
};

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;