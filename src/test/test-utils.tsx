import React, { PropsWithChildren } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { TooltipProvider } from '@/components/ui/tooltip';
import { HelmetProvider } from 'react-helmet-async';
import authReducer from '@/store/slices/authSlice';
import accountsReducer from '@/store/slices/accountsSlice';
import tradesReducer from '@/store/slices/tradesSlice';
import { api } from '@/store/api/baseApi';
import type { RootState } from '@/store/index';

// Build the root reducer matching the real store shape
const rootReducer = combineReducers({
  [api.reducerPath]: api.reducer,
  auth: authReducer,
  accounts: accountsReducer,
  trades: tradesReducer,
});

interface ExtendedRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  preloadedState?: Partial<RootState>;
  store?: ReturnType<typeof configureStore>;
  route?: string;
}

export function renderWithProviders(
  ui: React.ReactElement,
  {
    preloadedState = {},
    store = configureStore({
      reducer: rootReducer,
      preloadedState: preloadedState as any,
      middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
          serializableCheck: false,
        }).concat(api.middleware),
    }),
    route = '/',
    ...renderOptions
  }: ExtendedRenderOptions = {}
) {
  function Wrapper({ children }: PropsWithChildren) {
    return (
      <HelmetProvider>
        <Provider store={store}>
          <MemoryRouter initialEntries={[route]}>
            <TooltipProvider>
              {children}
            </TooltipProvider>
          </MemoryRouter>
        </Provider>
      </HelmetProvider>
    );
  }

  return {
    store,
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
  };
}

// Re-export everything from testing-library
export * from '@testing-library/react';
// Override the render export with our custom version
export { renderWithProviders as render };
