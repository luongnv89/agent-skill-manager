import { useCallback, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Header from "./components/Header.jsx";
import Footer from "./components/Footer.jsx";
import BundleBuilderDialog from "./components/BundleBuilderDialog.jsx";
import CatalogPage from "./pages/CatalogPage.jsx";
import BundlesPage from "./pages/BundlesPage.jsx";
import DocsPage from "./pages/DocsPage.jsx";
import ChangelogPage from "./pages/ChangelogPage.jsx";
import { CatalogProvider } from "./hooks/useCatalog.jsx";
import { BundleCartProvider } from "./hooks/useBundleCart.jsx";

/**
 * Root application shell.
 *
 * HashRouter is used because the site deploys to a subpath (`/asm/` on
 * GitHub Pages) and the legacy UI already used hash navigation — switching
 * to HashRouter preserves external deep links and avoids the need for
 * server-side rewrites.
 *
 * Routing (#228): `/` and `/skills/:id` both render `CatalogPage` —
 * the catalog is always a two-pane layout, and the `:id` in the URL
 * simply selects which skill shows in the detail pane. Same pattern
 * for `/bundles` and `/bundles/:name`.
 *
 * Bundle builder (#238): dialog state lives at the app shell so the
 * header cart button (any route) can open it. The `BundleCartProvider`
 * wraps everything so skill-level cart state is shared across pages.
 */
export default function App() {
  const [bundleBuilderOpen, setBundleBuilderOpen] = useState(false);
  // Stable references so the dialog's mount effect (which listens on
  // `onClose` in its dep array) doesn't re-fire on every App render and
  // yank focus away from the form the user is typing into.
  const openBuilder = useCallback(() => setBundleBuilderOpen(true), []);
  const closeBuilder = useCallback(() => setBundleBuilderOpen(false), []);
  return (
    <CatalogProvider>
      <BundleCartProvider>
        <div className="min-h-screen flex flex-col bg-[var(--bg)] text-[var(--fg)]">
          <Header onOpenBundleBuilder={openBuilder} />
          <main className="flex-1 w-full max-w-[1280px] mx-auto px-4 sm:px-6 py-6">
            <Routes>
              <Route path="/" element={<CatalogPage />} />
              <Route path="/skills/:id" element={<CatalogPage />} />
              <Route path="/bundles" element={<BundlesPage />} />
              <Route path="/bundles/:name" element={<BundlesPage />} />
              <Route path="/docs" element={<DocsPage />} />
              <Route path="/changelog" element={<ChangelogPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
          <Footer />
          <BundleBuilderDialog
            open={bundleBuilderOpen}
            onClose={closeBuilder}
          />
        </div>
      </BundleCartProvider>
    </CatalogProvider>
  );
}
