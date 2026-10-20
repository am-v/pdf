import {
  Layers,
  Scissors,
  Zap,
  Lock,
  Unlock,
  RotateCw,
  ArrowUpDown,
  Hash,
  Type,
  Tags,
  PenTool,
  Palette,
  FileImage,
  ImagePlus,
  Sparkles,
  FileText,
  Wrench
} from 'lucide-react';
import type { ToolDefinition } from '../types/tool';

export const TOOLS: ToolDefinition[] = [
  {
    id: 'merge',
    title: 'Merge PDF',
    description: 'Combine multiple PDF files into one clean document with custom page ordering.',
    category: 'Edit',
    path: '/merge',
    icon: Layers,
    isPopular: true
  },
  {
    id: 'compress',
    title: 'Compress PDF',
    description: 'Optimize file size while preserving text clarity with intelligent image condensing.',
    category: 'Optimize',
    path: '/compress',
    icon: Zap,
    isPopular: true
  },
  {
    id: 'split',
    title: 'Split PDF',
    description: 'Visually extract specific pages or custom ranges into single or separate PDFs.',
    category: 'Edit',
    path: '/split',
    icon: Scissors,
    isPopular: true
  },
  {
    id: 'pdf-to-image',
    title: 'PDF to Image',
    description: 'Render pages to high-resolution JPG or PNG images with 72 to 300 DPI presets.',
    category: 'Convert',
    path: '/pdf-to-image',
    icon: FileImage,
    isPopular: true
  },
  {
    id: 'image-to-pdf',
    title: 'Image to PDF',
    description: 'Convert JPG, PNG, and WebP images into a polished, multi-page PDF document.',
    category: 'Convert',
    path: '/image-to-pdf',
    icon: ImagePlus,
    isPopular: true
  },
  {
    id: 'protect',
    title: 'Protect PDF',
    description: 'Encrypt your confidential documents with military-grade password encryption.',
    category: 'Secure',
    path: '/protect',
    icon: Lock
  },
  {
    id: 'unlock',
    title: 'Unlock PDF',
    description: 'Remove password protection from your PDFs using secure client-side WebAssembly.',
    category: 'Secure',
    path: '/unlock',
    icon: Unlock
  },
  {
    id: 'rotate',
    title: 'Rotate PDF',
    description: 'Permanently rotate individual pages or the entire document by 90°, 180°, or 270°.',
    category: 'Edit',
    path: '/rotate-pdf',
    icon: RotateCw
  },
  {
    id: 'signature',
    title: 'Sign PDF',
    description: 'Draw or upload an electronic signature, trim margins, and place on any page.',
    category: 'Edit',
    path: '/signature',
    icon: PenTool,
    isPopular: true
  },
  {
    id: 'pdf-to-text',
    title: 'PDF to Text',
    description: 'Extract raw text layer or perform deep offline OCR recognition on scanned pages.',
    category: 'Convert',
    path: '/pdf-to-text',
    icon: FileText
  },
  {
    id: 'rearrange',
    title: 'Rearrange PDF',
    description: 'Reorder, delete, or duplicate pages with drag-and-drop visual preview.',
    category: 'Edit',
    path: '/rearrange-pdf',
    icon: ArrowUpDown
  },
  {
    id: 'page-numbers',
    title: 'Page Numbers',
    description: 'Insert automated page numbering with custom formatting, positioning, and colors.',
    category: 'Edit',
    path: '/page-numbers',
    icon: Hash
  },
  {
    id: 'watermark',
    title: 'Watermark',
    description: 'Stamp custom text watermarks for confidential branding and copyright security.',
    category: 'Edit',
    path: '/watermark',
    icon: Type
  },
  {
    id: 'extract-images',
    title: 'Extract Images',
    description: 'Extract embedded raw photos directly from inside the PDF without quality loss.',
    category: 'Convert',
    path: '/extract-images',
    icon: Sparkles
  },
  {
    id: 'grayscale',
    title: 'Grayscale PDF',
    description: 'Convert color documents to crisp black and white to save printer ink and storage.',
    category: 'Optimize',
    path: '/grayscale',
    icon: Palette
  },
  {
    id: 'repair',
    title: 'Repair PDF',
    description: 'Recover and reconstruct corrupt or unreadable PDFs by rebuilding cross-references.',
    category: 'Optimize',
    path: '/repair',
    icon: Wrench
  },
  {
    id: 'metadata',
    title: 'Metadata Editor',
    description: 'View, edit, or deep-clean wipe metadata tags to protect your digital privacy.',
    category: 'Secure',
    path: '/metadata',
    icon: Tags,
    hidden: true
  }
];
