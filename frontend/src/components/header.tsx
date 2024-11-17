export default function Header() {
  return (
    <nav className="bg-blue-900 py-6 px-8">
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
            className="text-white hover:text-blue-300 relative group"
          >
            log in
            <span className="block h-0.5 w-0 bg-white group-hover:w-full transition-all duration-300"></span>
          </a>
          <a
            href="/sign-up"
            className="px-4 py-2 bg-white text-blue-900 rounded-full font-semibold hover:bg-gray-200"
          >
            sign up
          </a>
        </div>
      </div>
    </nav>
  );
}
