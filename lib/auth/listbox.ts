// Keyboard rules for a select-only combobox (the career level picker, A3 dev notes): arrow keys
// move, Enter or Space chooses, Escape closes without changing the value, Home and End jump,
// Tab chooses the highlighted option and moves on, and a letter jumps to the first option that
// starts with it. Kept free of React so the rules can be tested directly.

export type ListboxState = {
  open: boolean;
  /** The highlighted option while open, or -1 for none. */
  active: number;
};

export type ListboxStep = ListboxState & {
  /** The option to choose, when this key chooses one. */
  choose?: number;
  /** True when the key was handled, so the page must not also act on it (scrolling, submit). */
  handled: boolean;
};

export type ListboxKey = {
  key: string;
  altKey?: boolean;
};

/** The highlighted option when the list opens: the chosen one, or the first (last for Up). */
function openingIndex(selected: number, count: number, fromEnd: boolean): number {
  if (selected >= 0 && selected < count) return selected;
  return fromEnd ? count - 1 : 0;
}

export function listboxKey(
  state: ListboxState,
  event: ListboxKey,
  selected: number,
  labels: readonly string[],
): ListboxStep {
  const count = labels.length;
  const last = count - 1;

  if (!state.open) {
    switch (event.key) {
      case "ArrowDown":
      case "Enter":
      case " ":
        return { open: true, active: openingIndex(selected, count, false), handled: true };
      case "ArrowUp":
        return { open: true, active: openingIndex(selected, count, !event.altKey), handled: true };
      case "Home":
        return { open: true, active: 0, handled: true };
      case "End":
        return { open: true, active: last, handled: true };
      default: {
        const match = letterMatch(event.key, labels, selected);
        return match === undefined
          ? { ...state, handled: false }
          : { open: true, active: match, handled: true };
      }
    }
  }

  switch (event.key) {
    case "ArrowDown":
      return { open: true, active: Math.min(state.active + 1, last), handled: true };
    case "ArrowUp":
      if (event.altKey) return closeChoosing(state);
      return { open: true, active: Math.max(state.active - 1, 0), handled: true };
    case "Home":
      return { open: true, active: 0, handled: true };
    case "End":
      return { open: true, active: last, handled: true };
    case "Enter":
    case " ":
      return closeChoosing(state);
    case "Escape":
      return { open: false, active: -1, handled: true };
    case "Tab":
      // Chooses and lets focus move on as normal.
      return { ...closeChoosing(state), handled: false };
    default: {
      const match = letterMatch(event.key, labels, state.active);
      return match === undefined
        ? { ...state, handled: false }
        : { open: true, active: match, handled: true };
    }
  }
}

function closeChoosing(state: ListboxState): ListboxStep {
  return state.active >= 0
    ? { open: false, active: -1, choose: state.active, handled: true }
    : { open: false, active: -1, handled: true };
}

/** The next option after `from` whose label starts with the typed letter, wrapping round. */
function letterMatch(key: string, labels: readonly string[], from: number): number | undefined {
  if (key.length !== 1 || key.trim() === "") return undefined;
  const letter = key.toLocaleLowerCase("en-GB");
  for (let step = 1; step <= labels.length; step += 1) {
    const index = (from + step + labels.length) % labels.length;
    if (labels[index]?.toLocaleLowerCase("en-GB").startsWith(letter)) return index;
  }
  return undefined;
}
