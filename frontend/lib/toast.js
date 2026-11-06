/**
 * Tiny global toast. Components call `toast('message')`; a single <ToastHost/>
 * mounted in _app.js renders them. Event-based so no context wiring is needed.
 */
export function toast(message, type) {
  if (typeof window === 'undefined' || !message) return;
  window.dispatchEvent(
    new CustomEvent('hf-toast', {
      detail: { message: String(message), type, id: Math.random().toString(36).slice(2) },
    })
  );
}
