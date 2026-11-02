/**
 * Prints a single element in an isolated hidden iframe so dialogs, page
 * layout and overflow never clip the printed sheet. The page size matches
 * the thermal format (e.g. "54mm 25mm" or "80mm auto").
 */
export function printSheet(el: HTMLElement | null, pageSize: string) {
  if (!el || typeof document === "undefined") return;
  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;";
  document.body.appendChild(iframe);
  const doc = iframe.contentDocument;
  const win = iframe.contentWindow;
  if (!doc || !win) {
    iframe.remove();
    return;
  }
  const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
    .map((node) => node.outerHTML)
    .join("");
  doc.open();
  doc.write(
    `<!doctype html><html><head><meta charset="utf-8">${styles}<style>
      @page { size: ${pageSize}; margin: 0; }
      html, body { margin: 0; padding: 0; background: #fff; }
      .print-sheet { position: static !important; visibility: visible !important; margin: 0 !important; box-shadow: none !important; }
    </style></head><body>${el.outerHTML}</body></html>`,
  );
  doc.close();
  const cleanup = () => setTimeout(() => iframe.remove(), 500);
  win.addEventListener("afterprint", cleanup);
  // Let stylesheets load before opening the print preview.
  setTimeout(() => {
    try {
      win.focus();
      win.print();
    } catch {
      window.print();
    }
    setTimeout(() => iframe.remove(), 60_000);
  }, 400);
}
