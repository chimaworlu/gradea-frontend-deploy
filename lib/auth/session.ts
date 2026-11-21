import { apiRequest, type ApiResult } from "../api/client";
import { LogoutResponse } from "../api/shared";
import { UPLOAD_PATH } from "../scan/upload";
import { clearWaitingScan } from "../scan/waiting-scan";

// The signed-in top bar's account menu (S2). Sign out ends the session on the server, which
// clears the httpOnly cookie and ends every token issued before (SRS Section 5), then the
// person lands on the guest upload page.

/** The avatar's letter: the first letter of the email, as the API sends no name. */
export function avatarInitial(email: string): string {
  const first = email.trim().charAt(0);
  return first === "" ? "" : first.toLocaleUpperCase("en-GB");
}

export function logOut(fetchFn?: typeof fetch): Promise<ApiResult<LogoutResponse>> {
  return apiRequest({
    method: "POST",
    path: "/api/auth/logout",
    response: LogoutResponse,
    fetchFn,
  });
}

/**
 * Signs out, then goes to the guest upload page. Any waiting guest scan in this tab is dropped
 * too. On a failure nothing moves, so the caller can show the error and the person stays signed
 * in rather than being told they left.
 */
export async function signOut(
  navigate: (path: string) => void,
  fetchFn?: typeof fetch,
): Promise<ApiResult<LogoutResponse>> {
  const result = await logOut(fetchFn);
  if (result.kind === "ok") {
    clearWaitingScan();
    navigate(UPLOAD_PATH);
  }
  return result;
}

/** The account menu's open state, kept free of React so its rules can be tested directly. */
export type MenuState = { open: boolean };
export type MenuEvent = "toggle" | "escape" | "outside" | "tabAway";

/** Escape, a click outside and tabbing away all close it; only Escape returns focus to the avatar. */
export function menuStep(state: MenuState, event: MenuEvent): MenuState & { focusAvatar: boolean } {
  if (event === "toggle") return { open: !state.open, focusAvatar: state.open };
  return { open: false, focusAvatar: event === "escape" && state.open };
}
