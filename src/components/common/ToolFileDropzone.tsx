import type { DragEventHandler, ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { twMerge } from 'tailwind-merge';

interface ToolFileDropzoneProps {
  icon: LucideIcon;
  title: string;
  description: string;
  buttonLabel?: string;
  isDragOver: boolean;
  onDragOver: DragEventHandler<HTMLDivElement>;
  onDragLeave: DragEventHandler<HTMLDivElement>;
  onDrop: DragEventHandler<HTMLDivElement>;
  onClick: () => void;
  children?: ReactNode;
  className?: string;
}

export function ToolFileDropzone({
  icon: Icon,
  title,
  description,
  buttonLabel,
  isDragOver,
  onDragOver,
  onDragLeave,
  onDrop,
  onClick,
  children,
  className = ''
}: ToolFileDropzoneProps) {
  return (
    <div
      onDragOver={onDragOver}
      onDragLeave={(event) => {
        const { relatedTarget } = event;
        if (!(relatedTarget instanceof Node) || !event.currentTarget.contains(relatedTarget)) {
          onDragLeave(event);
        }
      }}
      onDrop={onDrop}
      onClick={onClick}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onClick();
        }
      }}
      role="button"
      tabIndex={0}
      className={twMerge(
        'border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-950',
        isDragOver
          ? 'border-accent bg-accent/5 scale-[1.005]'
          : 'border-neutral-300 dark:border-neutral-700 hover:border-neutral-400 dark:hover:border-neutral-600 bg-white/50 dark:bg-neutral-900/50',
        className
      )}
    >
      {children}
      <div className="flex flex-col items-center justify-center space-y-3">
        <div className="w-16 h-16 rounded-2xl bg-accent flex items-center justify-center text-accent-foreground">
          <Icon className="w-8 h-8" />
        </div>
        <div>
          <p className="font-semibold text-neutral-800 dark:text-neutral-200">{title}</p>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">{description}</p>
        </div>
        {buttonLabel && (
          <span className="inline-flex items-center gap-2 px-5 py-2.5 bg-accent text-accent-foreground rounded-xl text-sm font-medium hover:bg-accent/90 transition-colors">
            {buttonLabel}
          </span>
        )}
      </div>
    </div>
  );
}
