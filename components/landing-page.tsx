import Image from "next/image"
import Link from "next/link"
import { ArrowRight, CheckCircle2, GraduationCap, MapPin, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { LandingHeaderActions } from "@/components/landing-header-actions"

const highlights = [
  {
    title: "Rubrics in minutes",
    description: "Generate clear, consistent rubrics and reuse them across courses and programs.",
  },
  {
    title: "Faster feedback",
    description: "Review submissions with AI assistance so instructors can focus on coaching.",
  },
  {
    title: "Transparent grading",
    description: "Track scoring decisions and keep students aligned with expectations.",
  },
]

const steps = [
  {
    title: "Upload submissions",
    description: "Drag in PDFs or docs and keep every student response organized.",
  },
  {
    title: "Build the rubric",
    description: "Shape criteria once and apply it across assignments and sections.",
  },
  {
    title: "Grade with confidence",
    description: "Review AI suggestions, add notes, and publish final results.",
  },
]

const impact = [
  {
    label: "Less time per submission",
    value: "-45%",
    detail: "Designed to cut manual grading steps for busy instructors.",
  },
  {
    label: "Rubric reuse",
    value: "3x",
    detail: "Reuse the same rubric across multiple cohorts and semesters.",
  },
  {
    label: "Feedback clarity",
    value: "+60%",
    detail: "Clear criteria help students understand what to improve next.",
  },
]

const teamMembers = [
  {
    name: "Nita Thaveesittikullarp",
    role: "Software Engineer",
    bio: "IS and CS at CMU, Ex-Apple SWE",
    image: "/landing/nita-thaveesittikullarp.jpg",
  },
  {
    name: "Kester Tan",
    role: "Software Engineer",
    bio: "IS and CS at CMU, Ex-Microsoft, Amazon SWE, Ex-Autolab Project Lead",
    image: "/landing/kester-tan.jpg",
  },
  {
    name: "Vicky Chen",
    role: "Software Engineer",
    bio: "IS, Software Engineering and HCI at CMU, Ex-Discover SWE",
    image: "/landing/vicky-chen.jpg",
  },
  {
    name: "Scarlett Huang",
    role: "Software Engineer",
    bio: "IS and CS at CMU, Ex-Tiktok SWE",
    image: "/landing/scarlett-huang.jpg",
  },
  {
    name: "Preeya Kirani",
    role: "Software Engineer",
    bio: "IS and AI at CMU, Ex-Ema AI Engineer",
    image: "/landing/preeya-kirani.jpg",
  },
  {
    name: "Rong Yuan",
    role: "Software Engineer",
    bio: "IS and HCI at CMU, Ex-Alibaba AI Engineer",
    image: "/landing/rong-yuan.jpg",
  },
]

const faqs = [
  {
    question: "Who is Gradient built for?",
    answer:
      "Educators, instructional teams, and training programs that need faster grading with consistent feedback.",
  },
  {
    question: "Does Gradient replace instructors?",
    answer:
      "No. The product supports instructors with AI suggestions while keeping final decisions in human hands.",
  },
  {
    question: "Can I start today?",
    answer:
      "Yes. Create an account, upload a sample submission, and explore the workflow in minutes.",
  },
]

export function LandingPage() {
  const contactEmail = process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "hello@gradient.education"

  return (
    <main className="bg-[#f7f4ef] text-foreground">
      <div className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-32 top-20 size-[420px] rounded-full bg-[#f0c2a0]/40 blur-3xl" />
          <div className="absolute right-0 top-0 size-[380px] rounded-full bg-[#9bb7ff]/45 blur-3xl" />
        </div>

        <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between gap-6 px-6 py-6">
          <div className="flex items-center gap-3">
            <div className="rounded-md bg-[#122c54]/10 p-1.5">
              <GraduationCap className="size-5 text-[#122c54]" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Gradient</p>
              <p className="font-display text-lg">AI grading built for Pittsburgh</p>
            </div>
          </div>
          <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
            <a href="#features" className="transition-colors hover:text-foreground">
              Features
            </a>
            <a href="#how-it-works" className="transition-colors hover:text-foreground">
              How it works
            </a>
            <a href="#pittsburgh" className="transition-colors hover:text-foreground">
              Pittsburgh
            </a>
            <a href="#team" className="transition-colors hover:text-foreground">
              Team
            </a>
          </nav>
          <LandingHeaderActions />
        </header>

        <section className="relative z-10 mx-auto grid w-full max-w-6xl items-center gap-12 px-6 pb-20 pt-10 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <Badge className="w-fit rounded-full bg-white/70 px-4 py-1 text-xs font-semibold uppercase text-[#122c54]">
              Built for Pittsburgh educators
            </Badge>
            <h1 className="font-display text-4xl leading-tight text-[#122c54] md:text-5xl">
              Grade smarter, share clearer feedback, and give Pittsburgh students more time to grow.
            </h1>
            <p className="font-body text-lg text-muted-foreground">
              Gradient helps instructors at Pittsburgh schools, bootcamps, and community programs create
              consistent rubrics and streamline grading without losing the human touch.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <Button asChild className="rounded-full bg-[#122c54] text-white hover:bg-[#0f2341]">
                <Link href="/login" aria-label="Create an account">
                  Get started free
                  <ArrowRight className="ml-2 size-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="rounded-full border-[#122c54] text-[#122c54]">
                <a href="#contact">Request a pilot</a>
              </Button>
            </div>
            <div className="grid gap-4 pt-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/60 bg-white/70 p-4">
                <p className="text-xs uppercase text-muted-foreground">Time saved</p>
                <p className="font-display text-2xl text-[#122c54]">Up to 45%</p>
              </div>
              <div className="rounded-2xl border border-white/60 bg-white/70 p-4">
                <p className="text-xs uppercase text-muted-foreground">Rubric reuse</p>
                <p className="font-display text-2xl text-[#122c54]">3x faster</p>
              </div>
              <div className="rounded-2xl border border-white/60 bg-white/70 p-4">
                <p className="text-xs uppercase text-muted-foreground">Student clarity</p>
                <p className="font-display text-2xl text-[#122c54]">+60%</p>
              </div>
            </div>
          </div>
          <div className="relative">
            <div className="rounded-[32px] border border-white/70 bg-white/80 p-4 shadow-xl">
              <div className="relative h-[420px] overflow-hidden rounded-[24px] bg-[#122c54]">
                <Image
                  src="/landing/hero-pittsburgh.jpg"
                  alt="Pittsburgh skyline at sunrise"
                  fill
                  sizes="(max-width: 1024px) 100vw, 45vw"
                  className="object-cover"
                  priority
                />
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl bg-[#122c54] px-4 py-3 text-sm text-white">
                  "Feedback that students can act on right away."
                </div>
                <div className="rounded-2xl border border-[#122c54]/20 px-4 py-3 text-sm text-[#122c54]">
                  "Grading finally feels predictable again."
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      <section id="features" className="mx-auto w-full max-w-6xl px-6 pb-20">
        <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="space-y-4">
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Product highlights</p>
            <h2 className="font-display text-3xl text-[#122c54]">
              Every rubric, every submission, every insight in one place.
            </h2>
            <p className="font-body text-muted-foreground">
              Gradient blends AI assistance with instructor oversight so grading stays fast,
              transparent, and consistent across your team.
            </p>
            <Button asChild className="rounded-full bg-[#122c54] text-white hover:bg-[#0f2341]">
              <Link href="/login">Explore the web app</Link>
            </Button>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {highlights.map((highlight) => (
              <div key={highlight.title} className="rounded-2xl border border-white/70 bg-white/70 p-4">
                <h3 className="font-display text-lg text-[#122c54]">{highlight.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{highlight.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="bg-white/70">
        <div className="mx-auto w-full max-w-6xl px-6 py-20">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">How it works</p>
              <h2 className="font-display text-3xl text-[#122c54]">Three steps to a faster review cycle.</h2>
            </div>
            <Badge className="rounded-full bg-[#122c54] text-white">Live prototype available</Badge>
          </div>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {steps.map((step, index) => (
              <div key={step.title} className="rounded-3xl border border-[#122c54]/10 bg-white p-6">
                <p className="font-display text-4xl text-[#122c54]">0{index + 1}</p>
                <h3 className="mt-3 font-display text-xl text-[#122c54]">{step.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="impact" className="mx-auto w-full max-w-6xl px-6 py-20">
        <div className="grid gap-10 lg:grid-cols-[1fr_1fr]">
          <div className="space-y-4">
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Impact</p>
            <h2 className="font-display text-3xl text-[#122c54]">Less grading time. More teaching time.</h2>
            <p className="font-body text-muted-foreground">
              From after-school programs to university instructors, the Pittsburgh community needs
              tools that respect limited time and support clear feedback loops.
            </p>
            <div className="grid gap-4">
              {impact.map((item) => (
                <div key={item.label} className="flex items-start gap-4 rounded-2xl bg-white/70 p-4">
                  <div className="rounded-full bg-[#122c54] px-3 py-1 text-xs font-semibold text-white">
                    {item.value}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#122c54]">{item.label}</p>
                    <p className="text-sm text-muted-foreground">{item.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-4">
            <div className="rounded-[28px] border border-white/70 bg-white/80 p-6">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-full bg-[#122c54] text-white">
                  <Zap className="size-5" />
                </div>
                <h3 className="font-display text-xl text-[#122c54]">Built for accountability</h3>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">
                Every AI suggestion is traceable to rubric criteria so educators can explain grades
                clearly to students, families, and administrators.
              </p>
              <div className="mt-6 grid gap-3">
                {[
                  "Instructor sign-off before publishing grades",
                  "Reusable criteria libraries per course or program",
                  "Feedback summaries that students can act on",
                ].map((item) => (
                  <div key={item} className="flex items-center gap-2 text-sm text-[#122c54]">
                    <CheckCircle2 className="size-4" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-[28px] border border-white/70 bg-[#122c54] p-6 text-white">
              <div className="flex items-center gap-3">
                <MapPin className="size-5" />
                <h3 className="font-display text-xl">Rooted in Pittsburgh</h3>
              </div>
              <p className="mt-3 text-sm text-white/80">
                We are proud to serve Pittsburgh educators and learners. From neighborhoods like
                Oakland and the North Side to classrooms across Allegheny County, our team is
                committed to supporting local learning communities.
              </p>
              <Button asChild variant="secondary" className="mt-5 rounded-full">
                <a href="#pittsburgh">See our community commitment</a>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section id="pittsburgh" className="bg-white/70">
        <div className="mx-auto w-full max-w-6xl px-6 py-20">
          <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-4">
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Pittsburgh promise</p>
              <h2 className="font-display text-3xl text-[#122c54]">A product shaped by the Steel City.</h2>
              <p className="font-body text-muted-foreground">
                Gradient is built with Pittsburgh in mind. We listen to educators across the city
                to understand real workflows, then design tools that reduce grading overload and
                amplify student growth.
              </p>
              <div className="grid gap-3">
                {[
                  "Designed for classroom and community program use",
                  "Supports rubric standards common to Pittsburgh institutions",
                  "Local insight from CMU, Pitt, and community mentors",
                ].map((item) => (
                  <div key={item} className="flex items-center gap-2 text-sm text-[#122c54]">
                    <CheckCircle2 className="size-4" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-[28px] border border-white/70 bg-white p-4">
              <div className="relative h-[320px] overflow-hidden rounded-[22px] bg-[#122c54]">
                <Image
                  src="/landing/community-classroom.jpg"
                  alt="Pittsburgh classroom community"
                  fill
                  sizes="(max-width: 1024px) 100vw, 40vw"
                  className="object-cover"
                />
              </div>
              <div className="mt-4 rounded-2xl bg-[#f7f4ef] p-4 text-sm text-muted-foreground">
                "We are building a tool that keeps Pittsburgh educators in control while saving
                hours every week."
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="team" className="mx-auto w-full max-w-6xl px-6 py-20">
        <div className="space-y-4">
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">About the team</p>
          <h2 className="font-display text-3xl text-[#122c54]">Meet the builders of Gradient.</h2>
          <p className="font-body text-muted-foreground">
            We are a multidisciplinary engineering team focused on delivering dependable, investor-ready
            software for educators and institutions.
          </p>
        </div>
        <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {teamMembers.map((member) => (
            <div key={member.name} className="rounded-[28px] border border-white/70 bg-white/80 p-5">
              <div className="relative h-48 overflow-hidden rounded-2xl bg-[#122c54]">
                <Image
                  src={member.image}
                  alt={member.name}
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  className="object-cover"
                />
              </div>
              <div className="mt-4">
                <h3 className="font-display text-xl text-[#122c54]">{member.name}</h3>
                <p className="text-sm font-semibold text-[#122c54]/80">{member.role}</p>
                <p className="mt-2 text-sm text-muted-foreground">{member.bio}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section id="faq" className="bg-white/70">
        <div className="mx-auto w-full max-w-6xl px-6 py-20">
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">FAQ</p>
          <h2 className="font-display text-3xl text-[#122c54]">Common questions.</h2>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {faqs.map((faq) => (
              <div key={faq.question} className="rounded-3xl border border-[#122c54]/10 bg-white p-6">
                <h3 className="font-display text-lg text-[#122c54]">{faq.question}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="contact" className="mx-auto w-full max-w-6xl px-6 py-20">
        <div className="grid gap-10 lg:grid-cols-[1fr_1fr]">
          <div className="space-y-4">
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Call to action</p>
            <h2 className="font-display text-3xl text-[#122c54]">Ready to pilot Gradient?</h2>
            <p className="font-body text-muted-foreground">
              Start using the prototype today or reach out for a Pittsburgh pilot tailored to your
              program.
            </p>
            <div className="flex flex-wrap gap-4">
              <Button asChild className="rounded-full bg-[#122c54] text-white hover:bg-[#0f2341]">
                <Link href="/login">Launch the web app</Link>
              </Button>
              <Button asChild variant="outline" className="rounded-full border-[#122c54] text-[#122c54]">
                <a href={`mailto:${contactEmail}`}>{contactEmail}</a>
              </Button>
            </div>
          </div>
          <div className="rounded-[28px] border border-white/70 bg-white/80 p-6">
            <h3 className="font-display text-xl text-[#122c54]">What you get</h3>
            <div className="mt-4 grid gap-3 text-sm text-muted-foreground">
              {[
                "Live walkthrough of the grading workflow",
                "Pilot setup for Pittsburgh educators",
                "Personalized rubric templates",
                "Dedicated onboarding support",
              ].map((item) => (
                <div key={item} className="flex items-center gap-2 text-[#122c54]">
                  <CheckCircle2 className="size-4" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
            <div className="mt-6 rounded-2xl bg-[#122c54] p-4 text-sm text-white">
              "We are ready to partner with Pittsburgh programs this semester."
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/70 bg-[#122c54]">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-start justify-between gap-6 px-6 py-10 text-white md:flex-row">
          <div>
            <p className="font-display text-lg">Gradient</p>
            <p className="text-sm text-white/70">AI-powered grading for Pittsburgh educators.</p>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-sm text-white/70">
            <a href="#features" className="transition-colors hover:text-white">
              Features
            </a>
            <a href="#how-it-works" className="transition-colors hover:text-white">
              How it works
            </a>
            <a href="#team" className="transition-colors hover:text-white">
              Team
            </a>
            <Link href="/login" className="transition-colors hover:text-white">
              Sign in
            </Link>
          </div>
        </div>
      </footer>
    </main>
  )
}
