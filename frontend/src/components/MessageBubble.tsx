import { User, Bot } from 'lucide-react'
import { Message } from '../types/chat'

interface MessageBubbleProps {
  message: Message
}

export default function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user'
  
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-6`}>
      <div className={`message-bubble ${isUser ? 'user-message' : 'assistant-message'} max-w-[85%]`}>
        <div className="flex items-start gap-4">
          {!isUser && (
            <div className="w-10 h-10 hero-gradient rounded-full flex items-center justify-center flex-shrink-0 mt-1 shadow-lg">
              <Bot className="w-5 h-5 text-white" />
            </div>
          )}
          
          <div className={`flex-1 ${isUser ? 'text-right' : 'text-left'}`}>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                {isUser ? 'You' : 'Restorepoint AI'}
              </span>
              <span className="text-xs text-slate-400">
                {new Date(message.timestamp).toLocaleTimeString([], { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </span>
            </div>
            
            <div className="whitespace-pre-wrap break-words text-sm leading-relaxed">
              {message.content}
            </div>
            
            {message.isStreaming && (
              <div className="typing-indicator mt-3">
                <div className="typing-dot" style={{ animationDelay: '0ms' }}></div>
                <div className="typing-dot" style={{ animationDelay: '150ms' }}></div>
                <div className="typing-dot" style={{ animationDelay: '300ms' }}></div>
              </div>
            )}
          </div>
          
          {isUser && (
            <div className="w-10 h-10 bg-gradient-to-r from-violet-600 to-indigo-600 rounded-full flex items-center justify-center flex-shrink-0 mt-1 shadow-lg">
              <User className="w-5 h-5 text-white" />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}