import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Resource } from '../types';
import ResourceCard from '../components/ResourceCard';
import { Printer, FileDown, Trash2, Loader2, BookOpen, AlertCircle } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function MyGuide() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [myGuideIds, setMyGuideIds] = useState<string[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('my-guide');
    if (saved) {
      const ids = JSON.parse(saved);
      setMyGuideIds(ids);
      if (ids.length > 0) {
        fetchResources(ids);
      } else {
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, []);

  const fetchResources = async (ids: string[]) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('resources')
        .select('*')
        .in('id', ids);

      if (error) throw error;
      setResources(data || []);
    } catch (err) {
      console.error('Error fetching guide resources:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleGuide = (id: string) => {
    const newIds = myGuideIds.filter(i => i !== id);
    setMyGuideIds(newIds);
    setResources(resources.filter(r => r.id !== id));
    localStorage.setItem('my-guide', JSON.stringify(newIds));
  };

  const clearGuide = () => {
    if (confirm('Are you sure you want to clear your guide?')) {
      setMyGuideIds([]);
      setResources([]);
      localStorage.removeItem('my-guide');
    }
  };

  const groupedResources = resources.reduce((acc, resource) => {
    if (!acc[resource.category]) {
      acc[resource.category] = [];
    }
    acc[resource.category].push(resource);
    return acc;
  }, {} as Record<string, Resource[]>);

  const exportPDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(20);
    doc.text('My Resource List', 14, 22);
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Generated on ${new Date().toLocaleDateString()}`, 14, 30);
    
    let currentY = 40;

    Object.entries(groupedResources).forEach(([category, items]) => {
      doc.setFontSize(14);
      doc.setTextColor(0);
      doc.text(category, 14, currentY);
      
      const tableData = (items as Resource[]).map(item => [
        item.name,
        `${item.city_direction}\n${item.address}`,
        item.phone || 'N/A',
        `${item.transit_accessibility}\n${item.walkability}`,
        item.description?.substring(0, 150) + (item.description && item.description.length > 150 ? '...' : '') || 'N/A'
      ]);

      autoTable(doc, {
        startY: currentY + 5,
        head: [['Name', 'Location', 'Phone', 'Access', 'Description']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [16, 185, 129] }, // Emerald-500
        styles: { fontSize: 8, cellPadding: 3 },
        columnStyles: {
          0: { fontStyle: 'bold', cellWidth: 30 },
          1: { cellWidth: 40 },
          2: { cellWidth: 25 },
          3: { cellWidth: 35 },
          4: { cellWidth: 'auto' }
        }
      });

      currentY = (doc as any).lastAutoTable.finalY + 15;
      
      if (currentY > 250) {
        doc.addPage();
        currentY = 20;
      }
    });

    doc.save('my-resource-guide.pdf');
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-10 h-10 text-emerald-600 animate-spin mb-4" />
        <p className="text-zinc-500 font-medium">Loading your list...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
        <div>
          <h1 className="text-4xl font-black text-zinc-900 mb-2 tracking-tight">My Resource List</h1>
          <p className="text-zinc-600">Your personalized list of resources for easy access and printing.</p>
        </div>

        {resources.length > 0 && (
          <div className="flex flex-wrap gap-3">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-zinc-200 rounded-xl text-sm font-bold text-zinc-700 hover:bg-zinc-50 transition-all"
            >
              <Printer className="w-4 h-4" />
              Print
            </button>
            <button
              onClick={exportPDF}
              className="flex items-center gap-2 px-4 py-2 bg-zinc-900 text-white rounded-xl text-sm font-bold hover:bg-zinc-800 transition-all shadow-sm"
            >
              <FileDown className="w-4 h-4" />
              Download PDF
            </button>
            <button
              onClick={clearGuide}
              className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-xl text-sm font-bold hover:bg-red-100 transition-all"
            >
              <Trash2 className="w-4 h-4" />
              Clear All
            </button>
          </div>
        )}
      </div>

      {resources.length === 0 ? (
        <div className="text-center py-24 bg-zinc-50 rounded-3xl border-2 border-dashed border-zinc-200">
          <div className="bg-white w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm">
            <BookOpen className="w-8 h-8 text-zinc-300" />
          </div>
          <h2 className="text-xl font-bold text-zinc-900 mb-2">Your list is empty</h2>
          <p className="text-zinc-500 mb-8 max-w-sm mx-auto">
            Add resources to your list while browsing to keep them all in one place.
          </p>
          <a
            href="/"
            className="inline-flex items-center justify-center px-8 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-all"
          >
            Browse Resources
          </a>
        </div>
      ) : (
        <div className="space-y-12 print:space-y-8">
          {Object.entries(groupedResources).map(([category, items]) => (
            <section key={category}>
              <div className="flex items-center gap-4 mb-6">
                <h2 className="text-2xl font-black text-zinc-900 tracking-tight">{category}</h2>
                <div className="h-px flex-1 bg-zinc-100"></div>
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">
                  {(items as Resource[]).length} {(items as Resource[]).length === 1 ? 'Resource' : 'Resources'}
                </span>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 print:grid-cols-1">
                {(items as Resource[]).map((resource) => (
                  <div key={resource.id} className="relative group">
                    <ResourceCard
                      resource={resource}
                      inGuide={true}
                      onToggleGuide={toggleGuide}
                    />
                    {resource.status === 'needs_verification' && (
                      <div className="absolute -top-3 -right-3 bg-amber-500 text-white p-1.5 rounded-full shadow-lg z-10 print:hidden">
                        <AlertCircle className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <div className="mt-16 p-8 bg-emerald-50 rounded-3xl border border-emerald-100 print:hidden">
        <h3 className="text-lg font-bold text-emerald-900 mb-2">Need help with your list?</h3>
        <p className="text-emerald-700 text-sm leading-relaxed max-w-2xl">
          You can print this page or download it as a PDF to take with you. 
          The PDF includes full addresses, phone numbers, and transit information 
          for all your selected resources.
        </p>
      </div>
    </div>
  );
}
