export default function Unauthorized() {
    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100">
            <div className="bg-white p-8 rounded shadow text-center">
                <h1 className="text-2xl font-bold mb-4 text-red-600">Unauthorized</h1>
                <p className="text-gray-700 mb-4">You do not have permission to access this page.</p>
                <a href="/login" className="text-blue-600 hover:underline">Go to Login</a>
            </div>
        </div>
    );
}
