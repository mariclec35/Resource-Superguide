import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import ResourceDetail from './pages/ResourceDetail';
import MyGuide from './pages/MyGuide';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';

export default function App() {
  return (
    <Router>
      <div className="min-h-screen bg-zinc-50 font-sans text-zinc-900 selection:bg-emerald-100 selection:text-emerald-900">
        <Navbar />
        <main className="pb-20">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/resource/:id" element={<ResourceDetail />} />
            <Route path="/my-guide" element={<MyGuide />} />
            <Route path="/admin" element={<AdminLogin />} />
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
          </Routes>
        </main>
        
        <footer className="bg-white border-t border-zinc-200 py-12 px-4">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="bg-zinc-900 p-1 rounded">
                <div className="w-4 h-4 bg-white rounded-sm"></div>
              </div>
              <span className="font-bold tracking-tight">Resource Superguide</span>
            </div>
            <p className="text-zinc-400 text-sm">
              &copy; {new Date().getFullYear()} Resource Superguide. Supporting Saint Paul & Minneapolis communities.
            </p>
            <div className="flex gap-6">
              <a href="#" className="text-zinc-400 hover:text-zinc-900 text-sm font-medium transition-colors">Privacy</a>
              <a href="#" className="text-zinc-400 hover:text-zinc-900 text-sm font-medium transition-colors">Terms</a>
              <a href="#" className="text-zinc-400 hover:text-zinc-900 text-sm font-medium transition-colors">Contact</a>
            </div>
          </div>
        </footer>
      </div>
    </Router>
  );
}
