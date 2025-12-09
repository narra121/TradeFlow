import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { 
  Zap, 
  BarChart3, 
  Calendar, 
  Target, 
  Shield, 
  TrendingUp, 
  BookOpen, 
  Camera,
  Users,
  CheckCircle2,
  ArrowRight,
  Star,
  ChevronRight,
  Play,
  Building2,
  PieChart,
  Clock,
  Award,
  Heart
} from 'lucide-react';
import { cn } from '@/lib/utils';

export function LandingPage() {
  const [hoveredFeature, setHoveredFeature] = useState<number | null>(null);

  const features = [
    {
      icon: BarChart3,
      title: 'Advanced Analytics',
      description: 'Deep dive into your trading performance with comprehensive charts, win rate analysis, and P&L breakdowns.',
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      icon: Calendar,
      title: 'Calendar View',
      description: 'Visualize your trading activity with daily P&L, weekly summaries, and monthly performance at a glance.',
      color: 'text-success',
      bgColor: 'bg-success/10',
    },
    {
      icon: Building2,
      title: 'Multi-Account Support',
      description: 'Manage multiple trading accounts, prop challenges, and funded accounts all in one place.',
      color: 'text-accent',
      bgColor: 'bg-accent/10',
    },
    {
      icon: Target,
      title: 'Goals & Rules',
      description: 'Set trading goals, track your progress, and maintain discipline with customizable trading rules.',
      color: 'text-warning',
      bgColor: 'bg-warning/10',
    },
    {
      icon: Camera,
      title: 'Screenshot Import',
      description: 'Import trades directly from screenshots using AI-powered extraction. Save time on manual entry.',
      color: 'text-info',
      bgColor: 'bg-info/10',
    },
    {
      icon: BookOpen,
      title: 'Trade Journal',
      description: 'Document every trade with notes, mistakes, lessons learned, and visual evidence for continuous improvement.',
      color: 'text-destructive',
      bgColor: 'bg-destructive/10',
    },
  ];

  const howItWorks = [
    {
      step: '01',
      title: 'Create Your Account',
      description: 'Sign up in seconds and set up your trading accounts — prop challenges, live accounts, or demo.',
    },
    {
      step: '02',
      title: 'Log Your Trades',
      description: 'Add trades manually or import from screenshots. Track entry, exit, P&L, and your reasoning.',
    },
    {
      step: '03',
      title: 'Analyze & Improve',
      description: 'Review your analytics, identify patterns, and continuously improve your trading strategy.',
    },
  ];

  const testimonials = [
    {
      name: 'Marcus Chen',
      role: 'Prop Trader',
      avatar: 'MC',
      content: 'TradeFlow helped me pass my FTMO challenge. The analytics showed me exactly where I was leaking money.',
      rating: 5,
    },
    {
      name: 'Sarah Johnson',
      role: 'Forex Trader',
      avatar: 'SJ',
      content: 'The calendar view is a game-changer. I can instantly see my best and worst trading days.',
      rating: 5,
    },
    {
      name: 'David Kim',
      role: 'Day Trader',
      avatar: 'DK',
      content: 'Finally, a trading journal that looks modern and is actually enjoyable to use. Highly recommended!',
      rating: 5,
    },
  ];

  const stats = [
    { value: '10,000+', label: 'Active Traders' },
    { value: '500K+', label: 'Trades Logged' },
    { value: '65%', label: 'Avg. Win Rate Improvement' },
    { value: '4.9/5', label: 'User Rating' },
  ];

  return (
    <div className="min-h-screen bg-background overflow-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <button 
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="flex items-center gap-3 cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow">
              <Zap className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-foreground">TradeFlow</span>
          </button>

          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors">Features</a>
            <a href="#how-it-works" className="text-muted-foreground hover:text-foreground transition-colors">How it Works</a>
            <a href="#testimonials" className="text-muted-foreground hover:text-foreground transition-colors">Testimonials</a>
            <a href="#pricing" className="text-muted-foreground hover:text-foreground transition-colors">Pricing</a>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="ghost" asChild>
              <Link to="/login">Log In</Link>
            </Button>
            <Button asChild className="gap-2">
              <Link to="/signup">
                Get Started
                <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-6">
        {/* Background effects */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/20 via-background to-background" />
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl" />
        <div className="absolute top-40 right-1/4 w-64 h-64 bg-accent/20 rounded-full blur-3xl" />
        
        <div className="relative max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-8">
            <Zap className="w-4 h-4 text-primary" />
            <span className="text-sm text-primary font-medium">The #1 Trading Journal for Serious Traders</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-bold text-foreground mb-6 leading-tight">
            Master Your
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-primary via-accent to-primary">
              Trading Performance
            </span>
          </h1>

          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
            Track, analyze, and improve your trades with the most powerful trading journal. 
            Built for prop traders, forex traders, and anyone serious about consistent profits.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Button size="lg" asChild className="gap-2 h-14 px-8 text-lg">
              <Link to="/signup">
                Get Started for Free
                <ArrowRight className="w-5 h-5" />
              </Link>
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-foreground mb-1">{stat.value}</div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Dashboard Preview */}
        <div className="relative max-w-6xl mx-auto mt-20">
          <div className="relative rounded-2xl overflow-hidden border border-border/50 shadow-2xl shadow-primary/10">
            <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent z-10" />
            <div className="bg-card p-8">
              <div className="grid grid-cols-4 gap-4 mb-6">
                {[
                  { label: 'Total P&L', value: '+₹12,637', color: 'text-success' },
                  { label: 'Win Rate', value: '67.4%', color: 'text-primary' },
                  { label: 'Total Trades', value: '156', color: 'text-foreground' },
                  { label: 'Best Trade', value: '+₹2,450', color: 'text-success' },
                ].map((stat, i) => (
                  <div key={i} className="bg-secondary/50 rounded-xl p-4">
                    <div className="text-sm text-muted-foreground mb-1">{stat.label}</div>
                    <div className={cn("text-2xl font-bold font-mono", stat.color)}>{stat.value}</div>
                  </div>
                ))}
              </div>
              <div className="h-48 bg-secondary/30 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-16 h-16 text-primary/30" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 px-6 bg-secondary/20">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-foreground mb-4">
              Everything You Need to
              <span className="text-primary"> Trade Better</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Powerful features designed by traders, for traders. Track every aspect of your trading journey.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div
                  key={index}
                  onMouseEnter={() => setHoveredFeature(index)}
                  onMouseLeave={() => setHoveredFeature(null)}
                  className={cn(
                    "group p-8 rounded-2xl border transition-all duration-300 cursor-default",
                    hoveredFeature === index 
                      ? "bg-card border-primary/50 shadow-xl shadow-primary/10 scale-[1.02]" 
                      : "bg-card/50 border-border/50 hover:border-primary/30"
                  )}
                >
                  <div className={cn(
                    "w-14 h-14 rounded-xl flex items-center justify-center mb-6 transition-colors",
                    feature.bgColor
                  )}>
                    <Icon className={cn("w-7 h-7", feature.color)} />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-3">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-foreground mb-4">
              Start Improving in
              <span className="text-primary"> 3 Simple Steps</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Get started in minutes and begin your journey to consistent profitability.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {/* Connecting lines - positioned behind circles */}
            <div className="hidden md:flex absolute top-12 left-0 right-0 items-center justify-center px-[16.67%]">
              <div className="flex-1 h-[2px] bg-gradient-to-r from-transparent via-primary/40 to-primary/40 mx-12" />
              <div className="w-24 shrink-0" /> {/* Space for middle circle */}
              <div className="flex-1 h-[2px] bg-gradient-to-l from-transparent via-primary/40 to-primary/40 mx-12" />
            </div>
            
            {howItWorks.map((item, index) => (
              <div key={index} className="relative z-10">
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-background border-2 border-primary/30 mb-6 relative">
                    <div className="absolute inset-1 rounded-full bg-primary/10" />
                    <span className="text-3xl font-bold text-primary relative z-10">{item.step}</span>
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-3">{item.title}</h3>
                  <p className="text-muted-foreground">{item.description}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <Button size="lg" asChild className="gap-2">
              <Link to="/signup">
                Get Started Now
                <ChevronRight className="w-5 h-5" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-24 px-6 bg-secondary/20">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-foreground mb-4">
              Loved by
              <span className="text-primary"> Thousands of Traders</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              See what our community has to say about TradeFlow.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="bg-card rounded-2xl p-8 border border-border/50">
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 fill-warning text-warning" />
                  ))}
                </div>
                <p className="text-foreground mb-6 text-lg leading-relaxed">"{testimonial.content}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-primary flex items-center justify-center text-primary-foreground font-semibold">
                    {testimonial.avatar}
                  </div>
                  <div>
                    <div className="font-semibold text-foreground">{testimonial.name}</div>
                    <div className="text-sm text-muted-foreground">{testimonial.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-foreground mb-4">
              100%
              <span className="text-primary"> Free to Use</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              TradeFlow is completely free with all features included. If you love it and want to support the developer, you can contribute optionally.
            </p>
          </div>

          {/* Free Plan */}
          <div className="bg-card rounded-3xl border border-border/50 overflow-hidden mb-8">
            <div className="p-8 md:p-12">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-8">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-success/10 text-success text-sm font-medium mb-4">
                    <CheckCircle2 className="w-4 h-4" />
                    Forever Free
                  </div>
                  <h3 className="text-3xl font-bold text-foreground mb-2">
                    <span className="text-success">₹0</span> — All Features Included
                  </h3>
                  <p className="text-muted-foreground">
                    No credit card required. No hidden fees. Just start trading smarter.
                  </p>
                </div>
                <Button size="lg" asChild className="shrink-0 gap-2">
                  <Link to="/signup">
                    Get Started Free
                    <ArrowRight className="w-5 h-5" />
                  </Link>
                </Button>
              </div>

              <div className="mt-10 pt-10 border-t border-border/50">
                <div className="text-sm font-medium text-muted-foreground mb-4">Everything included for free:</div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    'Unlimited trades',
                    'Full analytics',
                    'Calendar view',
                    'Trade import',
                    'Multiple accounts',
                    'Goal tracking',
                    'Trading rules',
                    'All future features',
                  ].map((feature, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-success shrink-0" />
                      <span className="text-sm text-foreground">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Support the Developer */}
          <div className="bg-card/50 rounded-2xl border border-primary/20 p-8 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
              <Heart className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">Love TradeFlow? Support the Developer</h3>
            <p className="text-muted-foreground mb-6 max-w-lg mx-auto">
              TradeFlow is built with love by an independent developer. If you find it valuable, 
              consider supporting with a small contribution to help cover hosting and development costs.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <div className="px-6 py-3 rounded-xl bg-background/50 border border-border/50">
                <span className="text-2xl font-bold text-primary">₹99</span>
                <span className="text-muted-foreground">/month</span>
              </div>
              <span className="text-muted-foreground">or</span>
              <div className="px-6 py-3 rounded-xl bg-background/50 border border-border/50">
                <span className="text-2xl font-bold text-primary">₹299</span>
                <span className="text-muted-foreground">/month</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-4">
              100% optional — the app remains fully free regardless
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-accent/20 rounded-full blur-3xl" />
        
        <div className="relative max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
            Ready to Transform Your Trading?
          </h2>
          <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
            Join thousands of traders who are already using TradeFlow to track, analyze, and improve their performance.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" asChild className="gap-2 h-14 px-8 text-lg">
              <Link to="/signup">
                Get Started Free
                <ArrowRight className="w-5 h-5" />
              </Link>
            </Button>
            <p className="text-sm text-muted-foreground">Free forever • All features included</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 bg-card/50 py-16 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
            <div className="md:col-span-1">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow">
                  <Zap className="w-5 h-5 text-primary-foreground" />
                </div>
                <span className="text-xl font-bold text-foreground">TradeFlow</span>
              </div>
              <p className="text-muted-foreground text-sm">
                The professional trading journal for serious traders. Track, analyze, and improve your trading performance.
              </p>
            </div>

            <div>
              <h4 className="font-semibold text-foreground mb-4">Product</h4>
              <ul className="space-y-3">
                {['Features', 'Pricing', 'Changelog', 'Roadmap'].map((item) => (
                  <li key={item}>
                    <a href="#" className="text-muted-foreground hover:text-foreground transition-colors text-sm">{item}</a>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-foreground mb-4">Resources</h4>
              <ul className="space-y-3">
                {['Documentation', 'Blog', 'Community', 'Support'].map((item) => (
                  <li key={item}>
                    <a href="#" className="text-muted-foreground hover:text-foreground transition-colors text-sm">{item}</a>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-foreground mb-4">Legal</h4>
              <ul className="space-y-3">
                {['Privacy Policy', 'Terms of Service', 'Cookie Policy'].map((item) => (
                  <li key={item}>
                    <a href="#" className="text-muted-foreground hover:text-foreground transition-colors text-sm">{item}</a>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-border/50 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} TradeFlow. All rights reserved.
            </p>
            <div className="flex items-center gap-6">
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/></svg>
              </a>
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
              </a>
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
