import { useEffect, useState } from 'react';
import { CheckCircle, Loader2, AlertCircle } from 'lucide-react';

interface ImportProgressDialogProps {
  isOpen: boolean;
  stage: string;
  progress: number;
  stats?: {
    processed: number;
    created: number;
    updated: number;
    customers: number;
    suppliers: number;
    products: number;
  };
  error?: string;
}

export default function ImportProgressDialog({
  isOpen,
  stage,
  progress,
  stats,
  error,
}: ImportProgressDialogProps) {
  const [dots, setDots] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? '' : prev + '.'));
    }, 500);
    return () => clearInterval(interval);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-lg shadow-2xl p-8 w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="flex items-center justify-center mb-4">
            {error ? (
              <AlertCircle className="w-16 h-16 text-red-500" />
            ) : progress === 100 ? (
              <CheckCircle className="w-16 h-16 text-green-500" />
            ) : (
              <Loader2 className="w-16 h-16 text-primary animate-spin" />
            )}
          </div>
          <h2 className="text-2xl font-bold">
            {error ? 'Import Failed' : progress === 100 ? 'Import Complete!' : 'Importing Data'}
          </h2>
          <p className="text-muted-foreground mt-2">
            {error ? error : `${stage}${dots}`}
          </p>
        </div>

        {/* Progress Bar */}
        {!error && (
          <div className="mb-6">
            <div className="relative w-full h-4 bg-muted rounded-full overflow-hidden">
              <div
                className="absolute top-0 left-0 h-full bg-gradient-to-r from-primary to-primary/80 transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              >
                <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
              </div>
            </div>
            <div className="text-center mt-2 text-sm font-medium text-primary">
              {Math.round(progress)}%
            </div>
          </div>
        )}

        {/* Statistics */}
        {stats && (stats.processed > 0 || progress === 100) && (
          <div className="space-y-3 text-sm">
            <div className="flex justify-between py-2 border-b border-border">
              <span className="text-muted-foreground">Total Processed:</span>
              <span className="font-semibold">{stats.processed}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-border">
              <span className="text-muted-foreground">Created:</span>
              <span className="font-semibold text-green-600">{stats.created}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-border">
              <span className="text-muted-foreground">Updated:</span>
              <span className="font-semibold text-blue-600">{stats.updated}</span>
            </div>

            {/* Breakdown */}
            {(stats.customers > 0 || stats.suppliers > 0 || stats.products > 0) && (
              <div className="mt-4 pt-4 border-t border-border">
                <p className="text-xs text-muted-foreground mb-2">Breakdown:</p>
                {stats.customers > 0 && (
                  <div className="flex justify-between py-1">
                    <span className="text-muted-foreground">Customers:</span>
                    <span className="font-medium">{stats.customers}</span>
                  </div>
                )}
                {stats.suppliers > 0 && (
                  <div className="flex justify-between py-1">
                    <span className="text-muted-foreground">Suppliers:</span>
                    <span className="font-medium">{stats.suppliers}</span>
                  </div>
                )}
                {stats.products > 0 && (
                  <div className="flex justify-between py-1">
                    <span className="text-muted-foreground">Products:</span>
                    <span className="font-medium">{stats.products}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Loading Spinner for Early Stages */}
        {!stats && !error && progress < 20 && (
          <div className="flex items-center justify-center py-8">
            <div className="flex space-x-2">
              <div className="w-3 h-3 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-3 h-3 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-3 h-3 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
