import { useState, useCallback } from 'react';

export interface TradingRule {
  id: string;
  rule: string;
  completed: boolean;
}

const defaultRules: TradingRule[] = [
  { id: '1', rule: 'Never risk more than 1% per trade', completed: true },
  { id: '2', rule: 'Always set stop loss before entry', completed: true },
  { id: '3', rule: 'No trading during high-impact news', completed: false },
  { id: '4', rule: 'Wait for confirmation before entry', completed: true },
  { id: '5', rule: 'Review trades weekly', completed: false },
  { id: '6', rule: 'Stick to my trading plan', completed: true },
];

// Simple in-memory state (will be replaced with persistent storage later)
let globalRules = [...defaultRules];
let listeners: (() => void)[] = [];

const notifyListeners = () => {
  listeners.forEach(listener => listener());
};

export function useTradingRules() {
  const [rules, setRules] = useState<TradingRule[]>(globalRules);

  // Subscribe to global changes
  useState(() => {
    const listener = () => setRules([...globalRules]);
    listeners.push(listener);
    return () => {
      listeners = listeners.filter(l => l !== listener);
    };
  });

  const addRule = useCallback((ruleText: string) => {
    if (!ruleText.trim()) return;
    const newRule: TradingRule = {
      id: Date.now().toString(),
      rule: ruleText.trim(),
      completed: false,
    };
    globalRules = [...globalRules, newRule];
    setRules(globalRules);
    notifyListeners();
  }, []);

  const updateRule = useCallback((id: string, ruleText: string) => {
    if (!ruleText.trim()) return;
    globalRules = globalRules.map(r => 
      r.id === id ? { ...r, rule: ruleText.trim() } : r
    );
    setRules(globalRules);
    notifyListeners();
  }, []);

  const deleteRule = useCallback((id: string) => {
    globalRules = globalRules.filter(r => r.id !== id);
    setRules(globalRules);
    notifyListeners();
  }, []);

  const toggleRule = useCallback((id: string) => {
    globalRules = globalRules.map(r => 
      r.id === id ? { ...r, completed: !r.completed } : r
    );
    setRules(globalRules);
    notifyListeners();
  }, []);

  return {
    rules,
    addRule,
    updateRule,
    deleteRule,
    toggleRule,
  };
}
