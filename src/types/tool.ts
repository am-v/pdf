import type { LucideIcon } from 'lucide-react';

export type ToolCategory = 'All' | 'Edit' | 'Secure' | 'Convert' | 'Optimize';

export interface ToolDefinition {
  id: string;
  title: string;
  description: string;
  category: Exclude<ToolCategory, 'All'>;
  path: string;
  icon: LucideIcon;
  badge?: string;
  isPopular?: boolean;
  hidden?: boolean;
}
