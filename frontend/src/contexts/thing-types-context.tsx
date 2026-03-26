'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { thingTypesService } from '@/services/thing-types.service';
import { ThingTypeItem } from '@/types';

interface ThingTypesContextType {
  thingTypes: ThingTypeItem[];
  loading: boolean;
  getBySlug: (slug: string) => ThingTypeItem | undefined;
  refresh: () => Promise<void>;
}

const ThingTypesContext = createContext<ThingTypesContextType | undefined>(undefined);

export function ThingTypesProvider({ children }: { children: ReactNode }) {
  const [thingTypes, setThingTypes] = useState<ThingTypeItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTypes = useCallback(async () => {
    try {
      const data = await thingTypesService.findAll();
      setThingTypes(data);
    } catch {
      // Not authenticated yet (login/setup pages) — silently ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTypes();
  }, [fetchTypes]);

  const getBySlug = useCallback(
    (slug: string) => thingTypes.find((t) => t.slug === slug),
    [thingTypes],
  );

  return (
    <ThingTypesContext.Provider value={{ thingTypes, loading, getBySlug, refresh: fetchTypes }}>
      {children}
    </ThingTypesContext.Provider>
  );
}

export function useThingTypes() {
  const context = useContext(ThingTypesContext);
  if (!context) throw new Error('useThingTypes must be used within ThingTypesProvider');
  return context;
}
