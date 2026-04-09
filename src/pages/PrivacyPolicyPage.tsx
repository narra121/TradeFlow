import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Zap, ArrowLeft } from 'lucide-react';

export function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow">
              <Zap className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-foreground">TradeFlow</span>
          </Link>
          <Button variant="ghost" asChild className="gap-2">
            <Link to="/">
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </Link>
          </Button>
        </div>
      </nav>

      {/* Content */}
      <div className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold text-foreground mb-2">Privacy Policy</h1>
          <p className="text-muted-foreground mb-12">Last updated: April 9, 2026</p>

          <div className="space-y-10 text-foreground/90">
            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">1. Introduction</h2>
              <p className="text-muted-foreground leading-relaxed">
                TradeFlowJournal ("we", "our", or "us") operates the TradeFlow application (the "Service").
                This Privacy Policy explains how we collect, use, disclose, and safeguard your information when
                you use our Service. By accessing or using TradeFlow, you agree to the terms of this Privacy Policy.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">2. Information We Collect</h2>
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-medium text-foreground mb-2">2.1 Personal Information</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    When you create an account, we collect your name, email address, and password.
                    This information is required to provide you with access to the Service.
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-medium text-foreground mb-2">2.2 Trading Data</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    You may voluntarily input trading data including trade entries, exits, profit/loss figures,
                    notes, screenshots, and account details. This data is stored securely and is used solely
                    to provide you with analytics and journaling features.
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-medium text-foreground mb-2">2.3 Usage Data</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    We may collect information about how you access and use the Service, including your IP address,
                    browser type, device information, pages visited, and time spent on the platform.
                  </p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">3. How We Use Your Information</h2>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                <li>To provide, maintain, and improve the Service</li>
                <li>To create and manage your account</li>
                <li>To generate trading analytics and performance reports</li>
                <li>To process optional support contributions</li>
                <li>To communicate with you about updates, features, and support</li>
                <li>To detect and prevent fraud or unauthorized access</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">4. Data Storage & Security</h2>
              <p className="text-muted-foreground leading-relaxed">
                Your data is stored on secure cloud servers powered by Amazon Web Services (AWS). We implement
                industry-standard security measures including encryption in transit (TLS/SSL) and encryption at rest
                to protect your personal and trading data. However, no method of transmission over the Internet is
                100% secure, and we cannot guarantee absolute security.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">5. Cookies</h2>
              <p className="text-muted-foreground leading-relaxed">
                We use cookies and similar tracking technologies to maintain your session, remember your preferences,
                and improve your experience. You can control cookie settings through your browser preferences.
                Disabling cookies may affect the functionality of certain features.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">6. Third-Party Services</h2>
              <p className="text-muted-foreground leading-relaxed">
                We may use third-party services for authentication, payment processing (PayU), analytics, and
                hosting. These third parties have their own privacy policies and may collect information as
                described in their respective policies. We do not sell or share your personal data with third
                parties for marketing purposes.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">7. Your Rights</h2>
              <p className="text-muted-foreground leading-relaxed mb-3">
                You have the right to:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                <li>Access, update, or delete your personal information</li>
                <li>Export your trading data at any time</li>
                <li>Request deletion of your account and all associated data</li>
                <li>Opt out of non-essential communications</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-3">
                To exercise any of these rights, please contact us at the details provided below.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">8. Children's Privacy</h2>
              <p className="text-muted-foreground leading-relaxed">
                The Service is not intended for individuals under the age of 18. We do not knowingly collect
                personal information from children. If we become aware that we have collected data from a child,
                we will take steps to delete such information promptly.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">9. Changes to This Policy</h2>
              <p className="text-muted-foreground leading-relaxed">
                We may update this Privacy Policy from time to time. We will notify you of any material changes
                by posting the new policy on this page and updating the "Last updated" date. Your continued use
                of the Service after changes constitutes acceptance of the revised policy.
              </p>
            </section>

            <section className="bg-card rounded-2xl border border-border/50 p-8">
              <h2 className="text-2xl font-semibold text-foreground mb-4">10. Contact Us</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                If you have any questions about this Privacy Policy, please contact us:
              </p>
              <div className="space-y-2 text-muted-foreground">
                <p><span className="text-foreground font-medium">Business:</span> TradeFlowJournal</p>
                <p><span className="text-foreground font-medium">Address:</span> 3-187/2, Regonda, Regonda, Bhupalpally, Telangana - 506348</p>
                <p><span className="text-foreground font-medium">Email:</span> Narra77888@gmail.com</p>
                <p><span className="text-foreground font-medium">Phone:</span> +91 8501018125</p>
              </div>
            </section>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-border/50 bg-card/50 py-8 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} TradeFlow. All rights reserved.
          </p>
          <div className="flex items-center gap-6 text-sm">
            <Link to="/about" className="text-muted-foreground hover:text-foreground transition-colors">About Us</Link>
            <Link to="/privacy" className="text-primary hover:text-primary/80 transition-colors">Privacy Policy</Link>
            <Link to="/terms" className="text-muted-foreground hover:text-foreground transition-colors">Terms of Service</Link>
            <Link to="/refund" className="text-muted-foreground hover:text-foreground transition-colors">Refund Policy</Link>
            <Link to="/contact" className="text-muted-foreground hover:text-foreground transition-colors">Contact Us</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
