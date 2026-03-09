import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, MapPin, Filter, Clock, MonitorSmartphone, Bookmark, ArrowRight, Activity } from 'lucide-react';

export default function FindMeetings() {
  useEffect(() => {
    document.title = "Find Meetings | Twin Cities Recovery Hub";
    window.scrollTo(0, 0);
  }, []);

  const plannedFeatures = [
    { icon: <MapPin className="w-5 h-5" />, text: "Search by city or ZIP" },
    { icon: <Filter className="w-5 h-5" />, text: "Filter AA / NA" },
    { icon: <Clock className="w-5 h-5" />, text: "Find meetings tonight" },
    { icon: <MonitorSmartphone className="w-5 h-5" />, text: "In-person, virtual, or hybrid options" },
    { icon: <Bookmark className="w-5 h-5" />, text: "Save meetings for quick access" },
  ];

  return (
    <div className="min-h-screen bg-zinc-50 py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-3xl shadow-sm border border-zinc-200 overflow-hidden">
          {/* Header Section */}
          <div className="bg-emerald-900 px-8 py-12 text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-[url('https://picsum.photos/seed/meetings/1920/1080?blur=4')] opacity-10 bg-cover bg-center mix-blend-overlay"></div>
            <div className="relative z-10 flex flex-col items-center">
              <div className="bg-emerald-800/50 p-4 rounded-2xl mb-6 backdrop-blur-sm border border-emerald-700/50">
                <Activity className="w-10 h-10 text-emerald-300" />
              </div>
              <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight mb-4">
                Find Recovery Meetings
              </h1>
              <p className="text-lg md:text-xl text-emerald-100 font-medium max-w-xl mx-auto">
                Meeting search is currently in development and will be available soon.
              </p>
            </div>
          </div>

          {/* Content Section */}
          <div className="p-8 md:p-12">
            <p className="text-lg text-zinc-600 leading-relaxed text-center mb-10 max-w-2xl mx-auto">
              We're building a dedicated tool to help you find AA, NA, and other recovery meetings by location, day, time, and format.
            </p>

            <div className="bg-zinc-50 rounded-2xl p-8 border border-zinc-100 mb-10">
              <h2 className="text-sm font-bold text-zinc-900 uppercase tracking-wider mb-6 text-center">
                Planned Features
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-xl mx-auto">
                {plannedFeatures.map((feature, index) => (
                  <div key={index} className="flex items-center gap-3 text-zinc-700 bg-white p-4 rounded-xl shadow-sm border border-zinc-100">
                    <div className="text-emerald-600 shrink-0">
                      {feature.icon}
                    </div>
                    <span className="font-medium">{feature.text}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="text-center space-y-6">
              <Link 
                to="/" 
                className="inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all shadow-sm hover:shadow-md w-full sm:w-auto"
              >
                <Search className="w-5 h-5" />
                Use Resource Search for Now
              </Link>
              
              <p className="text-sm text-zinc-500 max-w-md mx-auto">
                Until this feature launches, you can still use the main search to look for recovery-related support.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
