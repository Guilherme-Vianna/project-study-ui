import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  signOut: vi.fn(),
  destroyServerSession: vi.fn(),
  router: { replace: vi.fn() },
}));

vi.mock("firebase/auth", () => ({ signOut: mocks.signOut }));
vi.mock("next/navigation", () => ({ useRouter: () => mocks.router }));
vi.mock("@/lib/auth/client-session", () => ({ destroyServerSession: mocks.destroyServerSession }));
vi.mock("@/lib/firebase/client", () => ({ isFirebaseConfigured: () => true, getFirebaseAuth: () => ({}) }));

const { AccountMenu } = await import("./account-menu");
const { initialsOf } = await import("@/lib/people");

function renderMenu() {
  render(<AccountMenu name="Guilherme Vianna" email="gui@exemplo.com" roleLabel="Professor" />);
  return screen.getByRole("button", { name: /Abrir menu da conta/ });
}

describe("AccountMenu", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("builds initials from first and last name", () => {
    expect(initialsOf("Guilherme de Souza Vianna")).toBe("GV");
    expect(initialsOf("Ana")).toBe("A");
  });

  it("opens with the account details and focuses the first item", async () => {
    const trigger = renderMenu();
    expect(trigger).toHaveAttribute("aria-expanded", "false");

    await userEvent.click(trigger);

    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("menu")).toHaveTextContent("gui@exemplo.com");
    expect(screen.getByRole("menuitem", { name: "Meu perfil" })).toHaveAttribute("href", "/perfil");
    await waitFor(() => expect(screen.getByRole("menuitem", { name: "Meu perfil" })).toHaveFocus());
  });

  it("supports arrow keys and closes on Escape returning focus", async () => {
    const trigger = renderMenu();
    trigger.focus();
    await userEvent.keyboard("{ArrowDown}");
    await waitFor(() => expect(screen.getByRole("menuitem", { name: "Meu perfil" })).toHaveFocus());

    await userEvent.keyboard("{ArrowDown}");
    expect(screen.getByRole("menuitem", { name: "Sair" })).toHaveFocus();

    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("closes when clicking outside", async () => {
    const trigger = renderMenu();
    await userEvent.click(trigger);
    await userEvent.click(document.body);
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("signs out of Firebase and the server session", async () => {
    await userEvent.click(renderMenu());
    await userEvent.click(screen.getByRole("menuitem", { name: "Sair" }));

    await waitFor(() => expect(mocks.router.replace).toHaveBeenCalledWith("/"));
    expect(mocks.signOut).toHaveBeenCalled();
    expect(mocks.destroyServerSession).toHaveBeenCalled();
  });
});
