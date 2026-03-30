import { useState, useEffect, useCallback } from 'react';

export interface UseAsyncState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
}

/**
 * Hook for handling async data fetching
 */
export function useAsync<T>(
  asyncFunction: () => Promise<T>,
  immediate = true,
  dependencies: any[] = []
) {
  const [state, setState] = useState<UseAsyncState<T>>({
    data: null,
    loading: immediate,
    error: null,
  });

  const execute = useCallback(async () => {
    setState({ data: null, loading: true, error: null });
    try {
      const response = await asyncFunction();
      setState({ data: response, loading: false, error: null });
    } catch (error) {
      setState({
        data: null,
        loading: false,
        error: error instanceof Error ? error : new Error(String(error)),
      });
    }
  }, [...dependencies]);

  useEffect(() => {
    if (immediate) {
      execute();
    }
  }, [execute, immediate]);

  return { ...state, execute };
}

/**
 * Hook for API calls with error handling
 */
export function useApiCall<T>(
  apiFunction: () => Promise<T>,
  dependencies: any[] = []
) {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const call = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await apiFunction();
      setData(result);
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, dependencies);

  return { data, isLoading, error, call };
}

/**
 * Hook for handling form submissions
 */
export function useFormSubmit<T>(
  onSubmit: (data: any) => Promise<T>,
  onSuccess?: (data: T) => void,
  onError?: (error: Error) => void
) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const submit = useCallback(
    async (formData: any) => {
      setIsSubmitting(true);
      setError(null);
      try {
        const result = await onSubmit(formData);
        onSuccess?.(result);
        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        onError?.(error);
        throw error;
      } finally {
        setIsSubmitting(false);
      }
    },
    [onSubmit, onSuccess, onError]
  );

  return { submit, isSubmitting, error };
}

/**
 * Hook for debounced values
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Hook for paginated API calls
 */
export interface PaginationState {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export function usePagination<T>(
  fetchPage: (page: number, limit: number) => Promise<{ items: T[]; total: number }>,
  initialLimit = 10
) {
  const [items, setItems] = useState<T[]>([]);
  const [pagination, setPagination] = useState<PaginationState>({
    page: 1,
    limit: initialLimit,
    total: 0,
    totalPages: 0,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const loadPage = useCallback(
    async (pageNum: number) => {
      setIsLoading(true);
      setError(null);
      try {
        const { items: pageItems, total } = await fetchPage(pageNum, pagination.limit);
        setItems(pageItems);
        setPagination(prev => ({
          ...prev,
          page: pageNum,
          total,
          totalPages: Math.ceil(total / prev.limit),
        }));
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        setIsLoading(false);
      }
    },
    [fetchPage, pagination.limit]
  );

  useEffect(() => {
    loadPage(1);
  }, []);

  return {
    items,
    pagination,
    isLoading,
    error,
    goToPage: loadPage,
    goToNextPage: () => loadPage(pagination.page + 1),
    goToPreviousPage: () => loadPage(Math.max(1, pagination.page - 1)),
  };
}

/**
 * Hook for local storage with persistence
 */
export function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(error);
      return initialValue;
    }
  });

  const setValue = useCallback(
    (value: T | ((val: T) => T)) => {
      try {
        const valueToStore = value instanceof Function ? value(storedValue) : value;
        setStoredValue(valueToStore);
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      } catch (error) {
        console.error(error);
      }
    },
    [key, storedValue]
  );

  return [storedValue, setValue] as const;
}
