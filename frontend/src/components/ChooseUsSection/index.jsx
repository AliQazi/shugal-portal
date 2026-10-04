import { Building2, Globe2, Headphones, MoonStar, Plane, ShieldCheck } from "lucide-react";
const features = [
  { title: "Global Connectivity", desc: "Access international routes and group inventory with competitive options and practical booking support.", icon: Globe2 },
  { title: "Visa Assistance", desc: "Clear documentation guidance helps travellers prepare confidently before submission.", icon: ShieldCheck },
  { title: "Sacred Journeys", desc: "Umrah packages shaped around comfortable stays, convenient timing, and access to the Haramain.", icon: MoonStar },
  { title: "Trusted Stays", desc: "Hotel choices selected around location, comfort, budget, and the needs of families and groups.", icon: Building2 },
];
export default function ChooseUsSection() {
  return (
    <section className="home-advantage" aria-labelledby="advantage-heading">
      <div className="home-advantage-intro">
        <div><p className="home-eyebrow home-eyebrow-light">THE STACK WORKS FLOW ADVANTAGE</p><h2 id="advantage-heading">Why travellers trust our expertise</h2></div>
        <p>“We bring the moving parts together, so every traveller can move forward with clarity and confidence.”</p>
      </div>
      <div className="home-advantage-body">
        <p className="home-eyebrow">PREMIUM TRAVEL SOLUTIONS</p>
        <h3>Clear support for agents, families, and pilgrims</h3>
        <div className="home-feature-grid">
          {features.map(({ title, desc, icon: Icon }) => <article className="home-feature" key={title}><span className="home-feature-icon"><Icon /></span><h3>{title}</h3><p>{desc}</p></article>)}
        </div>
        <div className="home-trust-strip">
          <span><ShieldCheck /> Licensed travel support</span><span><Headphones /> Personal assistance</span><span><Plane /> Seamless planning</span>
        </div>
      </div>
    </section>
  );
}
