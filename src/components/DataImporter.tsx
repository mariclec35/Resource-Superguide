import React, { useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Loader2, Upload, AlertCircle, CheckCircle2, Trash2, FileText, Download } from 'lucide-react';
import Papa from 'papaparse';

interface ImportRow {
  city: string;
  handbook: string;
  page_start: string;
  section: string;
  subsection: string;
  subcategory: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  hours: string;
  provides: string;
  remarks: string;
  details: string;
}

const REQUIRED_HEADERS = [
  'city', 'handbook', 'page_start', 'section', 'subsection', 
  'subcategory', 'name', 'address', 'phone', 'email', 
  'website', 'hours', 'provides', 'remarks', 'details'
];

export default function DataImporter() {
  const [csvData, setCsvData] = useState('');
  const [importing, setImporting] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error' | 'info', message: string } | null>(null);
  const [progress, setProgress] = useState(0);
  const [batchInfo, setBatchInfo] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setCsvData(text);
      setStatus({ type: 'info', message: `File "${file.name}" loaded. Ready to import.` });
    };
    reader.readAsText(file);
  };

  const downloadTemplate = () => {
    const csvContent = REQUIRED_HEADERS.join(',') + '\n';
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'resource_import_template.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImport = async () => {
    console.log('handleImport triggered', { dataLength: csvData.length });
    
    if (!csvData.trim()) {
      setStatus({ type: 'error', message: 'Please provide CSV or JSON data or upload a file before starting.' });
      return;
    }

    if (!confirm('This will DELETE ALL existing resources and replace them with this new data. Continue?')) {
      return;
    }

    setImporting(true);
    setStatus({ type: 'info', message: 'Starting import engine... (Step 1/4)' });
    setProgress(5);
    setBatchInfo('Initializing session...');

    try {
      // 0. Verify Auth
      console.log('Verifying Supabase session...');
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      if (!session) {
        throw new Error('Administrative session expired. Please refresh the page and sign in again.');
      }

      let rows: any[] = [];
      const trimmedData = csvData.trim();
      const isJson = trimmedData.startsWith('[') || trimmedData.startsWith('{');

      if (isJson) {
        setBatchInfo('Parsing JSON structural data...');
        try {
          rows = JSON.parse(trimmedData);
          if (!Array.isArray(rows)) rows = [rows];
        } catch (e: any) {
          throw new Error(`JSON Format Error: ${e.message}. Tip: Check for trailing commas.`);
        }
      } else {
        setBatchInfo('Parsing CSV spreadsheet data...');
        const results = Papa.parse<ImportRow>(trimmedData, {
          header: true,
          skipEmptyLines: true,
          dynamicTyping: true
        });

        if (results.errors.length > 0) {
          throw new Error(`CSV Format Error: ${results.errors[0].message}`);
        }
        rows = results.data;
      }

      if (rows.length === 0) throw new Error('Data set is empty.');

      setBatchInfo(`Loaded ${rows.length} records. Wiping current database...`);
      console.log(`Processing ${rows.length} rows`);

      // 2. Delete all existing resources
      const { error: deleteError } = await supabase
        .from('resources')
        .delete()
        .neq('name', '___NON_EXISTENT_NAME_FOR_CLEAN_SLATE___');

      if (deleteError) {
        console.error('Delete block failure:', deleteError);
        throw new Error(`Data wipe failed: ${deleteError.message}. Verify "Admins can manage resources" RLS policy.`);
      }

      // 3. Handle Categories
      setBatchInfo('Syncing taxonomy / categories...');
      const uniqueCategories = new Set<string>();
      rows.forEach(row => {
        let cat = 'Other';
        if (isJson) {
          cat = row.category || row.metadata?.pathway_tags?.[0] || 'Other';
        } else {
          cat = row.subsection || row.section || 'Other';
        }
        if (cat) uniqueCategories.add(cat);
      });

      const catList = Array.from(uniqueCategories);
      console.log(`Syncing ${catList.length} categories`);
      for (let i = 0; i < catList.length; i++) {
        const catName = catList[i];
        // Safely upsert identifying only by name to avoid column-misalignment errors
        const { error: catError } = await supabase.from('categories').upsert({ 
          name: catName,
          sequence: i 
        }, { onConflict: 'name' });
        
        if (catError) {
          console.warn(`Category warning for "${catName}":`, catError.message);
          // Fallback if 'sequence' column is missing or restricted
          await supabase.from('categories').upsert({ name: catName }, { onConflict: 'name' });
        }
      }

      // 4. Import Resources in batches
      const batchSize = 25;
      const totalBatches = Math.ceil(rows.length / batchSize);
      setProgress(10);

      for (let i = 0; i < rows.length; i += batchSize) {
        const currentBatchNum = Math.floor(i / batchSize) + 1;
        const currentProgress = Math.round((i / rows.length) * 100);
        setBatchInfo(`Deploying batch ${currentBatchNum}/${totalBatches}... (${currentProgress}%)`);
        
        const batchItems = rows.slice(i, i + batchSize);
        const batch = batchItems.map(row => {
          if (isJson) {
            return {
              name: row.name || 'Unnamed Resource',
              category: row.category || row.metadata?.pathway_tags?.[0] || 'Other',
              address: row.locations?.[0]?.address || row.address || '',
              phone: row.contact?.phone || row.phone || null,
              website: row.contact?.website || row.website || null,
              description: row.description || row.search_embeddings_text || null,
              status: 'active',
              org_slug: row.org_slug || null,
              name_aliases: row.name_aliases || [],
              metadata: row.metadata || {},
              eligibility: row.eligibility || {},
              relational_graph: row.relational_graph || {},
              locations: row.locations || [],
              contact: row.contact || {}
            };
          } else {
            return {
              name: row.name || 'Unnamed Resource',
              category: row.subsection || row.section || 'Other',
              address: row.address || '',
              phone: row.phone || null,
              website: row.website || null,
              description: [row.provides, row.remarks, row.details].filter(Boolean).join('\n\n') || null,
              status: 'active'
            };
          }
        });

        const { error: insertError } = await supabase.from('resources').insert(batch);

        if (insertError) {
          console.error(`Batch ${currentBatchNum} insert fault:`, insertError);
          throw new Error(`Batch ${currentBatchNum} failed: ${insertError.message} (${insertError.code})`);
        }
        
        setProgress(Math.max(10, Math.round(((i + batch.length) / rows.length) * 100)));
      }

      setStatus({ type: 'success', message: `Database populated! Successfully imported ${rows.length} resources.` });
      setBatchInfo('Operations finalized.');
      setCsvData('');
    } catch (err: any) {
      console.error('Import process failed:', err);
      setStatus({ 
        type: 'error', 
        message: err.message || 'System error during data transfer.' 
      });
      setBatchInfo('Process aborted.');
    } finally {
      setImporting(false);
    }
  };

  const clearDatabase = async () => {
    if (!confirm('Are you sure you want to delete ALL resources? This cannot be undone.')) return;
    
    setImporting(true);
    try {
      const { error } = await supabase
        .from('resources')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      
      if (error) throw error;
      setStatus({ type: 'success', message: 'All resources have been deleted.' });
    } catch (err: any) {
      setStatus({ type: 'error', message: err.message });
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl">
      <div className="bg-white p-8 rounded-3xl border border-zinc-200 shadow-sm space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black text-zinc-900 tracking-tight">Bulk Import Resources</h2>
            <p className="text-sm text-zinc-500 mt-1">Upload a CSV file or paste data below to replace all current resources.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={downloadTemplate}
              className="flex items-center gap-2 px-4 py-2 text-zinc-600 hover:bg-zinc-50 rounded-xl text-sm font-bold transition-all"
            >
              <Download className="w-4 h-4" />
              Template
            </button>
            <button
              onClick={clearDatabase}
              disabled={importing}
              className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-xl text-sm font-bold transition-all disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
              Clear DB
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <div 
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
              importing ? 'opacity-50 pointer-events-none' : 'hover:border-zinc-900 hover:bg-zinc-50 border-zinc-200'
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".csv,.json"
              className="hidden"
            />
            <div className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded-full bg-zinc-100 flex items-center justify-center">
                <Upload className="w-6 h-6 text-zinc-500" />
              </div>
              <p className="font-bold text-zinc-900">Click to upload CSV or JSON file</p>
              <p className="text-xs text-zinc-400 uppercase font-black tracking-widest">or paste content below</p>
            </div>
          </div>

          <textarea
            value={csvData}
            onChange={(e) => setCsvData(e.target.value)}
            placeholder="Paste CSV or JSON content here..."
            className="w-full h-64 p-4 font-mono text-[10px] bg-zinc-50 border border-zinc-200 rounded-2xl focus:ring-2 focus:ring-zinc-900 outline-none transition-all resize-none"
            disabled={importing}
          />

          {status && (
            <div className={`p-4 rounded-xl flex items-start gap-3 ${
              status.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-100' :
              status.type === 'error' ? 'bg-red-50 text-red-800 border border-red-100' :
              'bg-blue-50 text-blue-800 border border-blue-100'
            }`}>
              {status.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0" /> :
               status.type === 'error' ? <AlertCircle className="w-5 h-5 shrink-0" /> :
               <Loader2 className="w-5 h-5 shrink-0 animate-spin" />}
              <div className="flex-1">
                <p className="text-sm font-bold">{status.message}</p>
                {importing && batchInfo && (
                  <p className="text-xs mt-1 opacity-80">{batchInfo}</p>
                )}
              </div>
            </div>
          )}

          {importing && (
            <div className="space-y-2">
              <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-zinc-400">
                <span>Overall Progress</span>
                <span>{progress}%</span>
              </div>
              <div className="w-full bg-zinc-100 rounded-full h-3 overflow-hidden border border-zinc-200">
                <div 
                  className="bg-zinc-900 h-full transition-all duration-300" 
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          <button
            onClick={handleImport}
            disabled={importing || !csvData.trim()}
            className="w-full py-4 bg-zinc-900 text-white font-black uppercase tracking-widest rounded-2xl hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-3 shadow-lg shadow-zinc-200"
          >
            {importing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Importing Data...
              </>
            ) : (
              <>
                <FileText className="w-5 h-5" />
                Start Bulk Import
              </>
            )}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-amber-50 border border-amber-100 p-6 rounded-3xl space-y-3">
          <h3 className="text-amber-900 font-bold flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            Important Notes
          </h3>
          <ul className="text-sm text-amber-800 space-y-2 list-disc ml-5">
            <li>Existing resources will be <strong>permanently deleted</strong>.</li>
            <li>Categories are derived from <code>subsection</code> or <code>section</code> columns.</li>
            <li>Large files may take a few minutes. <strong>Do not close this tab.</strong></li>
          </ul>
        </div>

        <div className="bg-zinc-900 p-6 rounded-3xl space-y-3 text-white">
          <h3 className="font-bold flex items-center gap-2">
            <FileText className="w-5 h-5 text-zinc-400" />
            Required CSV Headers
          </h3>
          <div className="bg-white/10 p-3 rounded-xl font-mono text-[10px] break-all leading-relaxed">
            {REQUIRED_HEADERS.join(', ')}
          </div>
          <p className="text-[10px] text-zinc-400 italic">
            Note: Headers are case-sensitive and must match exactly.
          </p>
        </div>
      </div>
    </div>
  );
}
