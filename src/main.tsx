import { createRoot } from "react-dom/client";
import "./index.css";
import { initErrorReporter } from './lib/errorReporter';
import { preloadRoute } from './content/preloadRoute';
import { entryFor } from './entry';
import { hasStoredSession } from './lib/auth/storedSession';
import { retireLegacySession } from './lib/auth/legacySession';
import { capturePrerenderedInput } from './components/auth/prerenderedInput';

initErrorReporter();
retireLegacySession();

const rootElement = document.getElementById("root")!;
const root = createRoot(rootElement);

// index.html hid the prerendered page ("/", "/login", "/signup") because a stored session goes straight to the app.
if (document.documentElement.classList.contains('tq-app-boot')) {
  rootElement.replaceChildren();
  document.documentElement.classList.remove('tq-app-boot');
}

// Load the opened page's chunk first so prerendered HTML is replaced without a spinner flash.
preloadRoute(window.location.pathname).then(async () => {
  if (entryFor(window.location.pathname, hasStoredSession()) === 'public') {
    const { default: PublicApp } = await import('./PublicApp');
    root.render(<PublicApp />);
    return;
  }
  const [{ Provider }, { store }, { default: App }] = await Promise.all([import('react-redux'), import('./store'), import('./App.tsx')]);
  // Log in and log out happen without a reload; the signed-in / signed-out CSS in index.html follows the store.
  let signedIn: boolean | undefined;
  const syncSignedIn = () => {
    const next = store.getState().auth.isAuthenticated;
    if (next !== signedIn) document.documentElement.classList.toggle('tq-signed-in', (signedIn = next));
  };
  syncSignedIn();
  store.subscribe(syncSignedIn);
  // The render below replaces the prerendered /login or /signup form: hand what was typed into it to AuthPage.
  capturePrerenderedInput(rootElement, window.location.pathname);
  root.render(
    <Provider store={store}>
      <App />
    </Provider>
  );
});
