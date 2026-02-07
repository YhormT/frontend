import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { io } from 'socket.io-client';
import Swal from 'sweetalert2';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import UserDashboard from './pages/UserDashboard';
import Premium from './pages/Premium';
import SuperAgent from './pages/SuperAgent';
import NormalAgent from './pages/NormalAgent';
import OtherDashboard from './pages/OtherDashboard';
import Landing from './pages/Landing';
import Profile from './pages/Profile';
import Shop from './pages/Shop';
import PublicStorefront from './pages/PublicStorefront';
import BASE_URL from './endpoints/endpoints';

const PrivateRoute = ({ allowedRoles }) => {
  const token = localStorage.getItem('token');
  const userRole = localStorage.getItem('role');

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(userRole)) {
    Swal.fire('Access Denied', 'You do not have permission to access this page.', 'error');
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};

function App() {
  useEffect(() => {
    const userId = localStorage.getItem('userId');
    if (!userId) {
      return;
    }

    const socket = io(BASE_URL, {
      transports: ['websocket'],
      reconnectionAttempts: 5,
    });

    socket.on('connect', () => {
      socket.emit('register', userId);
    });

    socket.on('force-logout', (data) => {
      Swal.fire({
        title: 'Session Terminated',
        text: data.message || 'Your session has been terminated by an administrator. Please log in again.',
        icon: 'warning',
        confirmButtonText: 'OK',
        background: '#1e293b',
        color: '#f1f5f9',
        confirmButtonColor: '#06b6d4',
      }).then(() => {
        localStorage.clear();
        window.location.href = '/login';
      });
    });

    socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
    });

    return () => {
      if (socket.connected) {
        socket.disconnect();
      }
    };
  }, []);

  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/shop" element={<Shop />} />
        <Route path="/store/:slug" element={<PublicStorefront />} />

        {/* Protected Routes */}
        <Route element={<PrivateRoute allowedRoles={['ADMIN']} />}>
          <Route path="/admin" element={<AdminDashboard />} />
        </Route>
        <Route element={<PrivateRoute allowedRoles={['USER']} />}>
          <Route path="/user" element={<UserDashboard />} />
        </Route>
        <Route element={<PrivateRoute allowedRoles={['PREMIUM']} />}>
          <Route path="/premium" element={<Premium />} />
        </Route>
        <Route element={<PrivateRoute allowedRoles={['SUPER']} />}>
          <Route path="/superagent" element={<SuperAgent />} />
        </Route>
        <Route element={<PrivateRoute allowedRoles={['NORMAL']} />}>
          <Route path="/normalagent" element={<NormalAgent />} />
        </Route>
        <Route element={<PrivateRoute allowedRoles={['OTHER']} />}>
          <Route path="/otherdashboard" element={<OtherDashboard />} />
        </Route>

        {/* Profile Routes - Available to all authenticated users */}
        <Route element={<PrivateRoute allowedRoles={['ADMIN', 'USER', 'PREMIUM', 'SUPER', 'NORMAL', 'OTHER']} />}>
          <Route path="/profile" element={<Profile />} />
        </Route>

        {/* Fallback Route */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      
      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="dark"
      />
    </Router>
  );
}

export default App;
