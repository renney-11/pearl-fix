export default function Header() { 
  return (
    <nav className="bg-[rgba(108,123,171,40)] py-6 px-8">  {/* Updated to rgba(133, 134, 66, 1) */}
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
            className="text-white hover:text-[#1C1C28] relative group"
          >
            log in
            <span className="block h-0.5 w-0 bg-white group-hover:w-full transition-all duration-300"></span>
          </a>
          <a
            href="/register"
            className="px-4 py-2 bg-white text-[#1C1C28] rounded-full font-semibold hover:bg-[#D9E3F0]"
          >
            sign up
          </a>
        </div>
      </div>
    </nav>
  );
}
