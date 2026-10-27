import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';
import { TOOLS } from '../../config/tools';
import type { ToolDefinition } from '../../types/tool';

interface ToolPageHeaderProps {
  toolId: ToolDefinition['id'];
  action?: ReactNode;
}

export function ToolPageHeader({ toolId, action }: ToolPageHeaderProps) {
  const tool = TOOLS.find((item) => item.id === toolId);

  if (!tool) {
    throw new Error(`Tool configuration not found for "${toolId}".`);
  }

  const Icon = tool.icon;

  return (
    <header className="mb-8">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to all tools
        </Link>
        <div className="flex flex-wrap items-center gap-4">
          {action}
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
            {tool.category} Tool
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3.5">
        <div className="w-12 h-12 rounded-2xl bg-accent text-accent-foreground flex items-center justify-center shadow-xs shrink-0">
          <Icon className="w-6 h-6" strokeWidth={2.3} />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
            {tool.title}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">{tool.description}</p>
        </div>
      </div>
    </header>
  );
}
