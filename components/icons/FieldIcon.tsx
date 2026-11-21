import styles from "./icon.module.css";

export type FieldIconName =
  | "eye"
  | "eyeOff"
  | "chevronDown"
  | "chevronUp"
  | "check"
  | "circleCheck"
  | "upload"
  | "file"
  | "alert"
  | "close"
  | "lock"
  | "loader"
  | "logOut"
  | "circle"
  | "clock";

/**
 * Lucide outline icons at 1.5px stroke (design tokens "icons"): eye, eye-off, chevron-down,
 * chevron-up, check, circle-check, upload, file-text, circle-alert, x, lock, loader-circle, log-out, circle and clock.
 * Decorative only: the control around an icon carries the accessible name.
 */
export function FieldIcon({ name, className }: { name: FieldIconName; className?: string }) {
  return (
    <svg
      className={className ?? styles.icon}
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
      {name === "chevronUp" && <path d="m18 15-6-6-6 6" />}
      {name === "check" && <path d="M20 6 9 17l-5-5" />}
      {name === "circleCheck" && (
        <>
          <circle cx="12" cy="12" r="10" />
          <path d="m9 12 2 2 4-4" />
        </>
      )}
      {name === "upload" && (
        <>
          <path d="M12 3v12" />
          <path d="m17 8-5-5-5 5" />
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        </>
      )}
      {name === "file" && (
        <>
          <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
          <path d="M14 2v4a2 2 0 0 0 2 2h4" />
          <path d="M10 9H8" />
          <path d="M16 13H8" />
          <path d="M16 17H8" />
        </>
      )}
      {name === "alert" && (
        <>
          <circle cx="12" cy="12" r="10" />
          <path d="M12 8v4" />
          <path d="M12 16h.01" />
        </>
      )}
      {name === "close" && (
        <>
          <path d="M18 6 6 18" />
          <path d="m6 6 12 12" />
        </>
      )}
      {name === "lock" && (
        <>
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </>
      )}
      {name === "loader" && <path d="M21 12a9 9 0 1 1-6.219-8.56" />}
      {name === "circle" && <circle cx="12" cy="12" r="10" />}
      {name === "clock" && (
        <>
          <circle cx="12" cy="12" r="10" />
          <path d="M12 6v6l4 2" />
        </>
      )}
      {name === "logOut" && (
        <>
          <path d="m16 17 5-5-5-5" />
          <path d="M21 12H9" />
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
        </>
      )}
    </svg>
  );
}
