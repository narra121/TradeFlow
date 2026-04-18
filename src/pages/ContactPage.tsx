import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { SEO } from '@/components/SEO';
import { CONTACT_SCHEMA } from '@/config/seo';
import { Zap, ArrowLeft, Mail, Phone, MapPin, Clock } from 'lucide-react';

export function ContactPage() {
  return (
    <>
      <SEO
        title="Contact TradeQut - Support & Feedback"
        description="Get in touch with the TradeQut team. We're here to help with questions, feedback, and support for your trading journal."
        path="/contact"
        jsonLd={CONTACT_SCHEMA}
      />
      <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav aria-label="Contact page navigation" className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow">
              <Zap className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-foreground">TradeQut</span>
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

      <main id="main-content">
      {/* Content */}
      <div className="pt-28 sm:pt-32 pb-16 sm:pb-20 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12 sm:mb-16">
            <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">Contact Us</h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Have a question, feedback, or need support? We'd love to hear from you.
              Reach out through any of the channels below.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
            <div className="bg-card rounded-2xl border border-border/50 p-6 sm:p-8 flex flex-col items-center text-center">
              <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-6">
                <Mail className="w-7 h-7 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">Email</h3>
              <p className="text-muted-foreground mb-4">For general inquiries and support</p>
              <a
                href="mailto:Narra77888@gmail.com"
                className="text-primary hover:text-primary/80 transition-colors font-medium"
              >
                Narra77888@gmail.com
              </a>
            </div>

            <div className="bg-card rounded-2xl border border-border/50 p-6 sm:p-8 flex flex-col items-center text-center">
              <div className="w-14 h-14 rounded-xl bg-success/10 flex items-center justify-center mb-6">
                <Phone className="w-7 h-7 text-success" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">Phone</h3>
              <p className="text-muted-foreground mb-4">Mon - Sat, 10:00 AM - 6:00 PM IST</p>
              <a
                href="tel:+918501018125"
                className="text-primary hover:text-primary/80 transition-colors font-medium"
              >
                +91 8501018125
              </a>
            </div>

            <div className="bg-card rounded-2xl border border-border/50 p-6 sm:p-8 flex flex-col items-center text-center">
              <div className="w-14 h-14 rounded-xl bg-accent/10 flex items-center justify-center mb-6">
                <MapPin className="w-7 h-7 text-accent" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">Address</h3>
              <p className="text-muted-foreground mb-4">Our registered business address</p>
              <p className="text-foreground/90 leading-relaxed">
                TradeQutJournal<br />
                3-187/2, Regonda, Regonda<br />
                Bhupalpally, Telangana - 506348<br />
                India
              </p>
            </div>

            <div className="bg-card rounded-2xl border border-border/50 p-6 sm:p-8 flex flex-col items-center text-center">
              <div className="w-14 h-14 rounded-xl bg-warning/10 flex items-center justify-center mb-6">
                <Clock className="w-7 h-7 text-warning" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">Response Time</h3>
              <p className="text-muted-foreground mb-4">We aim to respond promptly</p>
              <p className="text-foreground/90 leading-relaxed">
                Email: Within 24 hours<br />
                Phone: During business hours
              </p>
            </div>
          </div>

          {/* FAQ-like section */}
          <div className="bg-card/50 rounded-2xl border border-border/50 p-6 sm:p-8 md:p-12">
            <h2 className="text-2xl font-semibold text-foreground mb-6 text-center">Common Inquiries</h2>
            <div className="space-y-6">
              <div className="border-b border-border/50 pb-6">
                <h3 className="text-foreground font-medium mb-2">Account & Technical Support</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Having trouble logging in, importing trades, or using a feature? Email us with a description
                  of the issue and any relevant screenshots. We'll get back to you within 24 hours.
                </p>
              </div>
              <div className="border-b border-border/50 pb-6">
                <h3 className="text-foreground font-medium mb-2">Payment & Refund Queries</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  For payment-related issues or refund requests, please include your registered email and
                  transaction ID. See our{' '}
                  <Link to="/refund" className="text-primary hover:text-primary/80 transition-colors">
                    Refund & Cancellation Policy
                  </Link>{' '}
                  for more details.
                </p>
              </div>
              <div className="border-b border-border/50 pb-6">
                <h3 className="text-foreground font-medium mb-2">Feature Requests & Feedback</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  We're always looking to improve TradeQut. Share your ideas, suggestions, or feedback
                  via email. Your input helps us build a better trading journal for everyone.
                </p>
              </div>
              <div>
                <h3 className="text-foreground font-medium mb-2">Data & Privacy Concerns</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  For data export, account deletion, or privacy-related requests, please refer to our{' '}
                  <Link to="/privacy" className="text-primary hover:text-primary/80 transition-colors">
                    Privacy Policy
                  </Link>{' '}
                  or contact us directly.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 bg-card/50 py-8 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} TradeQut. All rights reserved.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 sm:gap-x-6 text-sm">
            <Link to="/about" className="text-muted-foreground hover:text-foreground transition-colors">About Us</Link>
            <Link to="/privacy" className="text-muted-foreground hover:text-foreground transition-colors">Privacy Policy</Link>
            <Link to="/terms" className="text-muted-foreground hover:text-foreground transition-colors">Terms of Service</Link>
            <Link to="/refund" className="text-muted-foreground hover:text-foreground transition-colors">Refund Policy</Link>
            <Link to="/contact" className="text-primary hover:text-primary/80 transition-colors">Contact Us</Link>
          </div>
        </div>
      </footer>
    </div>
    </>
  );
}
