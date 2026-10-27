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
      className="group relative flex flex-col justify-between p-5 rounded-2xl bg-white border border-gray-200/90 shadow-sm transition-all duration-200 hover:shadow-md hover:border-accent/40 hover:-trangray-y-0.5 dark:bg-gray-900/90 dark:border-gray-800/90 dark:hover:border-accent/50 dark:hover:shadow-accent/5"
    >
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="w-11 h-11 rounded-xl bg-accent text-accent-foreground flex items-center justify-center transition-transform duration-200 shadow-xs">
            <Icon className="w-5 h-5" strokeWidth={2.2} />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 border border-gray-200/60 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700/60">
              {tool.category}
            </span>
            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-500 transition-colors group-hover:bg-gray-200/50 dark:group-hover:bg-gray-800/50">
              <ArrowUpRight className="w-4 h-4 transition-transform duration-200 group-hover:trangray-x-0.5 group-hover:-trangray-y-0.5" />
            </div>
          </div>
        </div>

        <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1.5 transition-colors group-hover:decoration-accent group-hover:underline group-hover:decoration-2 group-hover:underline-offset-4">
          {tool.title}
        </h3>
        <p className="text-xs leading-relaxed text-gray-500 dark:text-gray-400 line-clamp-2">
          {tool.description}
        </p>
      </div>

      <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800/60 flex items-center justify-between text-[11px] font-medium text-gray-800 dark:text-gray-100">
        <span className="text-gray-500 dark:text-gray-400">
          100% Offline
        </span>
        <span>
          Open Tool →
        </span>
      </div>
    </Link>
  );
}
