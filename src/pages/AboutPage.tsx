import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Zap, ArrowLeft, Target, Heart, Shield, BarChart3 } from 'lucide-react';

export function AboutPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow">
              <Zap className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-foreground">TradeFlow</span>
          </Link>
          <Button variant="ghost" asChild className="gap-2">
            <Link to="/">
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Back to Home</span>
              <span className="sm:hidden">Back</span>
            </Link>
          </Button>
        </div>
      </nav>

      {/* Content */}
      <div className="pt-28 sm:pt-32 pb-16 sm:pb-20 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12 sm:mb-16">
            <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">About TradeFlow</h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              A trading journal built by a trader, for traders. Helping you track, analyze,
              and improve your trading performance — completely free.
            </p>
          </div>

          {/* Our Story */}
          <section className="mb-16">
            <h2 className="text-2xl font-semibold text-foreground mb-6">Our Story</h2>
            <div className="space-y-4 text-muted-foreground leading-relaxed">
              <p>
                TradeFlow was born out of a simple frustration: existing trading journals were either
                too expensive, too complicated, or lacked the features that active traders actually need.
                As a trader myself, I wanted a clean, powerful tool that could help me track my trades,
                spot patterns in my performance, and ultimately become a more disciplined trader.
              </p>
              <p>
                What started as a personal project quickly grew into something bigger. TradeFlow is now
                a full-featured trading journal with advanced analytics, calendar views, goal tracking,
                multi-account support, and AI-powered trade extraction — all available for free.
              </p>
              <p>
                TradeFlow is independently developed and maintained with a commitment to keeping the
                core product free and accessible to every trader, whether you're just starting out or
                managing multiple accounts professionally.
              </p>
            </div>
          </section>

          {/* Mission & Values */}
          <section className="mb-12 sm:mb-16">
            <h2 className="text-2xl font-semibold text-foreground mb-6 sm:mb-8">What We Stand For</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-card rounded-2xl border border-border/50 p-6 sm:p-8">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <Target className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-3">Mission</h3>
                <p className="text-muted-foreground leading-relaxed">
                  To provide every trader with a professional-grade journaling and analytics tool
                  that helps them make better, more informed trading decisions — without the paywall.
                </p>
              </div>

              <div className="bg-card rounded-2xl border border-border/50 p-6 sm:p-8">
                <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center mb-4">
                  <Heart className="w-6 h-6 text-success" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-3">Free Forever</h3>
                <p className="text-muted-foreground leading-relaxed">
                  All core features of TradeFlow are free and will remain free. We believe that
                  access to quality trading tools shouldn't depend on your account size or budget.
                </p>
              </div>

              <div className="bg-card rounded-2xl border border-border/50 p-6 sm:p-8">
                <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center mb-4">
                  <Shield className="w-6 h-6 text-accent" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-3">Privacy First</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Your trading data is yours. We don't sell, share, or monetize your personal
                  information. Your data is encrypted and stored securely on AWS infrastructure.
                </p>
              </div>

              <div className="bg-card rounded-2xl border border-border/50 p-6 sm:p-8">
                <div className="w-12 h-12 rounded-xl bg-warning/10 flex items-center justify-center mb-4">
                  <BarChart3 className="w-6 h-6 text-warning" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-3">Built for Traders</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Every feature is designed with real trading workflows in mind — from screenshot
                  imports to broken-rule tracking. We build what traders actually need.
                </p>
              </div>
            </div>
          </section>

          {/* What TradeFlow Offers */}
          <section className="mb-12 sm:mb-16">
            <h2 className="text-2xl font-semibold text-foreground mb-6">What TradeFlow Offers</h2>
            <div className="bg-card/50 rounded-2xl border border-border/50 p-6 sm:p-8 md:p-12">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <ul className="space-y-3 text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">&#10003;</span>
                    Unlimited trade logging and journaling
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">&#10003;</span>
                    Advanced performance analytics and charts
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">&#10003;</span>
                    Calendar view for daily P&L tracking
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">&#10003;</span>
                    Multi-account support
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">&#10003;</span>
                    Goal setting and rule tracking
                  </li>
                </ul>
                <ul className="space-y-3 text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">&#10003;</span>
                    AI-powered trade extraction from screenshots
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">&#10003;</span>
                    Trade image attachments
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">&#10003;</span>
                    CSV import for bulk trade entry
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">&#10003;</span>
                    Customizable filters and views
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">&#10003;</span>
                    Responsive design for desktop and mobile
                  </li>
                </ul>
              </div>
            </div>
          </section>

          {/* Disclaimer */}
          <section className="mb-12 sm:mb-16">
            <div className="bg-card rounded-2xl border border-warning/20 p-6 sm:p-8">
              <h2 className="text-2xl font-semibold text-foreground mb-4">Disclaimer</h2>
              <p className="text-muted-foreground leading-relaxed">
                TradeFlow is a journaling and analytics tool only. It does not provide financial advice,
                trading signals, or investment recommendations. Trading in financial markets involves
                substantial risk of loss and is not suitable for every investor. Past performance recorded
                in the application reflects your own data and is not indicative of future results. You are
                solely responsible for your own trading decisions. Please consult a qualified financial
                advisor before making any investment decisions.
              </p>
            </div>
          </section>

          {/* Contact */}
          <section>
            <div className="bg-card rounded-2xl border border-border/50 p-6 sm:p-8">
              <h2 className="text-2xl font-semibold text-foreground mb-4">Get in Touch</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Have questions, feedback, or partnership inquiries? We'd love to hear from you.
              </p>
              <div className="space-y-2 text-muted-foreground">
                <p><span className="text-foreground font-medium">Business:</span> TradeFlowJournal</p>
                <p><span className="text-foreground font-medium">Address:</span> 3-187/2, Regonda, Regonda, Bhupalpally, Telangana - 506348, India</p>
                <p><span className="text-foreground font-medium">Email:</span> Narra77888@gmail.com</p>
                <p><span className="text-foreground font-medium">Phone:</span> +91 8501018125</p>
              </div>
              <div className="mt-6">
                <Button asChild>
                  <Link to="/contact">Contact Us</Link>
                </Button>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-border/50 bg-card/50 py-8 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} TradeFlow. All rights reserved.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 sm:gap-x-6 text-sm">
            <Link to="/about" className="text-primary hover:text-primary/80 transition-colors">About Us</Link>
            <Link to="/privacy" className="text-muted-foreground hover:text-foreground transition-colors">Privacy Policy</Link>
            <Link to="/terms" className="text-muted-foreground hover:text-foreground transition-colors">Terms of Service</Link>
            <Link to="/refund" className="text-muted-foreground hover:text-foreground transition-colors">Refund Policy</Link>
            <Link to="/contact" className="text-muted-foreground hover:text-foreground transition-colors">Contact Us</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
