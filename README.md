# pdf.com.in — Privacy-First Client-Side PDF Toolkit

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)
[![React](https://img.shields.io/badge/React-19.0-61dafb?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6.2-646cff?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38bdf8?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Vitest Tests](https://img.shields.io/badge/Tests-150%2F150%20passing-brightgreen?logo=vitest&logoColor=white)](https://vitest.dev/)
[![Privacy](https://img.shields.io/badge/Privacy-100%25_Offline_Client--Side-emerald)](#privacy--security-guarantee)

> **Every PDF tool you need, 100% on your device.**  
> A high-performance, modern, and privacy-first web application featuring 17 standalone PDF utilities. All operations run directly in browser memory via WebAssembly and client-side engines—no server uploads, no queues, no file retention, and zero telemetry.

---

## Table of Contents

- [Key Highlights](#key-highlights)
- [Complete Tool Inventory (17 Tools)](#complete-tool-inventory-17-tools)
- [Architecture & Design Principles](#architecture--design-principles)
- [Technology Stack](#technology-stack)
- [Project Directory Structure](#project-directory-structure)
- [Getting Started](#getting-started)
- [Scripts & Development](#scripts--development)
- [Testing & Quality Assurance](#testing--quality-assurance)
- [Performance & Loading](#performance--loading)
- [Privacy & Security Guarantee](#privacy--security-guarantee)
- [License](#license)

---

## Key Highlights

- 🔒 **100% Client-Side Processing**: Your files never leave your device. All manipulation happens in browser memory using WebAssembly (`qpdf-run`), `pdf-lib`, and `pdfjs-dist`.
- ⚡ **On-Demand Tool Loading**: All 17 tools are dynamically lazy-loaded via `React.lazy()` with route-based manual chunk splitting.
- 📐 **3-Tier Decoupled Architecture**: Strict separation of concerns (`Core Binary Primitives` ➔ `Custom React Hooks` ➔ `Accessible Base UI Components`). Core modules contain 0 React dependencies and can run in any JavaScript/TypeScript runtime.
- 🧪 **Exhaustive Automated Testing**: **150/150 tests passing** across 21 Vitest test suites, including real-world regression tests against heavy multi-page documents (160+ pages).
- ♿ **Accessible & Responsive**: Built with headless `@base-ui/react` primitives adhering to WCAG 2.1 AA standards, keyboard navigation, full screen reader support, and responsive layouts across mobile (375px), tablet, and desktop.
- 🌓 **Dark / Light Mode**: Seamless theme toggling with system preference detection and localStorage persistence.
- 🛡️ **Hardened & Audited**: Pinned cryptographic and PDF parsing dependencies, explicit resource deallocation (`pdfDoc.destroy()` lifecycles), zero memory leaks, and MIT-licensed open-source availability.

---

## Complete Tool Inventory (17 Tools)

All tools are accessible via dedicated routes and categorized into functional clusters:

| # | Tool Name | Route | Category | Core Engine | Description |
|:---|:---|:---|:---|:---|:---|
| 1 | **Merge PDF** | `/merge` | Edit | `pdf-lib` | Combine multiple PDF files into one clean document with custom order & rotation. |
| 2 | **Split PDF** | `/split` | Edit | `pdf-lib`, `jszip` | Visually extract specific pages or custom ranges into single or separate PDFs. |
| 3 | **Rotate PDF** | `/rotate-pdf` | Edit | `pdf-lib` | Permanently rotate individual pages or the entire document by 90°, 180°, or 270°. |
| 4 | **Rearrange PDF** | `/rearrange-pdf` | Edit | `pdf-lib` | Reorder, duplicate, or delete pages with interactive thumbnail previews. |
| 5 | **Page Numbers** | `/page-numbers` | Edit | `pdf-lib` | Add automated page numbering with customizable format, position, margin, and color. |
| 6 | **Watermark** | `/watermark` | Edit | `pdf-lib` | Stamp custom text watermarks with control over font size, opacity, angle, and position. |
| 7 | **Sign PDF** | `/signature` | Edit | `pdf-lib`, Canvas 2D | Draw or upload electronic signatures, auto-trim margins, and stamp on any page. |
| 8 | **Compress PDF** | `/compress` | Optimize | `pdf-lib`, `pdfjs-dist` | Reduce file size via DCT image stream re-encoding or high-ratio canvas rasterization. |
| 9 | **Grayscale PDF** | `/grayscale` | Optimize | `pdfjs-dist`, `pdf-lib` | Convert color documents to clean Rec. 601 grayscale to conserve printer ink and space. |
| 10 | **Repair PDF** | `/repair` | Optimize | `pdf-lib` | Reconstruct and recover corrupted PDF structures by regenerating cross-reference tables. |
| 11 | **Protect PDF** | `/protect` | Secure | `@pdfsmaller/pdf-encrypt-lite` | Encrypt confidential documents with standard password encryption. |
| 12 | **Unlock PDF** | `/unlock` | Secure | `qpdf-run` (WebAssembly) | Decrypt password-protected PDFs locally using compiled QPDF WebAssembly. |
| 13 | **Metadata Editor** | `/metadata` | Secure | `pdf-lib` | Inspect, update, or deep-clean wipe metadata tags and XMP streams for privacy. |
| 14 | **PDF to Image** | `/pdf-to-image` | Convert | `pdfjs-dist`, `jszip` | Render PDF pages to high-resolution JPG or PNG images with 72 to 300 DPI presets. |
| 15 | **Image to PDF** | `/image-to-pdf` | Convert | `pdf-lib`, Canvas 2D | Convert JPG, PNG, and WebP images into a single polished PDF document. |
| 16 | **Extract Images** | `/extract-images` | Convert | `pdfjs-dist`, `jszip` | Extract embedded raw images directly from PDF object streams into a ZIP bundle. |
| 17 | **PDF to Text** | `/pdf-to-text` | Convert | `pdfjs-dist` | Extract raw text layers with word count, character count, and structured formatting. |

---

## Architecture & Design Principles

The application enforces a strict unidirectional data flow and clean separation of concerns:

```
┌─────────────────────────────────────────────────────────────┐
│                 React Presentation Layer                    │
│   src/components/ (Base UI primitives, Tailwind CSS v4)     │
└──────────────────────────────┬──────────────────────────────┘
                               │ User interactions & files
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                     Custom Hooks Layer                      │
│        src/hooks/pdf/ (Lifecycle, Progress, Errors)         │
└──────────────────────────────┬──────────────────────────────┘
                               │ Typed input params & AbortSignal
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                 Core PDF Operation Modules                  │
│       src/core/pdf/ (Pure TypeScript, Zero Framework)       │
└──────────────────────────────┬──────────────────────────────┘
                               │ Raw Uint8Array buffers
                               ▼
┌─────────────────────────────────────────────────────────────┐
│               Low-Level Engines & WebAssembly               │
│         pdf-lib  ·  pdfjs-dist  ·  qpdf-run (WASM)          │
└─────────────────────────────────────────────────────────────┘
```

### Core Invariants

1. **Zero Framework Coupling in Core (`src/core/`)**: No module under `src/core/` imports React, hooks, or DOM UI libraries. Core functions operate on standard binary primitives (`Uint8Array`, `ArrayBuffer`, `Blob`) and plain configuration objects.
2. **Deterministic & Testable**: Every core function is independently executable and verifiable under Node/Vitest without requiring a browser DOM.
3. **Structured Error Hierarchy**: All failures map to strongly-typed `PdfError` instances (`PdfValidationError`, `PdfPasswordError`, `PdfCorruptError`, `PdfWorkerError`) providing machine codes and localized human-readable messages.
4. **Explicit Resource & Memory Management**:
   - `pdfDoc.destroy()` lifecycles are explicitly executed in `finally` blocks to release worker memory allocations.
   - Canvas elements have dimensions reset to `0x0` after rasterization to free GPU memory.
   - Blob and Object URLs are tracked in an ephemeral registry (`object-url.ts` / `useObjectUrl.ts`) and automatically revoked on component unmount.
5. **Presentation Isolation**: UI components are strictly forbidden from directly importing low-level PDF libraries like `pdf-lib`. All operations must pass through custom hooks and shared utility functions (e.g., `readPdfPageCount`).

---

## Technology Stack

| Layer | Technologies |
|:---|:---|
| **Frontend Framework** | [React 19](https://react.dev/) with [TypeScript 5.7](https://www.typescriptlang.org/) |
| **Build & Bundler** | [Vite 6](https://vitejs.dev/) with Rollup chunk splitting |
| **Styling & Design System** | [Tailwind CSS v4](https://tailwindcss.com/) with custom `@theme` tokens & Google Sans Flex font |
| **Component Primitives** | [@base-ui/react](https://base-ui.com/) (accessible headless components) |
| **Icons** | [Lucide React](https://lucide.dev/) |
| **Routing** | [React Router v7](https://reactrouter.com/) with dynamic lazy-loading |
| **PDF Manipulation** | [pdf-lib](https://pdf-lib.js.org/) |
| **PDF Rendering & Parsing** | [pdfjs-dist](https://mozilla.github.io/pdf.js/) (pinned to exact version `5.4.530`) |
| **WebAssembly Decryption** | [qpdf-run](https://github.com/thewh1teagle/qpdf-run) (compiled QPDF WASM runner) |
| **PDF Encryption** | [@pdfsmaller/pdf-encrypt-lite](https://www.npmjs.com/package/@pdfsmaller/pdf-encrypt-lite) |
| **Archive Utilities** | [JSZip](https://stuk.github.io/jszip/) |
| **Testing Harness** | [Vitest 3](https://vitest.dev/) |

---

## Project Directory Structure

```
pdf.com.in/
├── public/                      # Static public assets
├── src/
│   ├── components/              # UI presentation layer
│   │   ├── common/              # Shared UI components (ToolCard, ThemeToggle, ErrorBoundary, etc.)
│   │   ├── layout/              # Header, Footer, and navigation layouts
│   │   └── tools/               # 17 presentation tool components (MergePdfTool, CompressTool, etc.)
│   ├── config/                  # Tool registry and route configurations
│   ├── core/                    # Pure TypeScript PDF operation modules (Zero React coupling)
│   │   ├── shared/              # Binary helpers, error classes, validation, and object-url registry
│   │   └── pdf/                 # 17 isolated tool implementations + unit test suites
│   │       ├── merge/
│   │       ├── split/
│   │       ├── compress/
│   │       ├── protect/
│   │       ├── unlock/
│   │       └── ...
│   ├── hooks/                   # Custom React hooks bridging Core <-> Presentation
│   │   └── pdf/                 # useMergePdfs, useCompressPdf, useSplitPdf, etc.
│   ├── pages/                   # Landing page (Home.tsx) and route views
│   ├── test-utils/              # In-memory synthetic PDF generator and regression suites
│   ├── types/                   # Shared TypeScript definitions
│   ├── App.tsx                  # Root application router with lazy chunk loading
│   ├── index.css                # Global design system tokens and Tailwind v4 setup
│   └── main.tsx                 # Application entry point
├── index.html                   # HTML template with Google Sans Flex & dark mode bootstrapper
├── package.json                 # Project dependencies and scripts
├── tsconfig.json                # TypeScript project configuration
└── vite.config.ts               # Vite configuration, Rollup manual chunking & Vitest setup
```

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (version `18.0.0` or higher recommended)
- [npm](https://www.npmjs.com/) (version `9.0.0` or higher)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/am-v/pdf.git
   cd pdf-com-in
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the local development server:**
   ```bash
   npm run dev
   ```
   Open your browser and navigate to `http://localhost:5173`.

---

## Scripts & Development

| Command | Action |
|:---|:---|
| `npm run dev` | Launch the Vite development server with Hot Module Replacement (HMR). |
| `npm run build` | Perform strict typechecking and build the production bundle into `dist/`. |
| `npm run preview` | Locally preview the built production bundle. |
| `npm run test` | Run all 150 automated unit and regression tests with Vitest. |
| `npm run test:watch` | Run tests in interactive watch mode for active development. |
| `npm run test:coverage` | Run the test suite and output test code coverage reports. |
| `npm run typecheck` | Run the TypeScript compiler (`tsc -b --noEmit`) to verify strict type safety. |

---

## Testing & Quality Assurance

The codebase employs an automated testing strategy with **150 passing tests** across 21 test suites:

- **Core Unit Tests (135 tests)**: Pure TypeScript unit tests covering each of the 17 PDF operations, verifying:
  - Happy-path transformations and byte validity.
  - Edge cases (0-byte buffers, non-PDF payloads, out-of-range pages).
  - Proper error rejection and typed error codes.
  - Immutability of input buffers.
- **Shared Utilities (15 tests)**: Tests for magic-byte validation (`%PDF-`), buffer converters, color geometry calculations, and `readPdfPageCount`.
- **Regression Tests**: Tests cover complex, multi-page PDF documents.
- **Synthetic Test Generation**: The test suite uses an in-memory PDF generator (`src/test-utils/pdf-generator.ts`) to programmatically produce valid test documents on the fly without checking in large binary fixtures.

Run the entire test suite:
```bash
npm run test
```

---

## Performance & Loading

The application uses dynamic `React.lazy()` imports and Rollup manual chunking to load tools and their required vendor libraries on demand.

---

## Privacy & Security Guarantee

1. **Zero Remote Data Transmission**: All file parsing, encryption, decryption, rendering, and modifications take place inside your browser's V8/JavaScript engine. No telemetry, analytics, or document content is ever transmitted to any remote server.
2. **Pinned Dependencies**: Critical PDF rendering libraries (such as `pdfjs-dist` pinned strictly to `"5.4.530"`) are locked against vulnerable version ranges to prevent prototype pollution or arbitrary script execution (GHSA-hq66-cqwq-w95j).
3. **No Local File Persistence**: Processed documents reside exclusively in ephemeral memory and are cleared when the browser tab is closed or when the operation is reset.

---

## License

This project is licensed under the **MIT License**. See the [LICENSE](./LICENSE) file for the full license text.
