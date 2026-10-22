import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ProfileFormState } from "@/lib/profile/action-state";
import { EMPTY_PROFILE } from "@/lib/profile/fields";
import { ProfileForm } from "./profile-form";

const fetchMock = vi.fn();

function renderForm(action = vi.fn<(state: ProfileFormState, data: FormData) => Promise<ProfileFormState>>()) {
  render(
    <ProfileForm
      action={action}
      initialValues={{ ...EMPTY_PROFILE, first_name: "Ana" }}
      today="2026-10-21"
      audience="Como seus alunos vão te ver"
      submitLabel="Criar perfil de professor"
      pendingLabel="Criando seu perfil…"
    />,
  );
  return action;
}

describe("ProfileForm", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("prefills the name and marks optional fields", () => {
    renderForm();
    expect(screen.getByLabelText("Nome")).toHaveValue("Ana");
    expect(screen.getByLabelText(/Celular/)).toBeInTheDocument();
    expect(screen.getAllByText("(opcional)")).toHaveLength(3);
  });

  it("validates before submitting and focuses the first invalid field", async () => {
    const action = renderForm();
    await userEvent.click(screen.getByRole("button", { name: "Criar perfil de professor" }));

    expect(screen.getByText("Digite seu sobrenome.")).toBeInTheDocument();
    expect(screen.getByLabelText("Sobrenome")).toHaveFocus();
    expect(action).not.toHaveBeenCalled();
  });

  it("masks phone and CEP and shows the address found", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ logradouro: "Avenida Paulista", bairro: "Bela Vista", localidade: "São Paulo", uf: "SP" })),
    );
    renderForm();

    await userEvent.type(screen.getByLabelText(/Celular/), "11987654321");
    await userEvent.type(screen.getByLabelText(/CEP/), "01310100");

    expect(screen.getByLabelText(/Celular/)).toHaveValue("(11) 98765-4321");
    expect(screen.getByLabelText(/CEP/)).toHaveValue("01310-100");
    expect(await screen.findByText("Avenida Paulista, Bela Vista, São Paulo – SP")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith("https://viacep.com.br/ws/01310100/json/", expect.anything());
  });

  it("submits the values and shows server errors next to the field", async () => {
    const action = renderForm(
      vi.fn(async () => ({
        fieldErrors: { mobile_phone: "Digite um celular com DDD, como (11) 98765-4321." },
        formError: "Revise os campos destacados e tente de novo.",
      })),
    );

    await userEvent.type(screen.getByLabelText("Sobrenome"), "Souza");
    await userEvent.type(screen.getByLabelText(/Celular/), "11987654321");
    await userEvent.click(screen.getByRole("button", { name: "Criar perfil de professor" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Revise os campos destacados");
    const submitted = action.mock.calls[0][1] as FormData;
    expect(submitted.get("last_name")).toBe("Souza");
    await waitFor(() => expect(screen.getByLabelText(/Celular/)).toHaveFocus());
    expect(screen.getByLabelText(/Celular/)).toHaveValue("(11) 98765-4321");
  });
});
