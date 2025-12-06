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
  Globe
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { 
  fetchProfile, 
  updateProfile,
  updatePreferences as updatePreferencesAction, 
  updateNotifications as updateNotificationsAction
} from '@/store/slices/userSlice';

export function SettingsView() {
  const dispatch = useAppDispatch();
  const { profile, preferences, notifications: notificationsSettings, loading } = useAppSelector((state) => state.user);
  
  useEffect(() => {
    dispatch(fetchProfile());
  }, [dispatch]);
  
  const [notifications, setNotifications] = useState(notificationsSettings?.tradeReminders ?? true);
  const [darkMode, setDarkMode] = useState(preferences?.theme === 'dark');
  const [currency, setCurrency] = useState(preferences?.currency || 'USD');
  const [displayName, setDisplayName] = useState(profile?.displayName || '');
  const [email, setEmail] = useState(profile?.email || '');
  
  useEffect(() => {
    if (profile) {
      setDisplayName(profile.displayName || '');
      setEmail(profile.email || '');
    }
  }, [profile]);
  
  useEffect(() => {
    if (preferences) {
      setDarkMode(preferences.theme === 'dark');
      setCurrency(preferences.currency || 'USD');
    }
  }, [preferences]);
  
  useEffect(() => {
    if (notificationsSettings) {
      setNotifications(notificationsSettings.tradeReminders ?? true);
    }
  }, [notificationsSettings]);
  
  const handleUpdateProfile = async () => {
    await dispatch(updateProfile({ displayName, email })).unwrap();
  };
  
  const handleDarkModeChange = async (checked: boolean) => {
    setDarkMode(checked);
    await dispatch(updatePreferencesAction({ theme: checked ? 'dark' : 'light', currency, timezone: 'UTC' })).unwrap();
  };
  
  const handleCurrencyChange = async (value: string) => {
    setCurrency(value);
    await dispatch(updatePreferencesAction({ theme: darkMode ? 'dark' : 'light', currency: value, timezone: 'UTC' })).unwrap();
  };
  
  const handleNotificationsChange = async (checked: boolean) => {
    setNotifications(checked);
    await dispatch(updateNotificationsAction({ tradeReminders: checked, weeklyReport: true, goalAlerts: true })).unwrap();
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

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground mt-1">Customize your trading journal</p>
      </div>

      {/* Profile Section */}
      <div className="glass-card p-6 animate-fade-in">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <User className="w-5 h-5 text-primary" />
          </div>
          <h2 className="text-lg font-semibold text-foreground">Profile</h2>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Display Name</Label>
            <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" />
          </div>
          <Button variant="outline" onClick={handleUpdateProfile}>Update Profile</Button>
        </div>
      </div>

      {/* Preferences Section */}
      <div className="glass-card p-6 animate-fade-in stagger-1">
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
      <div className="glass-card p-6 animate-fade-in stagger-2">
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

      {/* Data Management */}
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
