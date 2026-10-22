const subjects = [
  { name: "Matemática", done: 3, target: 4 },
  { name: "Português", done: 2, target: 3 },
  { name: "Física", done: 1, target: 2 },
];

export function StudyPreview() {
  return (
    <div
      aria-hidden="true"
      className="relative flex h-full min-h-[560px] items-center justify-center overflow-hidden rounded-[2rem] bg-ink p-10"
    >
      <div className="absolute -top-24 -right-24 size-80 rounded-full bg-primary/30 blur-3xl" />
      <div className="absolute -bottom-32 -left-16 size-80 rounded-full bg-success/20 blur-3xl" />

      <div className="relative w-full max-w-md -rotate-2 space-y-4">
        <div className="rounded-3xl bg-surface p-6 shadow-2xl shadow-black/40">
          <p className="text-sm text-muted">Olá, Ana</p>
          <p className="text-xl font-semibold text-ink">Seu plano desta semana</p>

          <ul className="mt-6 space-y-4">
            {subjects.map((subject) => (
              <li key={subject.name}>
                <div className="flex justify-between text-sm">
                  <span className="font-medium text-ink">{subject.name}</span>
                  <span className="text-muted">
                    {subject.done}h de {subject.target}h
                  </span>
                </div>
                <div className="mt-2 h-2 rounded-full bg-canvas">
                  <div
                    className="h-2 rounded-full bg-primary"
                    style={{ width: `${(subject.done / subject.target) * 100}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="ml-auto flex w-fit translate-x-6 gap-3">
          <div className="rounded-2xl bg-surface px-4 py-3 shadow-xl shadow-black/30">
            <p className="text-xs text-muted">Sequência</p>
            <p className="flex items-center gap-2 font-semibold text-ink">
              <span className="size-2.5 rounded-full bg-success" />5 dias seguidos
            </p>
          </div>
          <div className="rounded-2xl bg-surface px-4 py-3 shadow-xl shadow-black/30">
            <p className="text-xs text-muted">Revisões pendentes</p>
            <p className="flex items-center gap-2 font-semibold text-ink">
              <span className="size-2.5 rounded-full bg-accent" />3 exercícios
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
