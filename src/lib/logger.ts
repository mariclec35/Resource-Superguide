import { supabase } from "./supabase";

export type ErrorSeverity = 'info' | 'warning' | 'error' | 'critical';
export type ErrorSource = 'client' | 'api' | 'job';

export interface ErrorLog {
  source: ErrorSource;
  severity: ErrorSeverity;
  message: string;
  stack?: string;
  route?: string;
  endpoint?: string;
  user_id?: string;
  session_id?: string;
  metadata?: any;
}

class Logger {
  private sessionId: string;

  constructor() {
    this.sessionId = Math.random().toString(36).substring(2, 15);
  }

  async log(entry: ErrorLog) {
    // Log to console in development
    if (import.meta.env.DEV) {
      console.group(`[Logger] ${entry.severity.toUpperCase()} - ${entry.source}`);
      console.log('Message:', entry.message);
      if (entry.metadata) console.log('Metadata:', entry.metadata);
      if (entry.stack) console.log('Stack:', entry.stack);
      console.groupEnd();
    }

    try {
      // Get current user if available
      const { data: { user } } = await supabase.auth.getUser();
      
      const payload = {
        ...entry,
        session_id: this.sessionId,
        user_id: user?.id || entry.user_id,
        route: window.location.pathname,
      };

      // Send to our API endpoint
      const response = await fetch('/api/log-error', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Failed to log error: ${response.statusText}`);
      }
    } catch (err) {
      // Fallback: if API fails, try direct Supabase insert (if RLS allows)
      console.error('Logger failed to send to API, attempting direct insert:', err);
      try {
        await supabase.from('error_events').insert({
          ...entry,
          session_id: this.sessionId,
          route: window.location.pathname,
        });
      } catch (directErr) {
        console.error('Logger direct insert failed:', directErr);
      }
    }
  }

  info(message: string, metadata?: any) {
    this.log({ source: 'client', severity: 'info', message, metadata });
  }

  warn(message: string, metadata?: any) {
    this.log({ source: 'client', severity: 'warning', message, metadata });
  }

  error(message: string, error?: any, metadata?: any) {
    this.log({
      source: 'client',
      severity: 'error',
      message,
      stack: error?.stack,
      metadata: {
        ...metadata,
        originalError: error?.message || error,
      },
    });
  }

  critical(message: string, error?: any, metadata?: any) {
    this.log({
      source: 'client',
      severity: 'critical',
      message,
      stack: error?.stack,
      metadata: {
        ...metadata,
        originalError: error?.message || error,
      },
    });
  }

  initGlobalCapture() {
    window.onerror = (message, source, lineno, colno, error) => {
      this.critical('Uncaught Window Error', error, {
        source,
        lineno,
        colno,
        message: message.toString(),
      });
      return false; // Let default browser handler run
    };

    window.onunhandledrejection = (event) => {
      this.error('Unhandled Promise Rejection', event.reason, {
        promise: 'unhandledrejection',
      });
    };

    console.log('[Logger] Global error capture initialized');
  }
}

export const logger = new Logger();
