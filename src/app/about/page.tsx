export const metadata = { title: "About" };

// TODO: port the full About page from docs/design/Pi-Volunteers Website v3.dc.html.
export default function About() {
  return (
    <div className="mx-auto max-w-[900px] px-6 pt-10 pb-16 flex flex-col gap-6">
      <h1 className="m-0 text-[clamp(36px,4.5vw,56px)] leading-none font-bold tracking-tight">About Good Local Life – Phillip Island</h1>
      <p className="m-0 text-xl leading-relaxed text-slate">
        A free noticeboard for volunteer roles on Phillip Island. Local groups post what they need. You pick what suits your week.
      </p>
      <div className="rounded-hero overflow-hidden aspect-[16/7] bg-navy bg-cover bg-center" style={{ backgroundImage: "url(/images/wallabies-field.jpg)" }} />
    </div>
  );
}
