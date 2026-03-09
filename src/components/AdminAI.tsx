import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { supabase } from '../lib/supabase';
import { 
  Bot, Send, Loader2, User, Sparkles, 
  AlertCircle, CheckCircle2, Trash2, 
  RefreshCcw, X, MessageSquare, Terminal
} from 'lucide-react';
import { Resource, Category, Report, ResourceStatus, ReportStatus } from '../types';
import { format } from 'date-fns';

interface Message {
  role: 'user' | 'model';
  parts: { text: string }[];
}

export default function AdminAI() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'model',
      parts: [{ text: "Hello! I'm your Admin AI Assistant. I can help you manage resources, categories, users, and review reports. What would you like to do today?" }]
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleToolCall = async (call: any) => {
    const { name, args } = call;
    console.log(`AI Tool Call: ${name}`, args);

    try {
      switch (name) {
        case 'list_resources': {
          let query = supabase.from('resources').select('*');
          if (args.search) query = query.ilike('name', `%${args.search}%`);
          if (args.category) query = query.eq('category', args.category);
          const { data, error } = await query.limit(10);
          if (error) throw error;
          return { resources: data };
        }
        case 'create_resource': {
          const { error } = await supabase.from('resources').insert([args]);
          if (error) throw error;
          return { status: 'success', message: `Resource "${args.name}" created.` };
        }
        case 'update_resource': {
          const { error } = await supabase.from('resources').update(args.updates).eq('id', args.id);
          if (error) throw error;
          return { status: 'success', message: `Resource ${args.id} updated.` };
        }
        case 'delete_resource': {
          const { error } = await supabase.from('resources').delete().eq('id', args.id);
          if (error) throw error;
          return { status: 'success', message: `Resource ${args.id} deleted.` };
        }
        case 'list_categories': {
          const { data, error } = await supabase.from('categories').select('*').order('name');
          if (error) throw error;
          return { categories: data };
        }
        case 'create_category': {
          const { error } = await supabase.from('categories').insert([args]);
          if (error) throw error;
          return { status: 'success', message: `Category "${args.name}" created.` };
        }
        case 'update_category': {
          const { error } = await supabase.from('categories').update(args.updates).eq('id', args.id);
          if (error) throw error;
          return { status: 'success', message: `Category ${args.id} updated.` };
        }
        case 'delete_category': {
          const { error } = await supabase.from('categories').delete().eq('id', args.id);
          if (error) throw error;
          return { status: 'success', message: `Category ${args.id} deleted.` };
        }
        case 'list_reports': {
          let query = supabase.from('reports').select('*, resource:resources(*)');
          if (args.status) query = query.eq('report_status', args.status);
          const { data, error } = await query.limit(10);
          if (error) throw error;
          return { reports: data };
        }
        case 'update_report': {
          const { error } = await supabase.from('reports').update(args.updates).eq('id', args.id);
          if (error) throw error;
          return { status: 'success', message: `Report ${args.id} updated.` };
        }
        case 'list_users': {
          const response = await fetch('/api/admin/users');
          if (!response.ok) throw new Error('Failed to fetch users');
          const data = await response.json();
          return { users: data };
        }
        case 'create_user': {
          const response = await fetch('/api/admin/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(args),
          });
          if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || 'Failed to create user');
          }
          return { status: 'success', message: `User "${args.email}" created.` };
        }
        case 'delete_user': {
          const response = await fetch(`/api/admin/users/${args.id}`, { method: 'DELETE' });
          if (!response.ok) throw new Error('Failed to delete user');
          return { status: 'success', message: `User ${args.id} deleted.` };
        }
        case 'reset_categories': {
          const response = await fetch('/api/admin/categories/reset', { method: 'POST' });
          if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || 'Failed to reset categories');
          }
          return { status: 'success', message: 'Categories have been reset to the standard structure from the guide.' };
        }
        case 'list_error_logs': {
          let query = supabase.from('error_events').select('*').order('created_at', { ascending: false });
          if (args.severity && args.severity !== 'all') query = query.eq('severity', args.severity);
          if (args.source && args.source !== 'all') query = query.eq('source', args.source);
          const { data, error } = await query.limit(args.limit || 10);
          if (error) throw error;
          return { logs: data };
        }
        case 'resolve_error_log': {
          const { error } = await supabase
            .from('error_events')
            .update({ 
              resolved: true,
              resolved_at: new Date().toISOString()
            })
            .eq('id', args.id);
          if (error) throw error;
          return { status: 'success', message: `Error log ${args.id} resolved.` };
        }
        default:
          return { error: `Unknown tool: ${name}` };
      }
    } catch (err: any) {
      console.error(`Tool error (${name}):`, err);
      return { error: err.message };
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const apiKey = import.meta.env.VITE_CUSTOM_GEMINI_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'MY_GEMINI_API_KEY' || apiKey.trim() === '') {
      setMessages(prev => [...prev, { 
        role: 'model', 
        parts: [{ text: "⚠️ Gemini API Key is missing. Please add your API key to the platform's Secrets/Environment Variables as 'VITE_CUSTOM_GEMINI_KEY' to enable the AI Assistant." }] 
      }]);
      return;
    }

    const userMessage: Message = { role: 'user', parts: [{ text: input }] };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: apiKey });
      
      const tools = [
        {
          functionDeclarations: [
            {
              name: 'list_resources',
              description: 'List resources with optional search and category filters.',
              parameters: {
                type: Type.OBJECT,
                properties: {
                  search: { type: Type.STRING, description: 'Search term for resource name' },
                  category: { type: Type.STRING, description: 'Category name' }
                }
              }
            },
            {
              name: 'create_resource',
              description: 'Create a new resource.',
              parameters: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  category: { type: Type.STRING },
                  address: { type: Type.STRING },
                  phone: { type: Type.STRING },
                  website: { type: Type.STRING },
                  description: { type: Type.STRING }
                },
                required: ['name', 'category']
              }
            },
            {
              name: 'update_resource',
              description: 'Update an existing resource.',
              parameters: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  updates: { 
                    type: Type.OBJECT,
                    properties: {
                      name: { type: Type.STRING },
                      category: { type: Type.STRING },
                      address: { type: Type.STRING },
                      phone: { type: Type.STRING },
                      website: { type: Type.STRING },
                      description: { type: Type.STRING },
                      status: { type: Type.STRING }
                    }
                  }
                },
                required: ['id', 'updates']
              }
            },
            {
              name: 'delete_resource',
              description: 'Delete a resource.',
              parameters: {
                type: Type.OBJECT,
                properties: { id: { type: Type.STRING } },
                required: ['id']
              }
            },
            {
              name: 'list_categories',
              description: 'List all categories.',
              parameters: { type: Type.OBJECT, properties: {} }
            },
            {
              name: 'create_category',
              description: 'Create a new category.',
              parameters: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  parent_id: { type: Type.STRING },
                  sequence: { type: Type.NUMBER }
                },
                required: ['name']
              }
            },
            {
              name: 'update_category',
              description: 'Update an existing category.',
              parameters: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  updates: {
                    type: Type.OBJECT,
                    properties: {
                      name: { type: Type.STRING },
                      parent_id: { type: Type.STRING },
                      sequence: { type: Type.NUMBER }
                    }
                  }
                },
                required: ['id', 'updates']
              }
            },
            {
              name: 'delete_category',
              description: 'Delete a category.',
              parameters: {
                type: Type.OBJECT,
                properties: { id: { type: Type.STRING } },
                required: ['id']
              }
            },
            {
              name: 'list_reports',
              description: 'List community reports.',
              parameters: {
                type: Type.OBJECT,
                properties: {
                  status: { type: Type.STRING, description: 'open, in_review, resolved, duplicate' }
                }
              }
            },
            {
              name: 'update_report',
              description: 'Update a report status or notes.',
              parameters: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  updates: {
                    type: Type.OBJECT,
                    properties: {
                      report_status: { type: Type.STRING },
                      resolution_notes: { type: Type.STRING }
                    }
                  }
                },
                required: ['id', 'updates']
              }
            },
            {
              name: 'list_users',
              description: 'List admin users.',
              parameters: { type: Type.OBJECT, properties: {} }
            },
            {
              name: 'create_user',
              description: 'Create a new admin user.',
              parameters: {
                type: Type.OBJECT,
                properties: {
                  email: { type: Type.STRING },
                  password: { type: Type.STRING }
                },
                required: ['email', 'password']
              }
            },
            {
              name: 'delete_user',
              description: 'Delete an admin user.',
              parameters: {
                type: Type.OBJECT,
                properties: { id: { type: Type.STRING } },
                required: ['id']
              }
            },
            {
              name: 'reset_categories',
              description: 'Reset all categories to the standard structure defined in the guide. This will delete all current categories and recreate them.',
              parameters: { type: Type.OBJECT, properties: {} }
            },
            {
              name: 'list_error_logs',
              description: 'List recent error events/logs.',
              parameters: {
                type: Type.OBJECT,
                properties: {
                  severity: { type: Type.STRING, description: 'critical, error, warning, info' },
                  source: { type: Type.STRING, description: 'client, api, auth' },
                  limit: { type: Type.NUMBER }
                }
              }
            },
            {
              name: 'resolve_error_log',
              description: 'Mark an error log as resolved.',
              parameters: {
                type: Type.OBJECT,
                properties: { id: { type: Type.STRING } },
                required: ['id']
              }
            }
          ]
        }
      ];

      const chat = ai.chats.create({
        model: "gemini-3.1-pro-preview",
        config: {
          systemInstruction: "You are a highly capable Admin AI Assistant for the SuperGuide platform. Your goal is to help administrators manage the system efficiently. You can perform CRUD operations on resources, categories, and users. You can also review and update community reports and error logs. Always be professional, concise, and confirm actions before performing them if they are destructive (like deleting). If you need more information to perform a task, ask the user. You have access to the database through tool calls.",
          tools: tools
        },
        history: messages.map(m => ({ role: m.role, parts: m.parts }))
      });

      let response = await chat.sendMessage({ message: input });
      
      // Handle potential multiple rounds of tool calls
      while (response.functionCalls) {
        const functionResponses = [];
        for (const call of response.functionCalls) {
          const result = await handleToolCall(call);
          functionResponses.push({
            id: call.id,
            name: call.name,
            response: result
          });
        }
        
        response = await chat.sendMessage({
          message: JSON.stringify(functionResponses)
        });
      }

      const modelMessage: Message = { role: 'model', parts: [{ text: response.text || "I've processed your request." }] };
      setMessages(prev => [...prev, modelMessage]);
    } catch (err: any) {
      console.error('AI Error:', err);
      setMessages(prev => [...prev, { 
        role: 'model', 
        parts: [{ text: `Sorry, I encountered an error: ${err.message}` }] 
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[700px] bg-white rounded-3xl border border-zinc-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-zinc-100 bg-zinc-50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-zinc-900 rounded-2xl flex items-center justify-center shadow-lg shadow-zinc-200">
            <Bot className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-black text-zinc-900 tracking-tight">Intelligence</h2>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Powered by Gemini 3.1 Pro</span>
            </div>
          </div>
        </div>
        <button 
          onClick={() => setMessages([{ role: 'model', parts: [{ text: "Chat history cleared. How can I help you?" }] }])}
          className="p-2 hover:bg-zinc-200 rounded-xl transition-all text-zinc-400 hover:text-zinc-600"
          title="Clear Chat"
        >
          <RefreshCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Messages */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-6 space-y-6 bg-zinc-50/30"
      >
        {messages.map((msg, i) => (
          <div 
            key={i} 
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}
          >
            <div className={`flex gap-3 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                msg.role === 'user' ? 'bg-zinc-200 text-zinc-600' : 'bg-zinc-900 text-white'
              }`}>
                {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>
              <div className={`p-4 rounded-2xl text-sm leading-relaxed shadow-sm ${
                msg.role === 'user' 
                  ? 'bg-white text-zinc-900 rounded-tr-none border border-zinc-100' 
                  : 'bg-zinc-900 text-zinc-100 rounded-tl-none'
              }`}>
                {msg.parts[0].text}
              </div>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start animate-pulse">
            <div className="flex gap-3">
              <div className="w-8 h-8 bg-zinc-900 rounded-xl flex items-center justify-center">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div className="bg-zinc-900 p-4 rounded-2xl rounded-tl-none flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-zinc-400" />
                <span className="text-xs text-zinc-400 font-bold uppercase tracking-widest">Assistant is thinking...</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-6 bg-white border-t border-zinc-100">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Ask me to manage resources, users, or review reports..."
              className="w-full pl-4 pr-12 py-4 bg-zinc-50 border border-zinc-200 rounded-2xl focus:ring-2 focus:ring-zinc-900 outline-none transition-all text-sm font-medium"
              disabled={loading}
            />
            <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-zinc-300" />
            </div>
          </div>
          <button
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            className="px-6 bg-zinc-900 text-white rounded-2xl hover:bg-zinc-800 disabled:opacity-50 transition-all shadow-lg shadow-zinc-200 flex items-center justify-center"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          </button>
        </div>
        <p className="mt-3 text-[10px] text-zinc-400 font-bold uppercase tracking-widest text-center flex items-center justify-center gap-2">
          <Terminal className="w-3 h-3" />
          AI can perform database actions. Use with caution.
        </p>
      </div>
    </div>
  );
}
