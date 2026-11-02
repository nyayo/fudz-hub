import { fireEvent, render, screen, cleanup } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { QueryError, QueryFreshness } from './QueryFeedback';
import { pageCount } from '@/lib/query-policy';
afterEach(cleanup);
it('offers recovery when a collection cannot load', () => {
  const retry = vi.fn();
  render(<QueryError title="Menu couldn’t be loaded" error={new Error('offline')} onRetry={retry} />);
  expect(screen.getByRole('alert')).toHaveTextContent('Menu couldn’t be loaded');
  fireEvent.click(screen.getByRole('button', {name: /try again/i}));
  expect(retry).toHaveBeenCalledOnce();
});
it('warns that retained data is stale and offers refresh', () => {
  const refresh = vi.fn();
  render(<QueryFreshness updatedAt={Date.now()} isFetching={false} isError onRefresh={refresh} />);
  expect(screen.getByText(/couldn.t refresh/i)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', {name: /refresh/i}));
  expect(refresh).toHaveBeenCalledOnce();
});
it('keeps pagination consistent with API pages, including a partial last page', () => {
  expect(pageCount(25)).toBe(2); expect(pageCount(20)).toBe(1); expect(pageCount(0)).toBe(1);
});
