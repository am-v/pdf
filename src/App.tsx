import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Header } from './components/layout/Header';
import { Footer } from './components/layout/Footer';
import { Home } from './pages/Home';
import { ToolPlaceholder } from './pages/ToolPlaceholder';
import { RouteLoadingFallback } from './components/common/RouteLoadingFallback';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { ScrollToTop } from './components/common/ScrollToTop';

// Dynamic lazy imports for all 17 PDF tools — zero initial overhead on landing page
const MergePdfTool = lazy(() =>
  import('./components/tools/MergePdfTool').then((m) => ({ default: m.MergePdfTool }))
);
const SplitPdfTool = lazy(() =>
  import('./components/tools/SplitPdfTool').then((m) => ({ default: m.SplitPdfTool }))
);
const RotatePdfTool = lazy(() =>
  import('./components/tools/RotatePdfTool').then((m) => ({ default: m.RotatePdfTool }))
);
const RearrangePdfTool = lazy(() =>
  import('./components/tools/RearrangePdfTool').then((m) => ({ default: m.RearrangePdfTool }))
);
const PageNumberTool = lazy(() =>
  import('./components/tools/PageNumberTool').then((m) => ({ default: m.PageNumberTool }))
);
const WatermarkTool = lazy(() =>
  import('./components/tools/WatermarkTool').then((m) => ({ default: m.WatermarkTool }))
);
const SignatureTool = lazy(() =>
  import('./components/tools/SignatureTool').then((m) => ({ default: m.SignatureTool }))
);
const ProtectTool = lazy(() =>
  import('./components/tools/ProtectTool').then((m) => ({ default: m.ProtectTool }))
);
const UnlockTool = lazy(() =>
  import('./components/tools/UnlockTool').then((m) => ({ default: m.UnlockTool }))
);
const MetadataTool = lazy(() =>
  import('./components/tools/MetadataTool').then((m) => ({ default: m.MetadataTool }))
);
const ImageToPdfTool = lazy(() =>
  import('./components/tools/ImageToPdfTool').then((m) => ({ default: m.ImageToPdfTool }))
);
const PdfToTextTool = lazy(() =>
  import('./components/tools/PdfToTextTool').then((m) => ({ default: m.PdfToTextTool }))
);
const PdfToImageTool = lazy(() =>
  import('./components/tools/PdfToImageTool').then((m) => ({ default: m.PdfToImageTool }))
);
const ExtractImagesTool = lazy(() =>
  import('./components/tools/ExtractImagesTool').then((m) => ({ default: m.ExtractImagesTool }))
);
const CompressTool = lazy(() =>
  import('./components/tools/CompressTool').then((m) => ({ default: m.CompressTool }))
);
const GrayscaleTool = lazy(() =>
  import('./components/tools/GrayscaleTool').then((m) => ({ default: m.GrayscaleTool }))
);
const RepairTool = lazy(() =>
  import('./components/tools/RepairTool').then((m) => ({ default: m.RepairTool }))
);


export function App() {

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 transition-colors">
      <ScrollToTop />
      <Header />
      <main className="flex-1">
        <ErrorBoundary>
          <Suspense fallback={<RouteLoadingFallback />}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/merge" element={<MergePdfTool />} />
              <Route path="/split" element={<SplitPdfTool />} />
              <Route path="/rotate-pdf" element={<RotatePdfTool />} />
              <Route path="/rearrange-pdf" element={<RearrangePdfTool />} />
              <Route path="/page-numbers" element={<PageNumberTool />} />
              <Route path="/watermark" element={<WatermarkTool />} />
              <Route path="/signature" element={<SignatureTool />} />
              <Route path="/sign-pdf" element={<SignatureTool />} />
              <Route path="/protect" element={<ProtectTool />} />
              <Route path="/unlock" element={<UnlockTool />} />
              <Route path="/metadata" element={<MetadataTool />} />
              <Route path="/image-to-pdf" element={<ImageToPdfTool />} />
              <Route path="/pdf-to-text" element={<PdfToTextTool />} />
              <Route path="/pdf-to-image" element={<PdfToImageTool />} />
              <Route path="/extract-images" element={<ExtractImagesTool />} />
              <Route path="/compress" element={<CompressTool />} />
              <Route path="/grayscale" element={<GrayscaleTool />} />
              <Route path="/repair" element={<RepairTool />} />
              <Route path="/:toolId" element={<ToolPlaceholder />} />
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </main>
      <Footer />
    </div>
  );
}

export default App;
