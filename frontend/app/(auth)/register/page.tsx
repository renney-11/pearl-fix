export default function SignUp() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-main-blue">
      <div className="w-full max-w-lg p-8 bg-transparent-blue rounded-lg shadow-lg">
        <div className="flex flex-col items-center mb-8">
          <img
            src="/assets/logo_vertical.png"
            alt="Tooth Beacon Logo"
            className="w-40 h-35 mb-4 mt-1"
          />
        </div>
        <form className="space-y-4">
          <input
            type="text"
            placeholder="full name"
            className="w-full px-4 py-2 rounded bg-transparent-input text-white placeholder-blue-300 focus:outline-none"
          />
          <input
            type="email"
            placeholder="email"
            className="w-full px-4 py-2 rounded bg-transparent-input text-white placeholder-blue-300 focus:outline-none"
          />
          <input
            type="password"
            placeholder="password"
            className="w-full px-4 py-2 rounded bg-transparent-input text-white placeholder-blue-300 focus:outline-none"
          />
          <input
            type="password"
            placeholder="confirm password"
            className="w-full px-4 py-2 rounded bg-transparent-input text-white placeholder-blue-300 focus:outline-none"
          />
          <button
            type="submit"
             className="py-2 px-8 mt-4 text-blue-900 bg-white rounded-full font-semibold hover:bg-gray-200 mx-auto block"
          >
            sign up
          </button>
        </form>
        <p className="mt-4 text-center text-white">
          already have an account?{" "}
          <a href="/login" className="font-semibold text-blue-300">
            log in
          </a>
        </p>
      </div>
    </div>
  );
}