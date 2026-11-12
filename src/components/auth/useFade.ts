import { createContext, useContext, useState } from 'react';

/** True once the frame has painted; content mounted before that is on screen at first paint and must not animate (DESIGN-AUTH M1). */
export const ReadyContext = createContext(false);

/** `fade` for content that appears after the first paint (a view change, a notice), nothing for what is already there. */
export function useFade(): string | undefined {
  const ready = useContext(ReadyContext);
  const [fade] = useState(ready);
  return fade ? 'fade' : undefined;
}
