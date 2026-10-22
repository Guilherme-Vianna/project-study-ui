export function NoPlan() {
  return (
    <div className="rounded-3xl border border-dashed border-border-strong/60 bg-surface p-8 sm:p-10">
      <h2 className="text-xl font-semibold text-ink">Você ainda não tem um plano de estudo</h2>
      <p className="mt-2 max-w-xl text-muted">
        Quando seu professor atribuir um plano, as metas da semana e os exercícios aparecem aqui. Se você ainda não tem professor,
        peça a ele o link de convite.
      </p>
    </div>
  );
}
