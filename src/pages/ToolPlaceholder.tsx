import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Construction } from 'lucide-react';
import { TOOLS } from '../config/tools';

export function ToolPlaceholder() {
  const { toolId } = useParams<{ toolId: string }>();
  const tool = TOOLS.find(t => t.path === `/${toolId}` || t.id === toolId);

  return (
    <div className="max-w-3xl mx-auto px-4 py-16 text-center">
      <Link
        to="/"
        className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-primary transition-colors mb-8"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to All Tools
      </Link>

      <div className="p-8 sm:p-12 rounded-3xl bg-white border border-slate-200/80 shadow-sm dark:bg-slate-900 dark:border-slate-800">
        <div className="w-16 h-16 rounded-2xl bg-primary-light text-primary flex items-center justify-center mx-auto mb-6 shadow-sm">
          {tool?.icon ? <tool.icon className="w-8 h-8" /> : <Construction className="w-8 h-8" />}
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mb-2">
          {tool?.title || 'Tool'}
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-6">
          {tool?.description || 'Tool details'}
        </p>

        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-200/60 text-blue-700 dark:bg-blue-950/40 dark:border-blue-800/40 dark:text-blue-300 text-xs font-semibold">
          <span>Scheduled for Migration in Phase 3 / 4</span>
        </div>
      </div>
    </div>
  );
}
