import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Zap, ArrowLeft } from 'lucide-react';

export function RefundPolicyPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
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

      {/* Content */}
      <div className="pt-28 sm:pt-32 pb-16 sm:pb-20 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-2">Refund & Cancellation Policy</h1>
          <p className="text-muted-foreground mb-12">Last updated: April 9, 2026</p>

          <div className="space-y-10 text-foreground/90">
            <section className="bg-card rounded-2xl border border-success/20 p-6 sm:p-8">
              <h2 className="text-2xl font-semibold text-success mb-4">TradeQut is Free</h2>
              <p className="text-muted-foreground leading-relaxed">
                TradeQut is a <span className="text-foreground font-medium">100% free trading journal</span> with
                all features included at no cost. There are no premium tiers, paywalls, or feature restrictions.
                You can use TradeQut indefinitely without any payment.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">1. Optional Support Contributions</h2>
              <p className="text-muted-foreground leading-relaxed">
                TradeQut offers optional support contributions (&#8377;99/month or &#8377;299/month) for users
                who wish to support the independent developer behind the platform. These contributions are entirely
                voluntary and do not unlock any additional features or benefits. The app remains fully functional
                without any payment.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">2. Refund Eligibility</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Since all payments are voluntary support contributions, refunds are handled on a case-by-case basis.
                You are eligible for a full refund if:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                <li>You were charged incorrectly or without your authorization</li>
                <li>A duplicate payment was processed</li>
                <li>You request a refund within 7 days of the payment date</li>
                <li>The payment was made due to a technical error</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">3. Cancellation Policy</h2>
              <p className="text-muted-foreground leading-relaxed">
                You may cancel your optional support subscription at any time. Upon cancellation:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground mt-3">
                <li>Your contribution will stop at the end of the current billing cycle</li>
                <li>You will not be charged for subsequent periods</li>
                <li>All features of TradeQut will continue to work as before — nothing changes</li>
                <li>No partial refunds are provided for the remaining period of the current billing cycle</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">4. How to Request a Refund</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                To request a refund, please contact us with the following details:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                <li>Your registered email address</li>
                <li>Transaction ID or payment reference number</li>
                <li>Date of the payment</li>
                <li>Reason for the refund request</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">5. Refund Processing</h2>
              <div className="space-y-4">
                <div className="flex items-start gap-3 sm:gap-4 bg-card rounded-xl border border-border/50 p-4 sm:p-6">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-primary font-bold">1</span>
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-foreground font-medium mb-1">Submit Request</h3>
                    <p className="text-muted-foreground text-sm break-words">Email us at Narra77888@gmail.com with your refund details</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 sm:gap-4 bg-card rounded-xl border border-border/50 p-4 sm:p-6">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-primary font-bold">2</span>
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-foreground font-medium mb-1">Review</h3>
                    <p className="text-muted-foreground text-sm">We will review your request within 3-5 business days</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 sm:gap-4 bg-card rounded-xl border border-border/50 p-4 sm:p-6">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-primary font-bold">3</span>
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-foreground font-medium mb-1">Processing</h3>
                    <p className="text-muted-foreground text-sm">Approved refunds will be credited to the original payment method within 5-7 business days</p>
                  </div>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">6. Account Deletion</h2>
              <p className="text-muted-foreground leading-relaxed">
                You may request deletion of your account and all associated data at any time by contacting us.
                If you have an active support subscription, it will be cancelled automatically upon account deletion.
                Account deletion is permanent and cannot be undone.
              </p>
            </section>

            <section className="bg-card rounded-2xl border border-border/50 p-6 sm:p-8">
              <h2 className="text-2xl font-semibold text-foreground mb-4">7. Contact Us</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                For refund requests or any payment-related queries, please reach out to us:
              </p>
              <div className="space-y-2 text-muted-foreground">
                <p><span className="text-foreground font-medium">Business:</span> TradeQutJournal</p>
                <p><span className="text-foreground font-medium">Address:</span> 3-187/2, Regonda, Regonda, Bhupalpally, Telangana - 506348</p>
                <p><span className="text-foreground font-medium">Email:</span> Narra77888@gmail.com</p>
                <p><span className="text-foreground font-medium">Phone:</span> +91 8501018125</p>
              </div>
            </section>
          </div>
        </div>
      </div>

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
            <Link to="/refund" className="text-primary hover:text-primary/80 transition-colors">Refund Policy</Link>
            <Link to="/contact" className="text-muted-foreground hover:text-foreground transition-colors">Contact Us</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
