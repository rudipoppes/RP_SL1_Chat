import { useState, useRef, useEffect } from 'react'
import { Send, Loader2, AlertCircle } from 'lucide-react'
import { useChat } from '../hooks/useChat'
import { SUGGESTED_QUESTIONS } from '../utils/constants'
import MessageBubble from './MessageBubble'
import SuggestedQuestions from './SuggestedQuestions'
import LoadingSpinner from './LoadingSpinner'

export default function ChatInterface() {
  const [input, setInput] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  const { state, sendMessage, clearMessages } = useChat()

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [state.messages])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || state.isLoading) return

    const messageToSend = input.trim()
    setInput('')
    
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }

    await sendMessage({ message: messageToSend })
  }

  const handleSuggestedQuestion = (question: string) => {
    setInput(question)
    textareaRef.current?.focus()
  }

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    
    // Auto-resize textarea
    e.target.style.height = 'auto'
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e as any)
    }
  }

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      {/* Header */}
      <div className="glass-card border-b border-white/20 px-4 sm:px-6 lg:px-8 py-4 sm:py-6 m-4 mb-0">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gradient mb-2">
                Restorepoint Assistant
              </h1>
              <p className="text-sm sm:text-base text-slate-600 font-medium">
                Professional network management & monitoring platform
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-emerald-400 rounded-full animate-pulse"></div>
                <span className="text-sm text-slate-600 font-medium">Online</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto scrollbar-glow px-4 py-6">
        <div className="max-w-5xl mx-auto">
          {/* Welcome Message */}
          {state.messages.length === 0 && (
            <div className="text-center py-16">
              <div className="relative mb-8">
                <div className="w-24 h-24 hero-gradient rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl">
                  <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center">
                    <div className="w-6 h-6 hero-gradient rounded-full"></div>
                  </div>
                </div>
                <div className="absolute inset-0 w-24 h-24 hero-gradient rounded-full mx-auto blur-3xl opacity-30 animate-pulse"></div>
              </div>
              <h2 className="text-3xl font-bold text-gradient mb-4">
                Welcome to Restorepoint Assistant
              </h2>
              <p className="text-lg text-slate-600 mb-8 max-w-2xl mx-auto leading-relaxed">
                Advanced AI-powered network management platform for device monitoring, backup operations, 
                command execution, and real-time system analytics.
              </p>
              
              {/* Suggested Questions */}
              <div className="mb-12">
                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-6">
                  Quick Actions
                </h3>
                <SuggestedQuestions 
                  questions={SUGGESTED_QUESTIONS}
                  onSelectQuestion={handleSuggestedQuestion}
                />
              </div>

              {/* Feature Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mt-12">
                <div className="glass-card p-4 sm:p-6 text-center transform transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-emerald-400 to-teal-500 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <div className="w-5 h-5 sm:w-6 sm:h-6 bg-white rounded"></div>
                  </div>
                  <h4 className="font-semibold text-slate-800 mb-2 text-sm sm:text-base">Device Management</h4>
                  <p className="text-xs sm:text-sm text-slate-600">Monitor and control your network infrastructure</p>
                </div>
                <div className="glass-card p-4 sm:p-6 text-center transform transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-violet-400 to-indigo-500 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <div className="w-5 h-5 sm:w-6 sm:h-6 bg-white rounded"></div>
                  </div>
                  <h4 className="font-semibold text-slate-800 mb-2 text-sm sm:text-base">Backup Operations</h4>
                  <p className="text-xs sm:text-sm text-slate-600">Automated backup and restore capabilities</p>
                </div>
                <div className="glass-card p-4 sm:p-6 text-center transform transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-amber-400 to-orange-500 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <div className="w-5 h-5 sm:w-6 sm:h-6 bg-white rounded"></div>
                  </div>
                  <h4 className="font-semibold text-slate-800 mb-2 text-sm sm:text-base">Real-time Analytics</h4>
                  <p className="text-xs sm:text-sm text-slate-600">Advanced monitoring and reporting tools</p>
                </div>
              </div>
            </div>
          )}

          {/* Messages */}
          <div className="space-y-4">
            {state.messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}
            
            {/* Loading Indicator */}
            {state.isLoading && (
              <div className="flex justify-start">
                <div className="bg-white text-gray-800 border border-gray-200 rounded-2xl px-4 py-3 max-w-[80%]">
                  <LoadingSpinner />
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        </div>
      </div>

      {/* Error Message */}
      {state.error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 max-w-4xl mx-auto mx-4">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-red-400 mr-2" />
            <p className="text-red-700">{state.error}</p>
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="glass-card border-t border-white/20 m-4 mt-0">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row items-end gap-3 sm:gap-4">
            <div className="flex-1 relative w-full">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={handleTextareaChange}
                onKeyDown={handleKeyDown}
                placeholder="Ask about devices, backups, commands, or network status..."
                className="chat-input"
                rows={1}
                disabled={state.isLoading}
              />
              
              <button
                type="submit"
                disabled={!input.trim() || state.isLoading}
                className="send-button"
                title={state.isLoading ? "Sending..." : "Send message"}
              >
                {state.isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </button>
            </div>
            
            {state.messages.length > 0 && (
              <button
                type="button"
                onClick={clearMessages}
                className="w-full sm:w-auto px-4 sm:px-6 py-3 text-sm font-medium text-slate-600 hover:text-slate-800 bg-white/60 hover:bg-white/80 border border-white/40 rounded-xl transition-all duration-300 backdrop-blur-sm shadow-md hover:shadow-lg"
              >
                Clear Chat
              </button>
            )}
          </form>
          
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 mt-4 text-xs sm:text-sm text-slate-500">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
              <span className="text-center sm:text-left">
                Press <kbd className="px-1.5 py-0.5 sm:px-2 sm:py-1 bg-white/60 border border-white/40 rounded text-xs font-mono">Enter</kbd> to send, 
                <kbd className="px-1.5 py-0.5 sm:px-2 sm:py-1 bg-white/60 border border-white/40 rounded text-xs font-mono ml-1">Shift+Enter</kbd> for new line
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-violet-400 rounded-full animate-pulse"></div>
              <span>Enterprise-grade security</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}