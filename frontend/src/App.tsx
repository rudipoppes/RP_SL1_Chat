import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import ChatInterface from './components/ChatInterface'
import ErrorBoundary from './components/ErrorBoundary'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
          <ChatInterface />
        </div>
      </QueryClientProvider>
    </ErrorBoundary>
  )
}

export default App