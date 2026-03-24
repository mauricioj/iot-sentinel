'use client';

import { useState, useCallback } from 'react';

export function usePagination(initialPage = 1, initialLimit = 20) {
  const [page, setPage] = useState(initialPage);
  const [limit] = useState(initialLimit);
  const [total, setTotal] = useState(0);

  const pages = Math.ceil(total / limit);
  const hasNext = page < pages;
  const hasPrev = page > 1;

  const next = useCallback(() => { if (hasNext) setPage((p) => p + 1); }, [hasNext]);
  const prev = useCallback(() => { if (hasPrev) setPage((p) => p - 1); }, [hasPrev]);
  const reset = useCallback(() => setPage(1), []);

  return { page, limit, total, pages, hasNext, hasPrev, next, prev, reset, setTotal, setPage };
}
