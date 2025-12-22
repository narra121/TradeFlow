import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { 
  User, 
  Palette, 
  Bell, 
  Shield, 
  Download, 
  Trash2,
  ChevronRight,
  Moon,
  Sun,
  DollarSign,
  Globe,
  ListChecks,
  RotateCcw,
  Loader2
} from 'lucide-react';
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
  const { data: profile, isLoading, isFetching } = useGetProfileQuery();
  const loading = isLoading || isFetching;
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
  const [displayName, setDisplayName] = useState(profile?.name || '');
  const [email, setEmail] = useState(profile?.email || '');
  
  useEffect(() => {
    if (profile) {
      setDisplayName(profile.name || '');
      setEmail(profile.email || '');
      setDarkMode(profile.preferences?.darkMode ?? true);
      setCurrency(profile.preferences?.currency || 'USD');
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
      fn(value);
    };
  };

  const wrapRemove = (
    category: 'strategies' | 'newsEvents' | 'sessions' | 'marketConditions' | 'mistakes',
    fn: (value: string) => void
  ) => {
    return (value: string) => {
      setPendingTradeOption({ category, action: 'remove', value });
      fn(value);
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
  
  const handleNotificationsChange = async (checked: boolean) => {
    setNotifications(checked);
    await updateNotifications({ tradeReminders: checked, weeklyReport: true, goalAlerts: true }).unwrap();
  };

  const settingSections = [
    {
      title: 'Profile',
      icon: User,
      items: [
        { label: 'Display Name', type: 'input', value: 'Trader Pro' },
        { label: 'Email', type: 'input', value: 'trader@example.com' },
      ],
    },
  ];

  if (loading && !profile) {
    return (
      <div className="space-y-6 max-w-3xl">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground mt-1">Customize your trading journal</p>
        </div>
        <SettingsSectionSkeleton />
        <SettingsSectionSkeleton />
        <SettingsSectionSkeleton />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground mt-1">Customize your trading journal</p>
      </div>

      {/* Preferences Section */}
      <div className="glass-card p-6 animate-fade-in stagger-1 hidden">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
            <Palette className="w-5 h-5 text-accent" />
          </div>
          <h2 className="text-lg font-semibold text-foreground">Preferences</h2>
        </div>

        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Moon className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="font-medium text-foreground">Dark Mode</p>
                <p className="text-sm text-muted-foreground">Use dark theme</p>
              </div>
            </div>
            <Switch checked={darkMode} onCheckedChange={handleDarkModeChange} />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <DollarSign className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="font-medium text-foreground">Currency</p>
                <p className="text-sm text-muted-foreground">Display currency for P&L</p>
              </div>
            </div>
            <Select value={currency} onValueChange={handleCurrencyChange}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USD">USD ($)</SelectItem>
                <SelectItem value="EUR">EUR (€)</SelectItem>
                <SelectItem value="GBP">GBP (£)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Globe className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="font-medium text-foreground">Timezone</p>
                <p className="text-sm text-muted-foreground">Set your local timezone</p>
              </div>
            </div>
            <Select defaultValue="UTC">
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="UTC">UTC</SelectItem>
                <SelectItem value="EST">EST (UTC-5)</SelectItem>
                <SelectItem value="PST">PST (UTC-8)</SelectItem>
                <SelectItem value="CET">CET (UTC+1)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Notifications Section */}
      <div className="glass-card p-6 animate-fade-in stagger-2 hidden">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center">
            <Bell className="w-5 h-5 text-warning" />
          </div>
          <h2 className="text-lg font-semibold text-foreground">Notifications</h2>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-foreground">Trade Reminders</p>
              <p className="text-sm text-muted-foreground">Get notified for open positions</p>
            </div>
            <Switch checked={notifications} onCheckedChange={handleNotificationsChange} />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-foreground">Weekly Report</p>
              <p className="text-sm text-muted-foreground">Receive weekly performance summary</p>
            </div>
            <Switch defaultChecked />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-foreground">Goal Alerts</p>
              <p className="text-sm text-muted-foreground">Notify when reaching goals</p>
            </div>
            <Switch defaultChecked />
          </div>
        </div>
      </div>

      {/* Trade Options Section */}
      <div className="glass-card p-6 animate-fade-in stagger-3">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <ListChecks className="w-5 h-5 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-foreground">Trade Options</h2>
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

      <div className="glass-card p-6 animate-fade-in stagger-3">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
            <Shield className="w-5 h-5 text-foreground" />
          </div>
          <h2 className="text-lg font-semibold text-foreground">Data Management</h2>
        </div>

        <div className="space-y-4">
          <button className="w-full flex items-center justify-between p-4 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors">
            <div className="flex items-center gap-3">
              <Download className="w-5 h-5 text-muted-foreground" />
              <div className="text-left">
                <p className="font-medium text-foreground">Export Data</p>
                <p className="text-sm text-muted-foreground">Download all your trades as CSV</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </button>

          <button className="w-full flex items-center justify-between p-4 rounded-xl bg-destructive/5 hover:bg-destructive/10 transition-colors border border-destructive/20">
            <div className="flex items-center gap-3">
              <Trash2 className="w-5 h-5 text-destructive" />
              <div className="text-left">
                <p className="font-medium text-destructive">Delete All Data</p>
                <p className="text-sm text-muted-foreground">Permanently remove all trades</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-destructive" />
          </button>
        </div>
      </div>
    </div>
  );
}
