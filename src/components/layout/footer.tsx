import Link from 'next/link'

export function Footer() {
  return (
    <footer className="bg-black border-t border-nexa-border mt-auto">
      <div className="container mx-auto px-6 py-10">
        <div className="flex flex-col items-center gap-6">
          {/* Logo */}
          <div className="flex justify-center">
            <div className="h-12 w-auto flex items-center transition-transform duration-300 hover:scale-105">
              <img
                src="/images/dry_ground_ai_logo.svg"
                alt="Dry Ground AI"
                className="h-12 w-auto filter invert"
                onError={(e) => {
                  console.log('Footer logo failed to load:', e.target.src)
                }}
              />
            </div>
          </div>

          {/* Navigation Links */}
          <div className="flex flex-wrap justify-center gap-6">
            <Link 
              href="/" 
              className="text-white text-base font-medium px-3 py-2 rounded-md transition-all duration-300 hover:bg-white/10 hover:-translate-y-0.5"
            >
              Home
            </Link>
            <Link 
              href="/sessions" 
              className="text-white text-base font-medium px-3 py-2 rounded-md transition-all duration-300 hover:bg-white/10 hover:-translate-y-0.5"
            >
              Sessions
            </Link>
            <Link 
              href="/training" 
              className="text-white text-base font-medium px-3 py-2 rounded-md transition-all duration-300 hover:bg-white/10 hover:-translate-y-0.5"
            >
              Training
            </Link>
            <Link 
              href="/about" 
              className="text-white text-base font-medium px-3 py-2 rounded-md transition-all duration-300 hover:bg-white/10 hover:-translate-y-0.5"
            >
              About
            </Link>
            <Link 
              href="/contact" 
              className="text-white text-base font-medium px-3 py-2 rounded-md transition-all duration-300 hover:bg-white/10 hover:-translate-y-0.5"
            >
              Contact
            </Link>
          </div>

          {/* Copyright */}
          <div className="text-center">
            <p className="text-nexa-muted text-sm">
              &copy; 2024 Dry Ground AI. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}
