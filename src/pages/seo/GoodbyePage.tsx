import { Link } from 'react-router-dom';
import { SEO } from '@/components/SEO';
import { AuthFrame } from '@/components/auth/AuthFrame';
import { StatusView } from '@/components/auth/StatusView';
import { seoPageSchema } from '@/config/seo';

const RECEIPT: [string, string][] = [
  ['Deleted', 'Your journal, screenshots and AI reports'],
  ['Subscription', 'Cancelled, if you had one'],
  ['Kept', 'Some billing records, where the law requires'],
];

const PAGE = { path: '/goodbye', title: 'Your account has been deleted - TradeQut', description: 'Confirmation that your TradeQut account was deleted.', label: 'Account deleted' };

/** The last page of an account's life: a quiet receipt in the auth frame, no product picture and no site navigation. */
export default function GoodbyePage() {
  return (
    <AuthFrame pane="none">
      <SEO title={PAGE.title} description={PAGE.description} path={PAGE.path} jsonLd={seoPageSchema(PAGE)} noindex />
      <StatusView
        icon="quiet-ok"
        title="Your account has been deleted"
        lead="Thank you for using TradeQut."
        actions={
          <>
            <dl className="receipt" style={{ marginTop: 0 }}>
              {RECEIPT.map(([label, text]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{text}</dd>
                </div>
              ))}
            </dl>
            <p className="legal" style={{ fontSize: 13, lineHeight: '20px' }}>
              If you did not ask for this, email{' '}
              <a href="mailto:support@tradequt.com" className="link">
                support@tradequt.com
              </a>{' '}
              right away.
            </p>
            <Link to="/contact" className="btn btn-outline btn-block">
              Tell us why you left
            </Link>
            <Link to="/" className="link center link-touch">
              Go to tradequt.com
            </Link>
          </>
        }
      />
    </AuthFrame>
  );
}
