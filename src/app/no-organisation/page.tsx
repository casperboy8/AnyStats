export default function NoOrganisationPage() {
  return (
    <div className="min-h-screen bg-[#f9f9f8] flex items-center justify-center p-4">
      <div className="w-full max-w-sm text-center">
        <div className="bg-white rounded-2xl border border-gray-100 p-8">
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h1 className="text-base font-semibold text-gray-900 mb-2">Geen toegang</h1>
          <p className="text-sm text-gray-500 leading-relaxed">
            Je account is nog niet gekoppeld aan een groep.
            Neem contact op met je beheerder.
          </p>
          <form action="/api/auth/logout" method="POST" className="mt-6">
            <button
              type="submit"
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              Uitloggen
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
