import { Stage } from './kit/stage';
import { DashboardWindow, type DashboardWindowProps } from './DashboardWindow';
import './look.css';
import './dashboard-stage.css';

/**
 * The still dashboard framed as a stageshow stage for the landing story ("pinned, bottom bleed"): title, scope and
 * stats whole, the equity and month panels running off the bottom (wide 900 × 520, compact 358 × 500). The auth pane
 * uses DashboardWindow directly, which reflows instead.
 */
export function DashboardStage({ focus }: Pick<DashboardWindowProps, 'focus'>) {
  return (
    <Stage width={900} height={520} compact={{ below: 560, width: 358, height: 500 }} theme="dark" className="tq-look ds-demo">
      {(_s, _rect, layout) => (
        <div className="ss-window ds-window" style={{ width: layout === 'compact' ? 358 : 900 }}>
          <DashboardWindow focus={focus} />
        </div>
      )}
    </Stage>
  );
}
