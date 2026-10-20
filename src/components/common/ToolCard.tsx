import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import type { ToolDefinition } from '../../types/tool';

interface ToolCardProps {
  tool: ToolDefinition;
}

export function ToolCard({ tool }: ToolCardProps) {
  const Icon = tool.icon;

  return (
    <Link
      to={tool.path}
      className="group relative flex flex-col justify-between p-5 rounded-2xl bg-white border border-slate-200/90 shadow-sm transition-all duration-200 hover:shadow-md hover:border-primary/40 hover:-translate-y-0.5 dark:bg-slate-900/90 dark:border-slate-800/90 dark:hover:border-primary/50 dark:hover:shadow-primary/5"
    >
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="w-11 h-11 rounded-xl bg-primary-light text-primary flex items-center justify-center transition-transform duration-200 group-hover:scale-105 shadow-sm">
            <Icon className="w-5 h-5" strokeWidth={2.2} />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200/60 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700/60">
              {tool.category}
            </span>
            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 transition-colors group-hover:text-primary group-hover:bg-primary-light">
              <ArrowUpRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </div>
          </div>
        </div>

        <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1.5 transition-colors group-hover:text-primary">
          {tool.title}
        </h3>
        <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400 line-clamp-2">
          {tool.description}
        </p>
      </div>

      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-[11px] font-medium text-slate-400 dark:text-slate-500">
        <span className="group-hover:text-primary transition-colors">100% Offline</span>
        <span className="text-primary font-semibold opacity-0 -translate-x-2 transition-all duration-200 group-hover:opacity-100 group-hover:translate-x-0">
          Open Tool →
        </span>
      </div>
    </Link>
  );
}
