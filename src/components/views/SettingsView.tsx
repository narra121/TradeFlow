import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import {
  Shield,
  ListChecks,
  RotateCcw,
  Loader2,
  Target,
  Download,
  Upload,
  Trash2
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { RefreshButton } from '@/components/ui/refresh-button';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAppSelector } from '@/store/hooks';
import { useGetProfileQuery, useUpdateProfileMutation, useUpdatePreferencesMutation, useUpdateNotificationsMutation } from '@/store/api';
import { SettingsSectionSkeleton } from '@/components/ui/loading-skeleton';
import { DropdownOptionsManager } from '@/components/settings/DropdownOptionsManager';
import { useSavedOptions } from '@/hooks/useSavedOptions';

export function SettingsView() {
  const { data: profile, isLoading, isFetching, refetch } = useGetProfileQuery();
  const [updateProfile] = useUpdateProfileMutation();
  const [updatePreferences] = useUpdatePreferencesMutation();
  const [updateNotifications] = useUpdateNotificationsMutation();
  
  // Saved options hook for managing dropdown options
  const {
    options,
    isLoading: tradeOptionsLoading,
    isUpdating: tradeOptionsUpdating,
    addStrategy,
    removeStrategy,
    addNewsEvent,
    removeNewsEvent,
    addSession,
    removeSession,
    addMarketCondition,
    removeMarketCondition,
    addMistake,
    removeMistake,
    resetToDefaults,
  } = useSavedOptions();

  const [pendingTradeOption, setPendingTradeOption] = useState<
    | {
        category: 'strategies' | 'newsEvents' | 'sessions' | 'marketConditions' | 'mistakes';
        action: 'add' | 'remove';
        value: string;
      }
    | null
  >(null);
  
  const [notifications, setNotifications] = useState(profile?.preferences?.notifications?.tradeReminders ?? true);
  const [darkMode, setDarkMode] = useState(profile?.preferences?.darkMode ?? true);
  const [currency, setCurrency] = useState(profile?.preferences?.currency || 'USD');
  const [carryForwardGoalsRules, setCarryForwardGoalsRules] = useState(profile?.preferences?.carryForwardGoalsRules ?? true);
  const [displayName, setDisplayName] = useState(profile?.name || '');
  const [email, setEmail] = useState(profile?.email || '');
  
  useEffect(() => {
    if (profile) {
      setDisplayName(profile.name || '');
      setEmail(profile.email || '');
      setDarkMode(profile.preferences?.darkMode ?? true);
      setCurrency(profile.preferences?.currency || 'USD');
      setCarryForwardGoalsRules(profile.preferences?.carryForwardGoalsRules ?? true);
      setNotifications(profile.preferences?.notifications?.tradeReminders ?? true);
    }
  }, [profile]);

  useEffect(() => {
    if (pendingTradeOption && !tradeOptionsUpdating) {
      setPendingTradeOption(null);
    }
  }, [pendingTradeOption, tradeOptionsUpdating]);

  const wrapAdd = (
    category: 'strategies' | 'newsEvents' | 'sessions' | 'marketConditions' | 'mistakes',
    fn: (value: string) => void
  ) => {
    return (value: string) => {
      setPendingTradeOption({ category, action: 'add', value });
      try { fn(value); } catch { setPendingTradeOption(null); }
    };
  };

  const wrapRemove = (
    category: 'strategies' | 'newsEvents' | 'sessions' | 'marketConditions' | 'mistakes',
    fn: (value: string) => void
  ) => {
    return (value: string) => {
      setPendingTradeOption({ category, action: 'remove', value });
      try { fn(value); } catch { setPendingTradeOption(null); }
    };
  };

  const addStrategyWithLoading = wrapAdd('strategies', addStrategy);
  const removeStrategyWithLoading = wrapRemove('strategies', removeStrategy);
  const addNewsEventWithLoading = wrapAdd('newsEvents', addNewsEvent);
  const removeNewsEventWithLoading = wrapRemove('newsEvents', removeNewsEvent);
  const addSessionWithLoading = wrapAdd('sessions', addSession);
  const removeSessionWithLoading = wrapRemove('sessions', removeSession);
  const addMarketConditionWithLoading = wrapAdd('marketConditions', addMarketCondition);
  const removeMarketConditionWithLoading = wrapRemove('marketConditions', removeMarketCondition);
  const addMistakeWithLoading = wrapAdd('mistakes', addMistake);
  const removeMistakeWithLoading = wrapRemove('mistakes', removeMistake);
  
  const handleUpdateProfile = async () => {
    await updateProfile({ name: displayName, email }).unwrap();
  };
  
  const handleDarkModeChange = async (checked: boolean) => {
    setDarkMode(checked);
    await updatePreferences({ darkMode: checked, currency: currency as 'USD' | 'EUR' | 'GBP', timezone: 'UTC' }).unwrap();
  };
  
  const handleCurrencyChange = async (value: string) => {
    setCurrency(value);
    await updatePreferences({ darkMode, currency: value as 'USD' | 'EUR' | 'GBP', timezone: 'UTC' }).unwrap();
  };
  
  const handleCarryForwardChange = async (checked: boolean) => {
    setCarryForwardGoalsRules(checked);
    await updatePreferences({ carryForwardGoalsRules: checked }).unwrap();
  };

  const handleNotificationsChange = async (checked: boolean) => {
    setNotifications(checked);
    await updateNotifications({ tradeReminders: checked, weeklyReport: true, goalAlerts: true }).unwrap();
  };

  if (isLoading && !profile) {
    return (
      <div className="space-y-6 max-w-3xl mx-auto">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Settings</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Configure trade options, preferences, and display settings.
            <Link to="/app/profile" className="text-primary hover:underline ml-1">
              Looking for account settings?
            </Link>
          </p>
        </div>
        <SettingsSectionSkeleton />
        <SettingsSectionSkeleton />
        <SettingsSectionSkeleton />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Settings</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Configure trade options, preferences, and display settings.
            <Link to="/app/profile" className="text-primary hover:underline ml-1">
              Looking for account settings?
            </Link>
          </p>
        </div>
        <RefreshButton onRefresh={refetch} isFetching={isFetching} />
      </div>

      {/* Trade Options Section */}
      <div className="glass-card p-4 sm:p-6 animate-fade-in stagger-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <ListChecks className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-semibold text-foreground">Trade Options</h2>
                {tradeOptionsLoading && (
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                )}
              </div>
              <p className="text-sm text-muted-foreground">Manage dropdown options for trade forms</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={resetToDefaults}
            className="gap-1.5"
            disabled={tradeOptionsLoading}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset All
          </Button>
        </div>

        <div className="space-y-6">
          <DropdownOptionsManager
            title="Setups / Strategies"
            description="Trading setups and strategies for your trades"
            options={options.strategies}
            onAdd={addStrategyWithLoading}
            onRemove={removeStrategyWithLoading}
            placeholder="Add new setup..."
            isLoading={tradeOptionsLoading}
            pendingAction={pendingTradeOption?.category === 'strategies' ? pendingTradeOption.action : undefined}
            pendingValue={pendingTradeOption?.category === 'strategies' ? pendingTradeOption.value : undefined}
          />

          <div className="border-t border-border pt-6">
            <DropdownOptionsManager
              title="News Events"
              description="Economic events and news that affect your trades"
              options={options.newsEvents}
              onAdd={addNewsEventWithLoading}
              onRemove={removeNewsEventWithLoading}
              placeholder="Add new event..."
              isLoading={tradeOptionsLoading}
              pendingAction={pendingTradeOption?.category === 'newsEvents' ? pendingTradeOption.action : undefined}
              pendingValue={pendingTradeOption?.category === 'newsEvents' ? pendingTradeOption.value : undefined}
            />
          </div>

          <div className="border-t border-border pt-6">
            <DropdownOptionsManager
              title="Trading Sessions"
              description="Market sessions for your trades"
              options={options.sessions}
              onAdd={addSessionWithLoading}
              onRemove={removeSessionWithLoading}
              placeholder="Add new session..."
              isLoading={tradeOptionsLoading}
              pendingAction={pendingTradeOption?.category === 'sessions' ? pendingTradeOption.action : undefined}
              pendingValue={pendingTradeOption?.category === 'sessions' ? pendingTradeOption.value : undefined}
            />
          </div>

          <div className="border-t border-border pt-6">
            <DropdownOptionsManager
              title="Market Conditions"
              description="Market conditions when you take trades"
              options={options.marketConditions}
              onAdd={addMarketConditionWithLoading}
              onRemove={removeMarketConditionWithLoading}
              placeholder="Add new condition..."
              isLoading={tradeOptionsLoading}
              pendingAction={pendingTradeOption?.category === 'marketConditions' ? pendingTradeOption.action : undefined}
              pendingValue={pendingTradeOption?.category === 'marketConditions' ? pendingTradeOption.value : undefined}
            />
          </div>

          <div className="border-t border-border pt-6">
            <DropdownOptionsManager
              title="Common Mistakes"
              description="Trading mistakes to track and avoid"
              options={options.mistakes}
              onAdd={addMistakeWithLoading}
              onRemove={removeMistakeWithLoading}
              placeholder="Add new mistake..."
              isLoading={tradeOptionsLoading}
              pendingAction={pendingTradeOption?.category === 'mistakes' ? pendingTradeOption.action : undefined}
              pendingValue={pendingTradeOption?.category === 'mistakes' ? pendingTradeOption.value : undefined}
            />
          </div>
        </div>
      </div>

      {/* Goals & Rules Section */}
      <div className="glass-card p-4 sm:p-6 animate-fade-in stagger-3">
        <div className="flex items-center gap-3 mb-4 sm:mb-6">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Target className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-semibold text-foreground">Goals & Rules</h2>
            <p className="text-sm text-muted-foreground">Configure how goals and rules behave across periods</p>
          </div>
        </div>

        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <Label htmlFor="carry-forward-toggle" className="text-sm font-medium text-foreground">
              Carry forward goals & rules
            </Label>
            <p className="text-sm text-muted-foreground mt-0.5">
              When enabled, your customized goals and rules continue into new periods. When disabled, each new week/month starts with defaults.
            </p>
          </div>
          <Switch
            id="carry-forward-toggle"
            checked={carryForwardGoalsRules}
            onCheckedChange={handleCarryForwardChange}
          />
        </div>
      </div>

      <div className="glass-card p-4 sm:p-6 animate-fade-in stagger-3">
        <div className="flex items-center gap-3 mb-4 sm:mb-6">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-secondary flex items-center justify-center shrink-0">
            <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-foreground" />
          </div>
          <h2 className="text-base sm:text-lg font-semibold text-foreground">Data Management</h2>
        </div>

        <ul className="text-sm text-muted-foreground space-y-3">
          <li className="flex items-center gap-2.5">
            <Download className="w-4 h-4 text-muted-foreground/70 shrink-0" />
            Export trades as CSV / Excel
          </li>
          <li className="flex items-center gap-2.5">
            <Upload className="w-4 h-4 text-muted-foreground/70 shrink-0" />
            Backup & restore data
          </li>
          <li className="flex items-center gap-2.5">
            <Trash2 className="w-4 h-4 text-muted-foreground/70 shrink-0" />
            Bulk data management
          </li>
        </ul>
        <p className="text-xs text-muted-foreground/60 mt-3">These features are planned for a future update.</p>
      </div>
    </div>
  );
}
