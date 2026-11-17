import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CareerLevelPicker } from "../components/auth/CareerLevelPicker";
import { PasswordField } from "../components/auth/FormPieces";
import { LoginForm } from "../components/auth/LoginForm";
import { SignupForm } from "../components/auth/SignupForm";
import { listboxKey, type ListboxState } from "../lib/auth/listbox";
import { getContent } from "../lib/content";

const forms = getContent("shared/forms");
const labels = ["Entry-level", "Mid-level", "Senior", "Executive"];
const closed: ListboxState = { open: false, active: -1 };
const at = (active: number): ListboxState => ({ open: true, active });

function picker(value: string, error?: string) {
  return renderToStaticMarkup(
    createElement(CareerLevelPicker, { id: "level", value, onValueChange: () => undefined, error }),
  );
}

describe("career level keys", () => {
  it("opens on Down, Enter or Space, on the chosen row or the first", () => {
    for (const key of ["ArrowDown", "Enter", " "]) {
      expect(listboxKey(closed, { key }, -1, labels)).toEqual({
        open: true,
        active: 0,
        handled: true,
      });
      expect(listboxKey(closed, { key }, 2, labels)).toMatchObject({ open: true, active: 2 });
    }
    expect(listboxKey(closed, { key: "ArrowUp" }, -1, labels)).toMatchObject({
      open: true,
      active: 3,
    });
  });

  it("moves with the arrows and stops at the ends, Home and End jump", () => {
    expect(listboxKey(at(0), { key: "ArrowDown" }, -1, labels).active).toBe(1);
    expect(listboxKey(at(3), { key: "ArrowDown" }, -1, labels).active).toBe(3);
    expect(listboxKey(at(1), { key: "ArrowUp" }, -1, labels).active).toBe(0);
    expect(listboxKey(at(0), { key: "ArrowUp" }, -1, labels).active).toBe(0);
    expect(listboxKey(at(1), { key: "End" }, -1, labels).active).toBe(3);
    expect(listboxKey(at(3), { key: "Home" }, -1, labels).active).toBe(0);
  });

  it("chooses with Enter or Space and closes", () => {
    expect(listboxKey(at(2), { key: "Enter" }, -1, labels)).toEqual({
      open: false,
      active: -1,
      choose: 2,
      handled: true,
    });
    expect(listboxKey(at(1), { key: " " }, -1, labels).choose).toBe(1);
  });

  it("closes with Escape without choosing", () => {
    const step = listboxKey(at(2), { key: "Escape" }, 0, labels);
    expect(step).toEqual({ open: false, active: -1, handled: true });
    expect(step.choose).toBeUndefined();
  });

  it("chooses on Tab but lets focus move on", () => {
    expect(listboxKey(at(1), { key: "Tab" }, -1, labels)).toMatchObject({
      open: false,
      choose: 1,
      handled: false,
    });
    expect(listboxKey(closed, { key: "Tab" }, -1, labels).handled).toBe(false);
  });

  it("jumps to the next row starting with a typed letter", () => {
    expect(listboxKey(at(0), { key: "s" }, -1, labels).active).toBe(2);
    expect(listboxKey(at(2), { key: "E" }, -1, labels).active).toBe(3);
    expect(listboxKey(at(3), { key: "e" }, -1, labels).active).toBe(0);
    expect(listboxKey(at(0), { key: "z" }, -1, labels)).toMatchObject({
      active: 0,
      handled: false,
    });
  });
});

describe("career level picker markup", () => {
  it("is a labelled combobox with a listbox of the four levels from the content file", () => {
    const html = picker("");
    expect(html).toContain('role="combobox"');
    expect(html).toContain('aria-haspopup="listbox"');
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain('aria-controls="level-list"');
    expect(html).toContain('aria-labelledby="level-label level"');
    expect(html).toContain(`>${forms.careerLevel.label}</label>`);
    expect(html).toContain(forms.careerLevel.placeholder);
    expect(html).toMatch(/<ul[^>]*role="listbox"[^>]*hidden=""/);
    expect(html.match(/role="option"/g)).toHaveLength(4);
    for (const label of Object.values(forms.careerLevel.options)) expect(html).toContain(label);
    // A custom list, not a native select.
    expect(html).not.toContain("<select");
  });

  it("marks the chosen level and shows it in the field", () => {
    const html = picker("senior");
    expect(html).toMatch(/id="level-option-senior"[^>]*aria-selected="true"/);
    expect(html.match(/aria-selected="true"/g)).toHaveLength(1);
    expect(html).toMatch(
      new RegExp(`role="combobox"[^>]*>${forms.careerLevel.options.senior}</button>`),
    );
  });

  it("shows the error under the field and links it", () => {
    const html = picker("", "Choose your career level.");
    expect(html).toContain('aria-invalid="true"');
    expect(html).toContain('aria-describedby="level-error"');
    expect(html).toContain('id="level-error"');
    expect(html).toContain("Choose your career level.");
  });

  it("is the picker the sign-up form uses", () => {
    expect(renderToStaticMarkup(createElement(SignupForm))).toContain(
      'id="signup-career-level-list"',
    );
    const source = readFileSync(join(__dirname, "../components/auth/SignupForm.tsx"), "utf8");
    expect(source).toContain('import { CareerLevelPicker } from "./CareerLevelPicker";');
  });
});

describe("password show and hide", () => {
  it("starts hidden, with the crossed-out eye and the label that says it will show the password", () => {
    const html = renderToStaticMarkup(
      createElement(PasswordField, {
        id: "pw",
        label: "Password",
        value: "",
        onValueChange: () => undefined,
        autoComplete: "new-password",
      }),
    );
    expect(html).toMatch(/<input[^>]*type="password"/);
    expect(html).not.toMatch(/<input[^>]*type="text"/);
    expect(html).toContain(`aria-label="${forms.passwordToggle.show}"`);
    expect(html).toContain('aria-controls="pw"');
    // The label alone says what a press does; aria-pressed would say it twice.
    expect(html).not.toContain("aria-pressed");
    // State convention: the crossed-out eye (its slash) while hidden, not the open eye (its pupil).
    expect(html).toContain('d="m2 2 20 20"');
    expect(html).not.toContain("<circle");
  });

  it("shows the state on every password field: sign up and log in", () => {
    for (const html of [
      renderToStaticMarkup(createElement(SignupForm)),
      renderToStaticMarkup(createElement(LoginForm, {})),
    ]) {
      expect(html).toMatch(/<input[^>]*type="password"/);
      expect(html).toContain(`aria-label="${forms.passwordToggle.show}"`);
      expect(html).toContain('d="m2 2 20 20"');
      expect(html).not.toContain("<circle");
    }
  });

  it("pairs each state with its icon, type and label", () => {
    const source = readFileSync(join(__dirname, "../components/auth/FormPieces.tsx"), "utf8");
    // Hidden: type=password, crossed-out eye, "Show password". Visible: type=text, open eye, "Hide password".
    expect(source).toContain('type={shown ? "text" : "password"}');
    expect(source).toContain('<FieldIcon name={shown ? "eye" : "eyeOff"} />');
    expect(source).toContain("aria-label={shown ? toggle.hide : toggle.show}");
    expect(source).toContain("useState(false)");
  });
});
