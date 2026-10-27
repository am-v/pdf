import { useState, useMemo } from 'react';
import { HeartHandshake } from 'lucide-react';
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
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent text-accent-foreground text-xs font-semibold tracking-wide uppercase mb-4">
          <HeartHandshake className="w-3.5 h-3.5" />
          <span>Privacy First · Zero Server Uploads</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-bold text-gray-900 dark:text-white tracking-tight mb-4 leading-15">
          Every PDF tool you need, <br className="hidden sm:inline" />
          <span className="underline decoration-accent underline-offset-6">100% on your device.</span>
        </h1>
        <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 leading-relaxed">
          <span className="font-semibold text-gray-800 dark:text-gray-200">Privacy-first</span>, client-side PDF utilities for pdf.com.in. Zero server uploads, no queues, and total privacy—your documents never leave your device.
        </p>
      </div>

      {/* Controls: Search and Category Tabs */}
      <div className="flex flex-col items-center gap-6 mb-10 w-full max-w-full">
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
        <div className="text-center py-16 px-4 rounded-3xl border border-dashed border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/30">
          <p className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">
            No tools matched "{searchQuery}"
          </p>
          <p className="text-xs text-gray-400 mb-4">Try searching for keywords like "merge", "password", or "image".</p>
          <button
            onClick={() => { setSearchQuery(''); setSelectedCategory('All'); }}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-accent text-accent-foreground shadow hover:bg-accent/90 transition-colors"
          >
            Reset Filters
          </button>
        </div>
      )}
    </div>
  );
}
