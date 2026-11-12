import { forwardRef } from 'react';
import { AuthNotice } from '@/components/auth/AuthNotice';

export interface SummaryItem {
  /** Id of the invalid control, so the link can move focus to it. */
  fieldId?: string;
  label: string;
  message: string;
}

interface FormSummaryProps {
  /** A form-level failure that names no field: bold first line and body. */
  title?: string;
  message?: React.ReactNode;
  icon?: 'clock';
  items: SummaryItem[];
}

const lowerFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

/** Error notice above a form after a failed submit: it takes focus and links each invalid field (D.7). Sits in the page's `role="alert"` slot. */
export const FormSummary = forwardRef<HTMLDivElement, FormSummaryProps>(({ title, message, icon, items }, ref) => {
  if (!title && !message && items.length === 0) return null;
  const count = items.length;
  return (
    <AuthNotice ref={ref} tone="error" icon={icon} focusable title={title ?? (count === 1 ? '1 field needs attention' : `${count} fields need attention`)}>
      {message}
      {!title && count > 0 && (
        <ul>
          {items.map((it) => (
            <li key={it.label}>
              {it.fieldId ? (
                <a
                  href={`#${it.fieldId}`}
                  onClick={(e) => {
                    e.preventDefault();
                    document.getElementById(it.fieldId as string)?.focus();
                  }}
                >
                  {it.label}
                </a>
              ) : (
                <span>{it.label}</span>
              )}
              : {lowerFirst(it.message)}
            </li>
          ))}
        </ul>
      )}
    </AuthNotice>
  );
});
FormSummary.displayName = 'FormSummary';
