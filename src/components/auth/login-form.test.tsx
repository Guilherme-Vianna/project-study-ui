import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const firebase = vi.hoisted(() => ({
  onAuthStateChanged: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
  signInWithPopup: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
  updateProfile: vi.fn(),
  signOut: vi.fn(),
}));
const router = vi.hoisted(() => ({ replace: vi.fn() }));
const session = vi.hoisted(() => ({ createServerSession: vi.fn() }));

vi.mock("firebase/auth", () => firebase);
vi.mock("next/navigation", () => ({ useRouter: () => router }));
vi.mock("@/lib/auth/client-session", () => session);
vi.mock("@/lib/firebase/client", () => ({
  isFirebaseConfigured: () => true,
  getFirebaseAuth: () => ({}),
  createGoogleProvider: () => ({}),
}));

const { LoginForm } = await import("./login-form");

const user = { uid: "u1" };

function renderSignedOut() {
  firebase.onAuthStateChanged.mockImplementation((_auth, callback) => {
    queueMicrotask(() => callback(null));
    return vi.fn();
  });
  render(<LoginForm />);
  return screen.findByRole("button", { name: "Entrar com e-mail" });
}

describe("LoginForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    session.createServerSession.mockResolvedValue(undefined);
  });

  it("validates the fields before calling Firebase and focuses the first invalid one", async () => {
    const submit = await renderSignedOut();
    await userEvent.click(submit);

    expect(await screen.findByText("Digite seu e-mail.")).toBeInTheDocument();
    expect(screen.getByText("Digite sua senha.")).toBeInTheDocument();
    expect(screen.getByLabelText("E-mail")).toHaveFocus();
    expect(screen.getByLabelText("E-mail")).toHaveAttribute("aria-invalid", "true");
    expect(firebase.signInWithEmailAndPassword).not.toHaveBeenCalled();
  });

  it("signs in with email, creates the server session and opens the home page", async () => {
    firebase.signInWithEmailAndPassword.mockResolvedValue({ user });
    const submit = await renderSignedOut();

    await userEvent.type(screen.getByLabelText("E-mail"), " ana@exemplo.com ");
    await userEvent.type(screen.getByLabelText("Senha"), "segredo123");
    await userEvent.click(submit);

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/inicio"));
    expect(firebase.signInWithEmailAndPassword).toHaveBeenCalledWith({}, "ana@exemplo.com", "segredo123");
    expect(session.createServerSession).toHaveBeenCalledWith(user, true);
  });

  it("shows a recoverable message when the credentials are wrong", async () => {
    firebase.signInWithEmailAndPassword.mockRejectedValue({ code: "auth/invalid-credential" });
    const submit = await renderSignedOut();

    await userEvent.type(screen.getByLabelText("E-mail"), "ana@exemplo.com");
    await userEvent.type(screen.getByLabelText("Senha"), "errada");
    await userEvent.click(submit);

    expect(await screen.findByRole("alert")).toHaveTextContent("E-mail ou senha incorretos");
    expect(screen.getByLabelText("E-mail")).toHaveValue("ana@exemplo.com");
    expect(router.replace).not.toHaveBeenCalled();
  });

  it("creates an account with the display name", async () => {
    firebase.createUserWithEmailAndPassword.mockResolvedValue({ user });
    await renderSignedOut();

    await userEvent.click(screen.getByRole("button", { name: "Criar conta" }));
    await userEvent.type(screen.getByLabelText("Nome"), "Ana Souza");
    await userEvent.type(screen.getByLabelText("E-mail"), "ana@exemplo.com");
    await userEvent.type(screen.getByLabelText("Senha"), "123");
    await userEvent.click(screen.getByRole("button", { name: "Criar conta" }));

    expect(await screen.findByText("A senha precisa ter pelo menos 6 caracteres.")).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText("Senha"), "456");
    await userEvent.click(screen.getByRole("button", { name: "Criar conta" }));

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/inicio"));
    expect(firebase.updateProfile).toHaveBeenCalledWith(user, { displayName: "Ana Souza" });
  });

  it("signs in with Google and ignores a closed popup", async () => {
    firebase.signInWithPopup.mockRejectedValueOnce({ code: "auth/popup-closed-by-user" });
    await renderSignedOut();
    const google = screen.getByRole("button", { name: "Continuar com Google" });

    await userEvent.click(google);
    await waitFor(() => expect(google).toBeEnabled());
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();

    firebase.signInWithPopup.mockResolvedValueOnce({ user });
    await userEvent.click(google);
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/inicio"));
  });

  it("asks for the email before sending a password reset link", async () => {
    await renderSignedOut();
    await userEvent.click(screen.getByRole("button", { name: "Esqueceu a senha?" }));
    expect(await screen.findByText("Digite seu e-mail para receber o link de redefinição.")).toBeInTheDocument();
    expect(firebase.sendPasswordResetEmail).not.toHaveBeenCalled();

    firebase.sendPasswordResetEmail.mockResolvedValue(undefined);
    await userEvent.type(screen.getByLabelText("E-mail"), "ana@exemplo.com");
    await userEvent.click(screen.getByRole("button", { name: "Esqueceu a senha?" }));
    expect(await screen.findByRole("status")).toHaveTextContent("enviamos um link");
  });

  it("restores an existing Firebase session without asking for credentials", async () => {
    firebase.onAuthStateChanged.mockImplementation((_auth, callback) => {
      queueMicrotask(() => callback(user));
      return vi.fn();
    });
    render(<LoginForm />);

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/inicio"));
    expect(session.createServerSession).toHaveBeenCalledWith(user, true);
  });
});
