import { useState, useEffect } from 'react';
import * as templatesApi from '../lib/api/templates';

export function useTemplateVariables() {
  const [variables, setVariables] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadVariables = async () => {
      try {
        setLoading(true);
        const vars = await templatesApi.getAvailableVariables();
        setVariables(vars);
      } catch (err) {
        console.error('Failed to load variables:', err);
      } finally {
        setLoading(false);
      }
    };
    loadVariables();
  }, []);

  return { variables, loading };
}