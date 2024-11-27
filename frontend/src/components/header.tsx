export default function Header() {
  return (
    <nav className="bg-[rgba(229,243,253,255)] py-6 px-8 shadow-md">
      <div className="container mx-auto flex items-center justify-between">
        <div className="flex items-center">
          <img
            src="/assets/logo_horizontal.png"
            alt="Logo"
            className="h-20 w-auto mr-10"
          />
        </div>
        <div className="flex items-center space-x-6">
          <a
            href="/login"
            className="text-[#1E3582] hover:text-[#1C1C28] relative group"
          >
            log in
            <span className="block h-0.5 w-0 bg-[#A3B4D3] group-hover:w-full transition-all duration-300"></span>
          </a>
          <a
            href="/register"
            className="px-4 py-2 bg-[#1E3582] text-[rgba(229,243,253,255)] rounded-full font-semibold"
          >
            sign up
          </a>
        </div>
      </div>
    </nav>
  );
}
