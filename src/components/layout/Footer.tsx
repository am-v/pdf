import { Shield, Cpu, Lock } from 'lucide-react';

const currentYear = new Date().getFullYear();

export function Footer() {
  return (
    <footer className="w-full border-t border-gray-200/80 bg-white dark:border-gray-800/80 dark:bg-gray-950 transition-colors py-12 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-accent text-accent-foreground flex items-center justify-center shrink-0">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-1">100% Privacy Guarantee</h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                All document processing executes directly in your browser memory. Your confidential files are never uploaded to any remote server.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-accent text-accent-foreground flex items-center justify-center shrink-0">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-1">WebAssembly Performance</h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                Engineered with high-speed WebAssembly engines (QPDF, PDF-Lib) for lightning-fast file manipulation even on large multi-page documents.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-accent text-accent-foreground flex items-center justify-center shrink-0">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-1">Open & Auditable</h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                Released under the MIT License. Zero trackers, zero advertisements, zero data harvesting.{' '}
                <br />
                <a
                  href="https://github.com/am-v/pdf"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-2 hover:text-gray-900 dark:hover:text-gray-100"
                >
                  Source code
                </a>
              </p>
            </div>
          </div>
        </div>

        <div className="pt-8 border-t border-gray-200/60 dark:border-gray-800/60 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-400 dark:text-gray-500">
          <p>© {currentYear} pdf.com.in — Open Source Privacy-First PDF Toolkit.</p>
          <p className="inline-flex items-center gap-2">
            <svg width="22" height="23" viewBox="0 0 22 23" fill="none" xmlns="http://www.w3.org/2000/svg">
              <g clip-path="url(#clip0_0_2896)">
                <path d="M0 17.0846C0 17.7329 0.257539 18.3546 0.715961 18.8131C1.17438 19.2715 1.79614 19.529 2.44444 19.529H19.5556C20.2039 19.529 20.8256 19.2715 21.284 18.8131C21.7425 18.3546 22 17.7329 22 17.0846V14.6401H0V17.0846Z" fill="#138808" />
                <path d="M0 8.52881H22V14.6399H0V8.52881Z" fill="#EEEEEE" />
                <path d="M22 8.52903V6.08458C22 5.43627 21.7425 4.81452 21.284 4.3561C20.8256 3.89768 20.2039 3.64014 19.5556 3.64014H2.44444C1.79614 3.64014 1.17438 3.89768 0.715961 4.3561C0.257539 4.81452 0 5.43627 0 6.08458L0 8.52903H22Z" fill="#FF9933" />
                <path d="M10.9991 14.029C12.3492 14.029 13.4436 12.9346 13.4436 11.5846C13.4436 10.2346 12.3492 9.14014 10.9991 9.14014C9.6491 9.14014 8.55469 10.2346 8.55469 11.5846C8.55469 12.9346 9.6491 14.029 10.9991 14.029Z" fill="#000080" />
                <path d="M11.0013 13.4176C12.0138 13.4176 12.8346 12.5968 12.8346 11.5843C12.8346 10.5718 12.0138 9.75098 11.0013 9.75098C9.98878 9.75098 9.16797 10.5718 9.16797 11.5843C9.16797 12.5968 9.98878 13.4176 11.0013 13.4176Z" fill="#EEEEEE" />
                <path d="M11.0013 9.75098L11.0905 11.1345L11.7022 9.89092L11.2561 11.203L12.2975 10.2875L11.3826 11.3295L12.6947 10.8828L11.4511 11.4951L12.8346 11.5843L11.4511 11.6735L12.6947 12.2853L11.3826 11.8391L12.2975 12.8805L11.2561 11.9656L11.7022 13.2777L11.0905 12.0341L11.0013 13.4176L10.9121 12.0341L10.2997 13.2777L10.7465 11.9656L9.70452 12.8805L10.62 11.8391L9.30791 12.2853L10.5515 11.6735L9.16797 11.5843L10.5515 11.4951L9.30791 10.8828L10.62 11.3295L9.70452 10.2875L10.7465 11.203L10.2997 9.89092L10.9121 11.1345L11.0013 9.75098Z" fill="#6666B3" />
                <path d="M11.0017 12.1956C11.3392 12.1956 11.6128 11.922 11.6128 11.5845C11.6128 11.247 11.3392 10.9734 11.0017 10.9734C10.6642 10.9734 10.3906 11.247 10.3906 11.5845C10.3906 11.922 10.6642 12.1956 11.0017 12.1956Z" fill="#000080" />
              </g>
              <defs>
                <clipPath id="clip0_0_2896">
                  <rect width="22" height="21.8382" fill="white" transform="trangray(0 0.584473)" />
                </clipPath>
              </defs>
            </svg>
            Made with love in Visakhapatnam.
          </p>
        </div>
      </div>
    </footer>
  );
}
