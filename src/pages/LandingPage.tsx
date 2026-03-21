import { Link } from "react-router-dom";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#07110c] text-white">
      <header className="border-b border-white/10 bg-[#121212]/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-400/30 bg-emerald-500/10">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                className="h-5 w-5 text-emerald-300"
              >
                <path d="M3 21h18" />
                <path d="M5 21V7l7-4 7 4v14" />
                <path d="M9 21v-6h6v6" />
                <path d="M10 9h4" />
                <path d="M12 7v4" />
              </svg>
            </div>

            <div>
              <h1 className="text-xl font-bold tracking-tight text-white">MedGhana</h1>
              <p className="text-xs text-white/50">Hospital management</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="rounded-lg px-4 py-2 text-sm font-medium text-white/85 transition hover:bg-white/5 hover:text-white"
            >
              Login
            </Link>

            <Link
              to="/create-hospital"
              className="rounded-lg bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-600"
            >
              Create Hospital
            </Link>
          </div>
        </div>
      </header>

      <section className="relative isolate overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1587351021759-3e566b6af7cc?auto=format&fit=crop&w=1600&q=80"
            alt="Hospital background"
            className="h-full w-full object-cover opacity-20"
          />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.22),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(245,158,11,0.18),transparent_30%)]" />
          <div className="absolute inset-0 bg-[#07110c]/80" />
        </div>

        <div className="relative mx-auto flex min-h-[calc(100vh-73px)] max-w-7xl items-center px-6 py-16 lg:px-8">
          <div className="grid w-full items-center gap-10 lg:grid-cols-2">
            <div className="mx-auto max-w-3xl text-center lg:mx-0 lg:text-left">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-amber-400/20 bg-amber-400/10 px-4 py-2 text-sm text-amber-200">
                <span>+</span>
                <span>Built for modern hospitals and clinics</span>
              </div>

              <h2 className="text-4xl font-extrabold leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl">
                Simple hospital management
                <span className="block text-amber-400">for modern healthcare teams</span>
              </h2>

              <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-white/75 lg:mx-0">
                Manage patients, appointments, departments, staff records, billing, admissions, pharmacy,
                laboratory, and reporting from one clean platform designed for hospitals, clinics, maternity homes,
                and diagnostic centres.
              </p>

              <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row lg:items-start">
                <Link
                  to="/create-hospital"
                  className="inline-flex min-w-[180px] items-center justify-center rounded-xl bg-amber-500 px-6 py-3.5 text-base font-semibold text-[#1b1204] transition hover:bg-amber-400"
                >
                  Create Hospital
                  <span className="ml-2">→</span>
                </Link>

                <Link
                  to="/login"
                  className="inline-flex min-w-[180px] items-center justify-center rounded-xl border border-white/15 bg-white/5 px-6 py-3.5 text-base font-semibold text-white transition hover:bg-white/10"
                >
                  Login
                </Link>
              </div>
            </div>

            <div className="hidden lg:flex lg:justify-end">
              <div className="w-full max-w-xl rounded-[28px] border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-md">
                <div className="rounded-[24px] border border-emerald-400/10 bg-[#0c1712]/90 p-6">
                  <div className="mb-6 flex items-center justify-between">
                    <div>
                      <p className="text-sm text-white/50">How MedGhana works</p>
                      <h3 className="text-2xl font-bold text-white">From arrival to payment</h3>
                    </div>
                    <div className="rounded-xl bg-emerald-500/10 px-3 py-1 text-sm text-emerald-300">MedGhana</div>
                  </div>

                  <div className="space-y-3">
                    {[
                      {
                        step: "01",
                        title: "Front desk intake",
                        description: "Register patients, confirm insurance, and book or check in visits from one queue.",
                      },
                      {
                        step: "02",
                        title: "Clinical workflow",
                        description: "Move patients into triage, consultation, laboratory, pharmacy, and admission workflows.",
                      },
                      {
                        step: "03",
                        title: "Billing and audit trail",
                        description: "Raise invoices, receive payments, and keep every hospital branch inside its own secure tenant.",
                      },
                    ].map((item) => (
                      <div key={item.step} className="rounded-2xl border border-white/8 bg-white/5 p-4">
                        <div className="flex items-start gap-4">
                          <div className="rounded-xl border border-amber-400/20 bg-amber-400/10 px-3 py-2 text-sm font-semibold text-amber-200">
                            {item.step}
                          </div>
                          <div>
                            <p className="font-semibold text-white">{item.title}</p>
                            <p className="mt-1 text-sm leading-6 text-white/65">{item.description}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-5 rounded-2xl border border-amber-400/10 bg-amber-400/5 p-4 text-sm leading-7 text-white/75">
                    Role-aware access for reception, nurses, doctors, pharmacy, laboratory, cashiers, and hospital administrators.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="relative pb-4 text-center">
        <Link to="/owner/login" className="text-[10px] text-white/20 transition hover:text-white/40">
          owner
        </Link>
      </div>
    </div>
  );
}
