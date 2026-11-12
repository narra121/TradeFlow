import { createRoot } from "react-dom/client";
import "./index.css";
import { initErrorReporter } from './lib/errorReporter';
import { preloadRoute } from './content/preloadRoute';
import { entryFor } from './entry';

initErrorReporter();

const root = createRoot(document.getElementById("root")!);

// Load the opened page's chunk first so prerendered HTML is replaced without a spinner flash.
preloadRoute(window.location.pathname).then(async () => {
  if (entryFor(window.location.pathname, localStorage.getItem('idToken')) === 'public') {
    const { default: PublicApp } = await import('./PublicApp');
    root.render(<PublicApp />);
    return;
  }
  const [{ Provider }, { store }, { default: App }] = await Promise.all([import('react-redux'), import('./store'), import('./App.tsx')]);
  root.render(
    <Provider store={store}>
      <App />
    </Provider>
  );
});
