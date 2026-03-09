import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Calendar as CalendarIcon, List, Search, MapPin, Filter, Plus, CalendarDays, Clock, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, parseISO, isAfter, isBefore } from 'date-fns';
import { RecoveryEvent } from '../types';

export default function EventsLandingPage() {
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('list');
  const [events, setEvents] = useState<RecoveryEvent[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [isFree, setIsFree] = useState(false);
  
  // Calendar state
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  useEffect(() => {
    document.title = "Recovery Community Events | Twin Cities Recovery Hub";
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/events');
      if (!res.ok) throw new Error('Failed to fetch events');
      const data = await res.json();
      setEvents(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const categories = Array.from(new Set(events.map(e => e.category))).filter(Boolean);
  const cities = Array.from(new Set(events.map(e => e.city))).filter(Boolean);

  const filteredEvents = events.filter(event => {
    const matchesSearch = event.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          event.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory ? event.category === selectedCategory : true;
    const matchesCity = selectedCity ? event.city === selectedCity : true;
    const matchesFree = isFree ? (event.cost_type === 'free') : true;
    
    return matchesSearch && matchesCategory && matchesCity && matchesFree;
  });

  const upcomingEvents = filteredEvents.filter(e => isAfter(parseISO(e.start_datetime), new Date()) || isSameDay(parseISO(e.start_datetime), new Date()));

  return (
    <div className="min-h-screen bg-zinc-50 pb-20">
      {/* Header */}
      <div className="bg-emerald-900 text-white py-16 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://picsum.photos/seed/community/1920/1080?blur=4')] opacity-20 bg-cover bg-center mix-blend-overlay"></div>
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-800/50 border border-emerald-700/50 text-emerald-100 text-sm font-medium mb-6">
                <CalendarIcon className="w-4 h-4" />
                Community Calendar
              </div>
              <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-4">Recovery Community Events</h1>
              <p className="text-emerald-100 text-lg leading-relaxed">
                Discover recovery-related community events including sober social gatherings, workshops, trainings, volunteer opportunities, fundraisers, and awareness events.
              </p>
            </div>
            <div className="flex-shrink-0">
              <Link 
                to="/events/submit" 
                className="inline-flex items-center gap-2 px-6 py-3 bg-white text-emerald-900 font-bold rounded-xl hover:bg-emerald-50 transition-colors shadow-lg shadow-emerald-900/20"
              >
                <Plus className="w-5 h-5" />
                Submit an Event
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Controls */}
        <div className="flex flex-col lg:flex-row gap-6 mb-8">
          <div className="flex-1 flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
              <input 
                type="text"
                placeholder="Search events..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white border border-zinc-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
              />
            </div>
            <select 
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-3 bg-white border border-zinc-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
            >
              <option value="">All Categories</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select 
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="px-4 py-3 bg-white border border-zinc-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
            >
              <option value="">All Cities</option>
              {cities.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <label className="flex items-center gap-2 px-4 py-3 bg-white border border-zinc-200 rounded-xl cursor-pointer hover:bg-zinc-50">
              <input 
                type="checkbox" 
                checked={isFree}
                onChange={(e) => setIsFree(e.target.checked)}
                className="rounded text-emerald-600 focus:ring-emerald-500"
              />
              <span className="text-sm font-medium text-zinc-700">Free Only</span>
            </label>
          </div>

          <div className="flex items-center bg-white border border-zinc-200 rounded-xl p-1 shrink-0">
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${viewMode === 'list' ? 'bg-zinc-100 text-zinc-900' : 'text-zinc-500 hover:text-zinc-900'}`}
            >
              <List className="w-4 h-4" />
              List
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${viewMode === 'calendar' ? 'bg-zinc-100 text-zinc-900' : 'text-zinc-500 hover:text-zinc-900'}`}
            >
              <CalendarDays className="w-4 h-4" />
              Calendar
            </button>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="py-20 text-center">
            <div className="w-8 h-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-zinc-500">Loading events...</p>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="bg-white border border-zinc-200 rounded-3xl p-12 text-center max-w-2xl mx-auto mt-12">
            <div className="w-16 h-16 bg-zinc-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <CalendarIcon className="w-8 h-8 text-zinc-400" />
            </div>
            <h3 className="text-xl font-bold text-zinc-900 mb-2">No events found</h3>
            <p className="text-zinc-500 mb-6">We couldn't find any events matching your current filters. Try adjusting your search or clearing filters to see more.</p>
            <button 
              onClick={() => { setSearchQuery(''); setSelectedCategory(''); setSelectedCity(''); setIsFree(false); }}
              className="px-6 py-2 bg-zinc-900 text-white font-medium rounded-xl hover:bg-zinc-800 transition-colors"
            >
              Clear Filters
            </button>
          </div>
        ) : viewMode === 'list' ? (
          <div className="space-y-4">
            {upcomingEvents.length > 0 ? upcomingEvents.map(event => (
              <EventCard key={event.id} event={event} />
            )) : (
              <div className="text-center py-12 text-zinc-500">No upcoming events found. Check the calendar for past events.</div>
            )}
          </div>
        ) : (
          <CalendarView 
            events={filteredEvents} 
            currentMonth={currentMonth} 
            setCurrentMonth={setCurrentMonth}
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
          />
        )}

        {/* Developer Note / Coming Soon */}
        <div className="mt-16 p-6 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-start gap-4">
          <div className="p-2 bg-emerald-100 rounded-lg text-emerald-700 shrink-0">
            <Filter className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-emerald-900 mb-1">More event features coming soon</h4>
            <p className="text-emerald-800 text-sm leading-relaxed">
              We're working on adding event subscriptions, organizer profiles, and unified discovery. 
              <br/><br/>
              <span className="opacity-70 italic">Developer Note: This events system is intentionally separate from the upcoming meeting locator. While they may share UI patterns, meetings (AA/NA/SMART) require different data models and search flows than community events. They will be connected in a unified discovery layer later.</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

const EventCard: React.FC<{ event: RecoveryEvent }> = ({ event }) => {
  const date = parseISO(event.start_datetime);
  
  return (
    <div className="bg-white border border-zinc-200 rounded-2xl p-6 hover:shadow-md transition-shadow flex flex-col md:flex-row gap-6 group">
      <div className="flex flex-col items-center justify-center bg-zinc-50 rounded-xl p-4 min-w-[100px] shrink-0 border border-zinc-100">
        <span className="text-sm font-bold text-emerald-600 uppercase tracking-wider">{format(date, 'MMM')}</span>
        <span className="text-3xl font-black text-zinc-900">{format(date, 'd')}</span>
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-2">
          <span className="px-2.5 py-1 bg-zinc-100 text-zinc-600 text-xs font-bold rounded uppercase tracking-wider">
            {event.category}
          </span>
          {event.cost_type === 'free' && (
            <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded uppercase tracking-wider">
              Free
            </span>
          )}
        </div>
        <h3 className="text-xl font-bold text-zinc-900 mb-2 truncate">{event.title}</h3>
        <div className="flex flex-wrap items-center gap-4 text-sm text-zinc-500 mb-3">
          <div className="flex items-center gap-1.5">
            <Clock className="w-4 h-4" />
            {format(date, 'h:mm a')}
          </div>
          {(event.city || event.location_name) && (
            <div className="flex items-center gap-1.5">
              <MapPin className="w-4 h-4" />
              <span className="truncate max-w-[200px]">{event.location_name || event.city}</span>
            </div>
          )}
        </div>
        <p className="text-zinc-600 line-clamp-2 text-sm">{event.description}</p>
      </div>
      
      <div className="flex items-center md:items-end justify-start md:justify-end shrink-0 pt-4 md:pt-0 border-t md:border-t-0 border-zinc-100">
        <Link 
          to={`/events/${event.id}`}
          className="px-6 py-2.5 bg-zinc-900 text-white font-medium rounded-xl hover:bg-emerald-600 transition-colors w-full md:w-auto text-center"
        >
          View Details
        </Link>
      </div>
    </div>
  );
}

function CalendarView({ events, currentMonth, setCurrentMonth, selectedDate, setSelectedDate }: any) {
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = monthStart;
  const endDate = monthEnd;

  const dateFormat = "MMMM yyyy";
  const days = eachDayOfInterval({ start: startDate, end: endDate });

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

  const selectedDateEvents = selectedDate 
    ? events.filter((e: any) => isSameDay(parseISO(e.start_datetime), selectedDate))
    : [];

  return (
    <div className="flex flex-col lg:flex-row gap-8">
      <div className="flex-1 bg-white border border-zinc-200 rounded-3xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-zinc-900">{format(currentMonth, dateFormat)}</h2>
          <div className="flex gap-2">
            <button onClick={prevMonth} className="p-2 hover:bg-zinc-100 rounded-lg transition-colors"><ChevronLeft className="w-5 h-5" /></button>
            <button onClick={nextMonth} className="p-2 hover:bg-zinc-100 rounded-lg transition-colors"><ChevronRight className="w-5 h-5" /></button>
          </div>
        </div>
        
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="text-center text-xs font-bold text-zinc-400 uppercase tracking-wider py-2">
              {day}
            </div>
          ))}
        </div>
        
        <div className="grid grid-cols-7 gap-1">
          {/* Empty cells for start of month */}
          {Array.from({ length: startDate.getDay() }).map((_, i) => (
            <div key={`empty-${i}`} className="aspect-square p-1"></div>
          ))}
          
          {days.map(day => {
            const dayEvents = events.filter((e: any) => isSameDay(parseISO(e.start_datetime), day));
            const hasEvents = dayEvents.length > 0;
            const isSelected = selectedDate && isSameDay(day, selectedDate);
            const isToday = isSameDay(day, new Date());
            
            return (
              <button
                key={day.toString()}
                onClick={() => setSelectedDate(day)}
                className={`aspect-square p-1 md:p-2 border rounded-xl flex flex-col items-center justify-start transition-all relative ${
                  isSelected ? 'border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500' : 
                  hasEvents ? 'border-zinc-200 hover:border-emerald-300 hover:bg-zinc-50' : 
                  'border-transparent hover:bg-zinc-50'
                }`}
              >
                <span className={`text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full ${
                  isToday ? 'bg-zinc-900 text-white' : 'text-zinc-700'
                }`}>
                  {format(day, 'd')}
                </span>
                {hasEvents && (
                  <div className="mt-1 flex gap-1 flex-wrap justify-center">
                    {dayEvents.slice(0, 3).map((_: any, i: number) => (
                      <div key={i} className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-emerald-600' : 'bg-emerald-400'}`}></div>
                    ))}
                    {dayEvents.length > 3 && <span className="text-[10px] text-zinc-400 leading-none">+{dayEvents.length - 3}</span>}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Date Panel */}
      {selectedDate && (
        <div className="w-full lg:w-96 bg-white border border-zinc-200 rounded-3xl p-6 shrink-0 h-fit sticky top-24">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-zinc-900">
              {format(selectedDate, 'EEEE, MMMM d')}
            </h3>
            <button onClick={() => setSelectedDate(null)} className="p-1 hover:bg-zinc-100 rounded-lg text-zinc-400">
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
            {selectedDateEvents.length > 0 ? (
              selectedDateEvents.map((event: any) => (
                <div key={event.id} className="p-4 border border-zinc-100 bg-zinc-50 rounded-2xl hover:border-emerald-200 transition-colors group">
                  <div className="text-xs font-bold text-emerald-600 mb-1">{format(parseISO(event.start_datetime), 'h:mm a')}</div>
                  <h4 className="font-bold text-zinc-900 mb-1 group-hover:text-emerald-700 transition-colors">{event.title}</h4>
                  <p className="text-sm text-zinc-500 line-clamp-2 mb-3">{event.description}</p>
                  <Link to={`/events/${event.id}`} className="text-sm font-medium text-emerald-600 hover:text-emerald-700 flex items-center gap-1">
                    View Details <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-zinc-500 text-sm">
                No events scheduled for this day.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
