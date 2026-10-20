import { Tabs } from '@base-ui/react';
import type { ToolCategory } from '../../types/tool';

interface CategoryFilterProps {
  selectedCategory: ToolCategory;
  onSelectCategory: (category: ToolCategory) => void;
  counts: Record<ToolCategory, number>;
}

const CATEGORIES: ToolCategory[] = ['All', 'Edit', 'Secure', 'Convert', 'Optimize'];

export function CategoryFilter({
  selectedCategory,
  onSelectCategory,
  counts
}: CategoryFilterProps) {
  return (
    <Tabs.Root
      value={selectedCategory}
      onValueChange={(val) => onSelectCategory(val as ToolCategory)}
      className="w-full flex justify-center"
    >
      <Tabs.List className="inline-flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 border border-slate-200/80 dark:bg-slate-900 dark:border-slate-800 shadow-inner">
        {CATEGORIES.map((cat) => {
          const count = counts[cat] || 0;
          return (
            <Tabs.Tab
              key={cat}
              value={cat}
              className={`
                px-3.5 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all duration-150 cursor-pointer select-none flex items-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-primary/40
                ${selectedCategory === cat 
                  ? 'bg-white text-primary shadow-sm dark:bg-slate-800 dark:text-primary font-bold' 
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800/50'}
              `}
            >
              <span>{cat}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-medium ${
                selectedCategory === cat 
                  ? 'bg-primary-light text-primary font-semibold' 
                  : 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
              }`}>
                {count}
              </span>
            </Tabs.Tab>
          );
        })}
      </Tabs.List>
    </Tabs.Root>
  );
}
