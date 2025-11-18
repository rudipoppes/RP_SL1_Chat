
export default function LoadingSpinner() {
  return (
    <div className="flex items-center space-x-3">
      <div className="flex items-center space-x-1">
        <div className="w-2 h-2 bg-gradient-to-r from-violet-400 to-indigo-400 rounded-full animate-pulse" style={{ animationDelay: '0s' }}></div>
        <div className="w-2 h-2 bg-gradient-to-r from-violet-400 to-indigo-400 rounded-full animate-pulse" style={{ animationDelay: '0.3s' }}></div>
        <div className="w-2 h-2 bg-gradient-to-r from-violet-400 to-indigo-400 rounded-full animate-pulse" style={{ animationDelay: '0.6s' }}></div>
      </div>
      <span className="text-sm text-slate-600 font-medium">Processing...</span>
    </div>
  )
}