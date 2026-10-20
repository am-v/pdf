import { Link } from 'react-router-dom';
import { FileHeart, MonitorCheck } from 'lucide-react';
import { ThemeToggle } from '../common/ThemeToggle';

export function Header() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 bg-white/80 backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-950/80 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shadow-md shadow-primary/25 transition-transform group-hover:scale-105">
            <FileHeart className="w-5 h-5" strokeWidth={2.5} />
          </div>
          <div>
            <span className="font-medium tracking-tight text-slate-900 dark:text-white group-hover:text-primary transition-colors">
              <span className="text-primary text-lg font-bold">PDF</span>.com.in
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200/80 text-emerald-700 dark:bg-emerald-950/50 dark:border-emerald-800/60 dark:text-emerald-400 text-xs font-semibold">
            <MonitorCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Runs in Your Browser</span>
          </div>

          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
