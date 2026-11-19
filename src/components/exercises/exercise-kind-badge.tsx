import { exerciseKindLabel, questionCountLabel, type ExerciseType } from "@/lib/exercises/model";

const tones: Record<string, string> = {
  multiple_choice: "bg-primary-soft text-primary",
  open_answer: "bg-accent-soft text-accent-strong",
  mixed: "bg-success-soft text-success-strong",
};

export function ExerciseKindBadge({ types, questionCount }: { types: ExerciseType[]; questionCount: number }) {
  const tone = types.length === 1 ? tones[types[0]] : tones.mixed;
  return (
    <>
      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${tone}`}>{exerciseKindLabel(types)}</span>
      {questionCount > 1 && <span className="text-xs text-muted">{questionCountLabel(questionCount)}</span>}
    </>
  );
}
