import { Link } from 'react-router-dom';

export default function TradingPsychologyManagingEmotions() {
  return (
    <>
      <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">The Fear and Greed Cycle</h2>
      <p className="text-muted-foreground leading-relaxed mb-4">
        Every trader, regardless of experience, operates within a constant tension between fear and greed. Fear causes
        you to exit winning trades too early, skip valid setups, and widen your stop losses. Greed pushes you to hold
        losers too long, overtrade, and increase position sizes beyond what your{' '}
        <Link to="/blog/build-trading-plan" className="text-primary hover:text-primary/80">trading plan</Link> allows.
        These two emotions are not flaws to eliminate. They are biological responses hardwired into the human brain,
        and the best traders learn to manage them rather than pretend they do not exist.
      </p>
      <p className="text-muted-foreground leading-relaxed mb-4">
        The fear-greed cycle is predictable. After a series of winning trades, confidence swells into overconfidence,
        leading to larger positions and sloppier entries. After a losing streak, fear takes over, causing hesitation
        and missed opportunities. Recognizing which phase of the cycle you are in is the first step toward breaking
        free from it. This awareness does not come naturally. It requires deliberate self-observation and honest
        record-keeping.
      </p>

      <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">Recognizing Tilt: Emotional Escalation</h2>
      <p className="text-muted-foreground leading-relaxed mb-4">
        Tilt is a term borrowed from poker that describes a state of emotional escalation where rational decision-making
        collapses. In trading, tilt typically follows a painful loss or a string of losses. The trader feels angry,
        frustrated, or desperate to recover losses, and begins taking trades that violate their rules. Revenge trading
        is the most common expression of tilt, where the trader immediately re-enters the market to win back what was
        lost.
      </p>
      <p className="text-muted-foreground leading-relaxed mb-4">
        The danger of tilt is that it compounds losses. One bad trade becomes three, then five. Position sizes increase.{' '}
        <Link to="/glossary#stop-loss" className="text-primary hover:text-primary/80">Stop losses</Link> get ignored
        or removed. By the time the trader regains composure, the damage to their account can be severe. Learning to
        recognize the early signs of tilt, such as elevated heart rate, frustration with the market, or the urge to
        immediately re-enter after a loss, is essential for long-term survival.
      </p>
      <p className="text-muted-foreground leading-relaxed mb-4">
        The most effective tilt prevention is a hard rule: after two consecutive losses, stop trading for the session.
        This is one of the{' '}
        <Link to="/blog/why-trading-rules-matter" className="text-primary hover:text-primary/80">trading rules that matter most</Link>.
        It removes the decision from the emotional moment and replaces it with a predetermined action.
      </p>

      <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">How Data Counters Bias</h2>
      <p className="text-muted-foreground leading-relaxed mb-4">
        Cognitive biases are invisible during live trading. Confirmation bias makes you see setups that match your
        existing position. Recency bias causes you to overweight recent trades when evaluating your strategy.
        Anchoring bias locks you into a price level and prevents you from adjusting when the market moves beyond it.
      </p>
      <p className="text-muted-foreground leading-relaxed mb-4">
        The antidote to bias is data. When you journal every trade and review your performance through{' '}
        <Link to="/blog/trading-analytics-find-edge" className="text-primary hover:text-primary/80">analytics</Link>,
        you replace feelings with facts. You might feel like you are terrible at trading on Fridays, but your data
        shows that Friday is actually your most profitable day. You might feel like a particular symbol always stops you
        out, but your journal shows a 62% win rate on that instrument. Data does not lie. Emotions do.
      </p>

      <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">Journaling Emotional State Per Trade</h2>
      <p className="text-muted-foreground leading-relaxed mb-4">
        One of the most powerful additions to a trading journal is a simple emotional state score. Before or after each
        trade, rate your emotional state on a scale of 1 to 5, where 1 represents calm and focused, and 5 represents
        highly emotional, anxious, or frustrated.
      </p>
      <ul className="list-disc pl-6 space-y-2 text-muted-foreground mb-6">
        <li><strong className="text-foreground">1 - Calm:</strong> Clear-headed, patient, following the plan without internal resistance.</li>
        <li><strong className="text-foreground">2 - Slightly alert:</strong> A minor emotional response, perhaps from a recent win or loss, but still in control.</li>
        <li><strong className="text-foreground">3 - Neutral with pressure:</strong> Aware of emotional pull but managing it. Common during volatile sessions.</li>
        <li><strong className="text-foreground">4 - Elevated:</strong> Noticeable anxiety, impatience, or excitement. Decision quality may be compromised.</li>
        <li><strong className="text-foreground">5 - Tilted:</strong> Full emotional escalation. Should not be trading at all.</li>
      </ul>
      <p className="text-muted-foreground leading-relaxed mb-4">
        This score takes five seconds to record but yields invaluable data over time. When you analyze 100 or more
        trades with emotion scores attached, you can see whether your win rate and average{' '}
        <Link to="/glossary#pnl" className="text-primary hover:text-primary/80">P&L</Link> change based on your
        emotional state at entry. Most traders find a stark correlation: trades taken at emotional level 1 or 2
        significantly outperform trades taken at level 4 or 5.
      </p>

      <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">Patterns Between Emotions and Outcomes</h2>
      <p className="text-muted-foreground leading-relaxed mb-4">
        After several weeks of journaling with emotion scores, you can run cross-tabulations that reveal hidden
        patterns. Common discoveries include: overtrading happens almost exclusively on days rated 4 or 5; your
        average hold time shortens when emotional, causing you to exit winners prematurely; you break more rules on
        afternoons after a losing morning; and your best trades consistently come from a calm, prepared state during
        the first hour of the session.
      </p>
      <p className="text-muted-foreground leading-relaxed mb-4">
        These patterns are actionable. If you know that your performance degrades after emotional level 3, you can set
        a rule to stop trading when you notice yourself reaching that threshold. If you know that your afternoon trades
        underperform, you can restrict your trading to the morning session. The{' '}
        <Link to="/blog/day-trading-journal" className="text-primary hover:text-primary/80">day trader's review cycle</Link>{' '}
        is the perfect framework for identifying these time-based emotional patterns.
      </p>

      <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">Building Emotional Discipline</h2>
      <p className="text-muted-foreground leading-relaxed mb-4">
        Emotional discipline is not about suppressing feelings. It is about creating systems that protect you from
        acting on them. The structure comes from three layers: prevention, detection, and recovery.
      </p>
      <p className="text-muted-foreground leading-relaxed mb-4">
        Prevention means having a complete trading plan with hard limits on daily losses and trade counts. Detection
        means tracking your emotional state on every trade so you can see when discipline is slipping. Recovery means
        having a protocol for what to do when you lose control, such as stepping away from the screen, reviewing your
        journal, or doing a brief physical activity to reset.
      </p>
      <p className="text-muted-foreground leading-relaxed mb-4">
        Over time, with consistent journaling and review, the emotional swings that used to derail your trading become
        smaller and less frequent. You do not become emotionless; you become aware. And awareness, paired with a set of
        protective rules, is the foundation of sustainable trading performance. The data in your journal is the proof
        that following your process works, and that proof reinforces the discipline to keep following it.
      </p>
    </>
  );
}
