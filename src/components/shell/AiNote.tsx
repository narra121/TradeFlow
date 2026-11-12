import { Link } from 'react-router-dom';

/** The one disclaimer and data note shown on both AI screens. Final wording is the owner's (D-7). */
export function AiNote() {
  return (
    <p className="text-xs text-muted-foreground">
      Based on your journal data. Not investment advice. Trade figures (not your notes, screenshots, name or email) are sent to Google Gemini to
      write the analysis; see the <Link to="/privacy" className="underline underline-offset-2">privacy policy</Link>.
    </p>
  );
}
