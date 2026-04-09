import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Zap, ArrowLeft } from 'lucide-react';

export function TermsOfServicePage() {
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
          <h1 className="text-4xl font-bold text-foreground mb-2">Terms of Service</h1>
          <p className="text-muted-foreground mb-12">Last updated: April 9, 2026</p>

          <div className="space-y-10 text-foreground/90">
            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">1. Acceptance of Terms</h2>
              <p className="text-muted-foreground leading-relaxed">
                By accessing or using TradeFlow (the "Service"), operated by TradeFlowJournal ("we", "our", or "us"),
                you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not
                use the Service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">2. Description of Service</h2>
              <p className="text-muted-foreground leading-relaxed">
                TradeFlow is a web-based trading journal application that allows users to log trades, track
                performance, analyze trading patterns, and maintain a journal of their trading activity. The
                Service is provided free of charge with all core features included. Optional paid support
                contributions are available but not required.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">3. User Accounts</h2>
              <div className="space-y-4">
                <p className="text-muted-foreground leading-relaxed">
                  To use the Service, you must create an account by providing a valid email address and password. You are responsible for:
                </p>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                  <li>Maintaining the confidentiality of your account credentials</li>
                  <li>All activities that occur under your account</li>
                  <li>Notifying us immediately of any unauthorized access or use</li>
                  <li>Providing accurate and up-to-date information</li>
                </ul>
                <p className="text-muted-foreground leading-relaxed">
                  We reserve the right to suspend or terminate accounts that violate these terms.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">4. User Responsibilities</h2>
              <p className="text-muted-foreground leading-relaxed mb-3">You agree not to:</p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                <li>Use the Service for any unlawful purpose</li>
                <li>Attempt to gain unauthorized access to the Service or its systems</li>
                <li>Interfere with or disrupt the integrity or performance of the Service</li>
                <li>Upload any malicious code, viruses, or harmful content</li>
                <li>Use the Service to store or transmit any content that infringes on third-party rights</li>
                <li>Reverse engineer, decompile, or disassemble any part of the Service</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">5. Trading Disclaimer</h2>
              <p className="text-muted-foreground leading-relaxed">
                TradeFlow is a journaling and analytics tool only. It does not provide financial advice,
                trading signals, or investment recommendations. Trading in financial markets involves substantial
                risk of loss. Past performance displayed in the application reflects your own recorded data and
                is not indicative of future results. You are solely responsible for your trading decisions.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">6. Intellectual Property</h2>
              <p className="text-muted-foreground leading-relaxed">
                The Service, including its design, code, features, and branding, is the intellectual property
                of TradeFlowJournal. You retain ownership of all trading data and content you input into the
                Service. By using the Service, you grant us a limited license to process your data solely for
                the purpose of providing the Service to you.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">7. Payment Terms</h2>
              <p className="text-muted-foreground leading-relaxed">
                The core Service is provided free of charge. Optional support contributions (starting at
                &#8377;99/month) are entirely voluntary and do not unlock additional features. Payments are
                processed through PayU, a third-party payment gateway. By making a payment, you agree to
                PayU's terms and conditions. All payment-related disputes are subject to our Refund & Cancellation Policy.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">8. Service Availability</h2>
              <p className="text-muted-foreground leading-relaxed">
                We strive to keep the Service available at all times but do not guarantee uninterrupted access.
                The Service may be temporarily unavailable due to maintenance, updates, or circumstances beyond
                our control. We are not liable for any loss or inconvenience caused by downtime.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">9. Limitation of Liability</h2>
              <p className="text-muted-foreground leading-relaxed">
                To the maximum extent permitted by applicable law, TradeFlowJournal shall not be liable for
                any indirect, incidental, special, consequential, or punitive damages, including but not limited
                to loss of profits, data, or trading losses, arising out of your use of the Service. Our total
                liability shall not exceed the amount paid by you, if any, in the twelve (12) months preceding the claim.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">10. Termination</h2>
              <p className="text-muted-foreground leading-relaxed">
                You may terminate your account at any time by contacting us. We may suspend or terminate your
                access to the Service at our discretion if you violate these terms. Upon termination, your right
                to use the Service ceases immediately. You may request export of your data before termination.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">11. Governing Law</h2>
              <p className="text-muted-foreground leading-relaxed">
                These Terms shall be governed by and construed in accordance with the laws of India. Any disputes
                arising from these Terms or the Service shall be subject to the exclusive jurisdiction of the
                courts in Bhupalpally, Telangana, India.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">12. Changes to These Terms</h2>
              <p className="text-muted-foreground leading-relaxed">
                We reserve the right to modify these Terms at any time. Material changes will be communicated
                by updating the "Last updated" date on this page. Your continued use of the Service after
                changes constitutes acceptance of the revised Terms.
              </p>
            </section>

            <section className="bg-card rounded-2xl border border-border/50 p-8">
              <h2 className="text-2xl font-semibold text-foreground mb-4">13. Contact Us</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                If you have any questions about these Terms of Service, please contact us:
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
            <Link to="/privacy" className="text-muted-foreground hover:text-foreground transition-colors">Privacy Policy</Link>
            <Link to="/terms" className="text-primary hover:text-primary/80 transition-colors">Terms of Service</Link>
            <Link to="/refund" className="text-muted-foreground hover:text-foreground transition-colors">Refund Policy</Link>
            <Link to="/contact" className="text-muted-foreground hover:text-foreground transition-colors">Contact Us</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
