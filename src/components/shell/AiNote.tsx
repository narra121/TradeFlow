import { Link } from 'react-router-dom';

/** The one disclaimer and data note shown on both AI screens. Final wording is the owner's (D-7). */
export function AiNote() {
  return (
    <p className="text-xs text-muted-foreground">
      Based on your journal data. Not investment advice. Trade figures are sent through OpenRouter to OpenAI to write the
      analysis, never your screenshots, name or email. Reports include your notes only if you switch on Use my notes; chat
      never sends them. See the <Link to="/privacy" className="underline underline-offset-2">privacy policy</Link>.
    </p>
  );
}
