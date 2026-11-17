import styles from "./icon.module.css";

export type FieldIconName = "eye" | "eyeOff" | "chevronDown";

/**
 * Lucide outline icons at 1.5px stroke (design tokens "icons"): eye, eye-off and chevron-down.
 * Decorative only: the control around an icon carries the accessible name.
 */
export function FieldIcon({ name }: { name: FieldIconName }) {
  return (
    <svg
      className={styles.icon}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {name === "eye" && (
        <>
          <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" />
          <circle cx="12" cy="12" r="3" />
        </>
      )}
      {name === "eyeOff" && (
        <>
          <path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49" />
          <path d="M14.084 14.158a3 3 0 0 1-4.242-4.242" />
          <path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143" />
          <path d="m2 2 20 20" />
        </>
      )}
      {name === "chevronDown" && <path d="m6 9 6 6 6-6" />}
    </svg>
  );
}
