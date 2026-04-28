import React from 'react';
import type { SupportListItem, SupportListItemType } from '../types';

const SUPPORT_LIST_STORAGE_KEY = 'recoveryhub_support_list_v1';

interface SupportListContextValue {
  items: SupportListItem[];
  addItem: (item: SupportListItem) => void;
  removeItem: (sourceId: string, type: SupportListItemType) => void;
  updateItemNotes: (sourceId: string, type: SupportListItemType, notes: string) => void;
  clearList: () => void;
  isAdded: (sourceId: string, type: SupportListItemType) => boolean;
  getCount: () => number;
  getItemsByType: (type: SupportListItemType) => SupportListItem[];
}

const SupportListContext = React.createContext<SupportListContextValue | undefined>(undefined);

function parseStoredItems(value: string | null): SupportListItem[] {
  if (!value) return [];

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function SupportListProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = React.useState<SupportListItem[]>(() => {
    if (typeof window === 'undefined') return [];
    return parseStoredItems(window.localStorage.getItem(SUPPORT_LIST_STORAGE_KEY));
  });

  React.useEffect(() => {
    window.localStorage.setItem(SUPPORT_LIST_STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const addItem = React.useCallback((item: SupportListItem) => {
    setItems((current) => {
      const duplicate = current.some(
        (existing) => existing.sourceId === item.sourceId && existing.type === item.type
      );

      if (duplicate) return current;

      return [...current, item];
    });
  }, []);

  const removeItem = React.useCallback((sourceId: string, type: SupportListItemType) => {
    setItems((current) =>
      current.filter((item) => !(item.sourceId === sourceId && item.type === type))
    );
  }, []);

  const updateItemNotes = React.useCallback((sourceId: string, type: SupportListItemType, notes: string) => {
    setItems((current) =>
      current.map((item) =>
        item.sourceId === sourceId && item.type === type
          ? { ...item, notes }
          : item
      )
    );
  }, []);

  const clearList = React.useCallback(() => {
    setItems([]);
  }, []);

  const isAdded = React.useCallback(
    (sourceId: string, type: SupportListItemType) =>
      items.some((item) => item.sourceId === sourceId && item.type === type),
    [items]
  );

  const getCount = React.useCallback(() => items.length, [items]);

  const getItemsByType = React.useCallback(
    (type: SupportListItemType) =>
      items
        .filter((item) => item.type === type)
        .sort((a, b) => a.title.localeCompare(b.title)),
    [items]
  );

  const value = React.useMemo<SupportListContextValue>(
    () => ({
      items,
      addItem,
      removeItem,
      updateItemNotes,
      clearList,
      isAdded,
      getCount,
      getItemsByType,
    }),
    [addItem, clearList, getCount, getItemsByType, isAdded, items, removeItem, updateItemNotes]
  );

  return (
    <SupportListContext.Provider value={value}>
      {children}
    </SupportListContext.Provider>
  );
}

export function useSupportList() {
  const context = React.useContext(SupportListContext);

  if (!context) {
    throw new Error('useSupportList must be used within a SupportListProvider');
  }

  return context;
}

