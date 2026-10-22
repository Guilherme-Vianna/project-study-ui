import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ submitAttemptAction: vi.fn() }));
vi.mock("@/lib/attempts/actions", () => ({ submitAttemptAction: mocks.submitAttemptAction }));

const { AttemptForm } = await import("./attempt-form");

const options = [
  { id: "o1", text: "1/2", image: null },
  { id: "o2", text: "1", image: null },
];

describe("AttemptForm", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("prefills the estimated time and sends an open answer", async () => {
    mocks.submitAttemptAction.mockResolvedValue({ ok: true });
    render(<AttemptForm exerciseId="e1" type="open_answer" estimatedHours={0.5} options={[]} attemptsCount={0} />);
    expect(screen.getByLabelText(/Quanto tempo você estudou/)).toHaveValue("0,5");
    await userEvent.type(screen.getByLabelText("Sua resposta"), "sen 30° = 1/2");
    await userEvent.click(screen.getByRole("button", { name: "Enviar resposta" }));

    await waitFor(() =>
      expect(mocks.submitAttemptAction).toHaveBeenCalledWith(
        "e1",
        { type: "open_answer", estimatedHours: 0.5 },
        { answerText: "sen 30° = 1/2", selectedOptionIds: [], spentHours: "0,5" },
      ),
    );
    expect(await screen.findByText(/Resposta enviada!/)).toBeInTheDocument();
    expect(screen.getByLabelText("Sua resposta")).toHaveValue("");
  });

  it("asks for the time when the exercise has no estimate", async () => {
    render(<AttemptForm exerciseId="e1" type="open_answer" estimatedHours={null} options={[]} attemptsCount={0} />);
    await userEvent.type(screen.getByLabelText("Sua resposta"), "texto");
    await userEvent.click(screen.getByRole("button", { name: "Enviar resposta" }));
    expect(screen.getByText("Informe quanto tempo você estudou.")).toBeInTheDocument();
    expect(mocks.submitAttemptAction).not.toHaveBeenCalled();
  });

  it("requires choosing an option and shows the API conflict for a second try", async () => {
    mocks.submitAttemptAction.mockResolvedValue({ ok: false, errors: {}, formError: "Você já respondeu este exercício." });
    render(<AttemptForm exerciseId="e1" type="multiple_choice" estimatedHours={1} options={options} attemptsCount={0} />);
    await userEvent.click(screen.getByRole("button", { name: "Enviar resposta" }));
    expect(screen.getByText("Escolha pelo menos uma alternativa.")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("checkbox", { name: /Alternativa A/ }));
    await userEvent.click(screen.getByRole("button", { name: "Enviar resposta" }));
    await waitFor(() => expect(mocks.submitAttemptAction.mock.calls[0][2].selectedOptionIds).toEqual(["o1"]));
    expect(await screen.findByText("Você já respondeu este exercício.")).toBeInTheDocument();
  });
});
