export default function Home() {
  return (
    <main className="min-h-screen bg-[#f6f8f5] text-slate-950">
      <section className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-5 py-6 sm:px-8 lg:px-10">
        <header className="flex items-center justify-between border-b border-slate-200 pb-5">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-emerald-700">
              ECC Fantasy League
            </p>
            <h1 className="mt-1 text-2xl font-semibold sm:text-3xl">
              Cricket Fantasy Dashboard
            </h1>
          </div>
          <span className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-800">
            Foundation
          </span>
        </header>

        <div className="grid flex-1 gap-5 py-6 lg:grid-cols-[1.5fr_1fr]">
          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-1">
              <p className="text-sm font-medium text-slate-500">
                Current round
              </p>
              <h2 className="text-xl font-semibold">Setup in progress</h2>
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {[
                ["Round points", "-"],
                ["Total points", "-"],
                ["Overall rank", "-"],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-md border border-slate-200 bg-slate-50 p-4"
                >
                  <p className="text-sm text-slate-500">{label}</p>
                  <p className="mt-2 text-2xl font-semibold">{value}</p>
                </div>
              ))}
            </div>
            <div className="mt-6 rounded-md border border-dashed border-slate-300 p-5">
              <p className="font-medium">Next implementation slice</p>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                Backend scaffolding, Prisma schema, environment examples, and
                health checks come first. Fantasy rules will stay centralised
                until squad size, budget, transfer limits, and scoring are
                confirmed.
              </p>
            </div>
          </section>

          <aside className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold">MVP Modules</h2>
            <div className="mt-4 space-y-3">
              {[
                "Authentication",
                "Players",
                "Seasons and rounds",
                "Lineup snapshots",
                "Scoring recalculation",
                "Leaderboards",
                "Admin workflows",
              ].map((item) => (
                <div
                  key={item}
                  className="flex items-center justify-between border-b border-slate-100 pb-3 text-sm last:border-0 last:pb-0"
                >
                  <span>{item}</span>
                  <span className="text-slate-400">Queued</span>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
