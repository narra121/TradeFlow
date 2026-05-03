import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { HelmetProvider } from 'react-helmet-async';
import { TooltipProvider } from '@/components/ui/tooltip';
import authReducer from '@/store/slices/authSlice';
import accountsReducer from '@/store/slices/accountsSlice';
import tradesReducer from '@/store/slices/tradesSlice';
import { api } from '@/store/api/baseApi';
import { BlogArticlePage } from '../blog/BlogArticlePage';

function renderWithRoute(slug: string) {
  const store = configureStore({
    reducer: combineReducers({
      [api.reducerPath]: api.reducer,
      auth: authReducer,
      accounts: accountsReducer,
      trades: tradesReducer,
    }),
    middleware: (gDM) => gDM({ serializableCheck: false }).concat(api.middleware),
  });

  return render(
    <HelmetProvider>
      <Provider store={store}>
        <MemoryRouter initialEntries={[`/blog/${slug}`]}>
          <TooltipProvider>
            <Routes>
              <Route path="/blog/:slug" element={<BlogArticlePage />} />
              <Route path="/blog" element={<div>Blog Index</div>} />
            </Routes>
          </TooltipProvider>
        </MemoryRouter>
      </Provider>
    </HelmetProvider>
  );
}

describe('BlogArticlePage', () => {
  it('renders article title for a valid slug', async () => {
    renderWithRoute('how-to-keep-trading-journal');
    expect(await screen.findByText('How to Keep a Trading Journal: The Complete Guide')).toBeInTheDocument();
  });

  it('renders author box', async () => {
    renderWithRoute('how-to-keep-trading-journal');
    expect(await screen.findByText('TradeQut Team')).toBeInTheDocument();
  });

  it('renders tags', async () => {
    renderWithRoute('how-to-keep-trading-journal');
    expect(await screen.findByText('beginner')).toBeInTheDocument();
  });

  it('renders article description', async () => {
    renderWithRoute('how-to-keep-trading-journal');
    expect(
      await screen.findByText(/Learn why a trading journal is essential/)
    ).toBeInTheDocument();
  });

  it('redirects to /blog for unknown slug', () => {
    renderWithRoute('nonexistent-article');
    expect(screen.getByText('Blog Index')).toBeInTheDocument();
  });

  it('renders the footer with copyright', async () => {
    renderWithRoute('how-to-keep-trading-journal');
    const year = new Date().getFullYear();
    expect(await screen.findByText(new RegExp(`${year} TradeQut`))).toBeInTheDocument();
  });
});
