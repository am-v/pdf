import { useState, useMemo } from 'react';
import { Search, HeartHandshake } from 'lucide-react';
import { TOOLS } from '../config/tools';
import { ToolCard } from '../components/common/ToolCard';
import { CategoryFilter } from '../components/common/CategoryFilter';
import type { ToolCategory } from '../types/tool';

export function Home() {
  const [selectedCategory, setSelectedCategory] = useState<ToolCategory>('All');
  const [searchQuery, setSearchQuery] = useState('');

  const visibleTools = useMemo(() => TOOLS.filter(tool => !tool.hidden), []);

  const categoryCounts = useMemo(() => {
    const counts: Record<ToolCategory, number> = {
      All: visibleTools.length,
      Edit: 0,
      Secure: 0,
      Convert: 0,
      Optimize: 0
    };
    visibleTools.forEach(tool => {
      counts[tool.category] = (counts[tool.category] || 0) + 1;
    });
    return counts;
  }, [visibleTools]);

  const filteredTools = useMemo(() => {
    return visibleTools.filter(tool => {
      const matchesCategory = selectedCategory === 'All' || tool.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || tool.title.toLowerCase().includes(q) || tool.description.toLowerCase().includes(q);
      return matchesCategory && matchesSearch;
    });
  }, [visibleTools, selectedCategory, searchQuery]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
      {/* Hero Header */}
      <div className="text-center max-w-2xl mx-auto mb-10">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary-light text-primary text-xs font-bold tracking-wide uppercase mb-4">
          <HeartHandshake className="w-3.5 h-3.5" />
          <span>Privacy First · Zero Server Uploads</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-4">
          Every PDF tool you need, <br className="hidden sm:inline" />
          <span className="text-primary font-bold">100% on your device.</span>
        </h1>
        <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 leading-relaxed">
          <span className="font-semibold text-slate-800 dark:text-slate-200">Privacy-first</span>, client-side PDF utilities for pdf.com.in. Zero server uploads, no queues, and total privacy—your documents never leave your device.
        </p>
      </div>

      {/* Controls: Search and Category Tabs */}
      <div className="flex flex-col items-center gap-6 mb-10">
        {/* Search Bar */}
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`Search all ${visibleTools.length} PDF tools (merge, compress, split, sign...)`}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-slate-800 dark:bg-slate-900 dark:text-white dark:focus:border-primary transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              Clear
            </button>
          )}
        </div>

        {/* Category Tabs */}
        <CategoryFilter
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
          counts={categoryCounts}
        />
      </div>

      {/* Tools Grid */}
      {filteredTools.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredTools.map(tool => (
            <ToolCard key={tool.id} tool={tool} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 px-4 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
          <p className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
            No tools matched "{searchQuery}"
          </p>
          <p className="text-xs text-slate-400 mb-4">Try searching for keywords like "merge", "password", or "image".</p>
          <button
            onClick={() => { setSearchQuery(''); setSelectedCategory('All'); }}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-primary text-white shadow hover:bg-primary-hover transition-colors"
          >
            Reset Filters
          </button>
        </div>
      )}
    </div>
  );
}
