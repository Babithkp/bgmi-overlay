import Image from "next/image";
import CompanyDetails from "./components/CompanyDetails";
import trikonaLogo from "../../public/fullLogo-white.webp";

export default function Home() {
  return (
    <main className="min-h-screen bg-white text-black">
          <section className="relative min-h-[60vh] flex items-center justify-center overflow-hidden">
      {/* Subtle gradient background */}
      <div 
        className="absolute inset-0 opacity-50"
        style={{ background: 'var(--gradient-subtle)' }}
      />
      
      {/* Decorative gradient orbs */}
      <div className="absolute top-20 right-20 w-72 h-72 rounded-full bg-primary/10 blur-3xl" />
      <div className="absolute bottom-20 left-20 w-96 h-96 rounded-full bg-secondary/10 blur-3xl" />
      
      <div className="relative z-10 container mx-auto px-6 text-center">
        {/* Logo */}
        <div className="mb-8 flex justify-center">
          <Image 
            src={trikonaLogo} 
            alt="Trikona Logo" 
            width={200}
            height={200}
            className="h-20 md:h-28 w-auto"
          />
        </div>
        
        {/* Tagline */}
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-black mb-6 tracking-tight">
          Building Tomorrow&apos;s{" "}
          <span 
           style={{
            background:
              "linear-gradient(90.79deg, #A632F2 0.68%, #FBA325 99.34%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            display: "inline-block",
          }}
          >Solutions</span>
        </h1>
        
        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          Empowering businesses with innovative technology solutions 
          that drive growth and transform possibilities into reality.
        </p>
      </div>
    </section>
      <CompanyDetails />
      
      {/* Footer */}
      <footer className="py-8 border-t border-border">
        <div className="container mx-auto px-6 text-center">
          <p className="text-muted-foreground text-sm">
            © {new Date().getFullYear()} Trikona Technologies. All rights reserved.
          </p>
        </div>
      </footer>
    </main>
  );
}
