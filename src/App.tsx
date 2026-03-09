import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import ResourceDetail from './pages/ResourceDetail';
import MyGuide from './pages/MyGuide';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfService from './pages/TermsOfService';
import EventsLandingPage from './pages/EventsLandingPage';
import EventDetailPage from './pages/EventDetailPage';
import SubmitEventPage from './pages/SubmitEventPage';
import Mission from './pages/Mission';
import FindMeetings from './pages/FindMeetings';

export default function App() {
  return (
    <Router>
      <div className="min-h-screen bg-zinc-50 font-sans text-zinc-900 selection:bg-emerald-100 selection:text-emerald-900">
        <Navbar />
        <main className="pb-20">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/meetings" element={<FindMeetings />} />
            <Route path="/events" element={<EventsLandingPage />} />
            <Route path="/events/submit" element={<SubmitEventPage />} />
            <Route path="/events/:id" element={<EventDetailPage />} />
            <Route path="/resource/:id" element={<ResourceDetail />} />
            <Route path="/my-guide" element={<MyGuide />} />
            <Route path="/admin" element={<AdminLogin />} />
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/mission" element={<Mission />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/terms" element={<TermsOfService />} />
          </Routes>
        </main>
        
        <footer className="bg-white border-t border-zinc-200 py-12 px-4">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="bg-emerald-600 w-6 h-6 rounded flex items-center justify-center shadow-sm">
                <span className="text-white font-black text-[10px] tracking-tighter italic">TC</span>
              </div>
              <span className="font-bold tracking-tight text-zinc-900">Recovery Hub</span>
            </div>
            <p className="text-zinc-400 text-sm">
              &copy; {new Date().getFullYear()} Twin Cities Recovery Hub. Supporting Saint Paul & Minneapolis communities.
            </p>
            <div className="flex gap-6">
              <Link to="/mission" className="text-zinc-400 hover:text-zinc-900 text-sm font-medium transition-colors">Our Mission</Link>
              <Link to="/privacy" className="text-zinc-400 hover:text-zinc-900 text-sm font-medium transition-colors">Privacy</Link>
              <Link to="/terms" className="text-zinc-400 hover:text-zinc-900 text-sm font-medium transition-colors">Terms</Link>
              <a href="#" className="text-zinc-400 hover:text-zinc-900 text-sm font-medium transition-colors">Contact</a>
              <Link to="/admin" className="text-zinc-400 hover:text-zinc-900 text-sm font-medium transition-colors">Admin</Link>
            </div>
          </div>
        </footer>
      </div>
    </Router>
  );
}
