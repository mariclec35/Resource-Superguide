import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { MapPin, BookOpen, ShieldCheck, Menu, X, Calendar, Users, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function Navbar() {
  const [isOpen, setIsOpen] = React.useState(false);
  const location = useLocation();

  const navLinks = [
    { name: 'Our Mission', href: '/mission', icon: ShieldCheck },
    { 
      name: 'Find Resources', 
      href: '/', 
      icon: MapPin,
      dropdown: [
        { name: 'My Resources', href: '/my-guide', icon: BookOpen }
      ]
    },
    { name: 'Find Meetings', href: '/meetings', icon: Users },
    { name: 'Find Events', href: '/events', icon: Calendar },
  ];

  return (
    <nav className="bg-white border-b border-zinc-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="bg-emerald-600 w-9 h-9 rounded-xl flex items-center justify-center shadow-sm group-hover:bg-emerald-700 transition-colors border border-emerald-500/20">
                <span className="text-white font-black text-base tracking-tighter leading-none select-none italic">TC</span>
              </div>
              <span className="text-lg font-black tracking-tight text-zinc-900">
                Recovery Hub
              </span>
            </Link>
          </div>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center space-x-2 lg:space-x-4">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = location.pathname === link.href || (link.dropdown && link.dropdown.some(d => location.pathname === d.href));
              
              if (link.dropdown) {
                return (
                  <div key={link.name} className="relative group">
                    <Link
                      to={link.href}
                      className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {link.name}
                      <ChevronDown className="w-3 h-3 ml-1 opacity-50 group-hover:opacity-100 transition-opacity" />
                    </Link>
                    <div className="absolute left-0 pt-2 w-48 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                      <div className="bg-white border border-zinc-200 rounded-xl shadow-lg overflow-hidden">
                        <div className="py-1">
                          {link.dropdown.map((sublink) => {
                            const SubIcon = sublink.icon;
                            const isSubActive = location.pathname === sublink.href;
                            return (
                              <Link
                                key={sublink.name}
                                to={sublink.href}
                                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium ${
                                  isSubActive
                                    ? 'bg-emerald-50 text-emerald-700'
                                    : 'text-zinc-600 hover:bg-zinc-50 hover:text-emerald-700'
                                }`}
                              >
                                <SubIcon className="w-4 h-4" />
                                {sublink.name}
                              </Link>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }

              return (
                <Link
                  key={link.name}
                  to={link.href}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {link.name}
                </Link>
              );
            })}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-zinc-400 hover:text-zinc-500 hover:bg-zinc-100 focus:outline-none"
            >
              {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Nav */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-white border-t border-zinc-100 overflow-hidden"
          >
            <div className="px-2 pt-2 pb-3 space-y-1">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const isActive = location.pathname === link.href;
                
                return (
                  <React.Fragment key={link.name}>
                    <Link
                      to={link.href}
                      onClick={() => setIsOpen(false)}
                      className={`flex items-center gap-3 px-3 py-3 rounded-md text-base font-medium ${
                        isActive
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      {link.name}
                    </Link>
                    {link.dropdown && (
                      <div className="pl-6 space-y-1">
                        {link.dropdown.map((sublink) => {
                          const SubIcon = sublink.icon;
                          const isSubActive = location.pathname === sublink.href;
                          return (
                            <Link
                              key={sublink.name}
                              to={sublink.href}
                              onClick={() => setIsOpen(false)}
                              className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium ${
                                isSubActive
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : 'text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900'
                              }`}
                            >
                              <SubIcon className="w-4 h-4" />
                              {sublink.name}
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
