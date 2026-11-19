import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { emptyDraft } from "@/lib/exercises/model";

vi.mock("@/lib/exercises/actions", () => ({ saveExerciseAction: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.hoisted(() => {
  process.env.NEXT_PUBLIC_IMAGE_UPLOADS = "false";
});

const { ExerciseEditor } = await import("./exercise-editor");

describe("ExerciseEditor without image uploads", () => {
  it("hides every image upload control", () => {
    const { container } = render(<ExerciseEditor exerciseId={null} initialDraft={emptyDraft()} subjects={[]} />);
    expect(container.querySelector('input[type="file"]')).toBeNull();
    expect(screen.queryByText("Adicionar imagens")).not.toBeInTheDocument();
  });
});
