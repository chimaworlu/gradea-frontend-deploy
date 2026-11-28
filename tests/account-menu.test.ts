import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { AccountMenu, AppTopBar } from "../components/app/AppTopBar";
import { avatarInitial, menuStep, signOut } from "../lib/auth/session";
import { getContent } from "../lib/content";

const text = getContent("shared/account-menu");
const user = {
  id: "u1",
  email: "someone@example.test",
  career_level: "mid" as const,
  subscription_status: "free" as const,
  subscription_plan: null,
  subscription_expires_at: null,
  grace_until: null,
  region: "nigeria" as const,
  role: "user" as const,
  created_at: "2026-11-01T00:00:00.000Z",
};

describe("S2 account menu", () => {
  it("opens and closes: Escape returns focus to the avatar, a click outside does not", () => {
    expect(menuStep({ open: false }, "toggle")).toEqual({ open: true, focusAvatar: false });
    expect(menuStep({ open: true }, "toggle")).toEqual({ open: false, focusAvatar: true });
    expect(menuStep({ open: true }, "escape")).toEqual({ open: false, focusAvatar: true });
    expect(menuStep({ open: true }, "outside")).toEqual({ open: false, focusAvatar: false });
    expect(menuStep({ open: true }, "tabAway")).toEqual({ open: false, focusAvatar: false });
  });

  it("shows the avatar when signed in and Log in for a guest", () => {
    const signedIn = renderToStaticMarkup(
      createElement(AppTopBar, { viewer: { kind: "signedIn", user } }),
    );
    expect(signedIn).toContain(`aria-label="${text.avatar.label}"`);
    expect(signedIn).toContain('aria-expanded="false"');
    expect(signedIn).toContain(`>${avatarInitial(user.email)}<`);
    expect(signedIn).not.toContain(`>${text.topBar.logIn}<`);

    const guest = renderToStaticMarkup(createElement(AppTopBar, { viewer: { kind: "guest" } }));
    expect(guest).toContain(`>${text.topBar.logIn}<`);
    expect(guest).not.toContain('aria-haspopup="menu"');
  });

  it("shows the email, the four later pages switched off, and Sign out on (B3 Avatar menu)", () => {
    const html = renderToStaticMarkup(
      createElement(AccountMenu, { email: user.email, initiallyOpen: true }),
    );
    expect(html).toContain(user.email);
    const items = [...html.matchAll(/<button[^>]*role="menuitem"[^>]*>.*?<\/button>/g)].map(
      ([item]) => item,
    );
    // All shown, none hidden, in the design's order.
    expect(items.map((item) => item.replace(/<[^>]+>/g, ""))).toEqual([
      text.menu.dashboard,
      text.menu.history,
      text.menu.profile,
      text.menu.billing,
      text.menu.signOut.default,
    ]);
    for (const off of items.slice(0, 4)) expect(off).toContain('aria-disabled="true"');
    expect(items[4]).not.toContain("aria-disabled");
    // A line under the email and one before Sign out.
    expect(html.match(/role="separator"|role="presentation"/g)).toHaveLength(2);
  });
});

describe("Sign out", () => {
  it("ends the session on the server, then goes to the guest upload page", async () => {
    const fetchFn = vi.fn<typeof fetch>(
      async () => new Response(JSON.stringify({ ok: true }), { status: 200 }),
    );
    const navigate = vi.fn();
    await signOut(navigate, fetchFn);
    const [url, init] = fetchFn.mock.calls[0] ?? [];
    expect(String(url)).toMatch(/\/api\/auth\/logout$/);
    expect(init?.method).toBe("POST");
    expect(init?.credentials).toBe("include");
    expect(navigate).toHaveBeenCalledWith("/upload");
  });

  it("stays put when the server could not end the session", async () => {
    const navigate = vi.fn();
    const result = await signOut(
      navigate,
      vi.fn<typeof fetch>(async () => {
        throw new TypeError("offline");
      }),
    );
    expect(result).toEqual({ kind: "network" });
    expect(navigate).not.toHaveBeenCalled();
  });
});
