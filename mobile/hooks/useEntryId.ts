import { useEffect, useState, useCallback } from 'react';
import * as SecureStore from 'expo-secure-store';

const KEY = 'fpl_entry_id';

export function useEntryId() {
  const [entryId, setEntryIdState] = useState<string | null>(null);
  const [loading, setLoading]      = useState(true);

  useEffect(() => {
    SecureStore.getItemAsync(KEY).then(v => {
      setEntryIdState(v);
      setLoading(false);
    });
  }, []);

  const saveEntryId = useCallback(async (id: string) => {
    await SecureStore.setItemAsync(KEY, id);
    setEntryIdState(id);
  }, []);

  const clearEntryId = useCallback(async () => {
    await SecureStore.deleteItemAsync(KEY);
    setEntryIdState(null);
  }, []);

  return { entryId, loading, saveEntryId, clearEntryId };
}
