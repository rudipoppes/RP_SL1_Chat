import { SuggestedQuestion } from '../types/chat'

interface SuggestedQuestionsProps {
  questions: SuggestedQuestion[]
  onSelectQuestion: (question: string) => void
}

export default function SuggestedQuestions({ questions, onSelectQuestion }: SuggestedQuestionsProps) {
  return (
    <div className="flex flex-wrap gap-3 justify-center max-w-4xl mx-auto">
      {questions.map((question) => (
        <button
          key={question.id}
          onClick={() => onSelectQuestion(question.text)}
          className="suggested-question group relative"
          title={`Ask: ${question.text}`}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-violet-600 to-indigo-600 rounded-xl opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
          <span className="relative flex items-center space-x-2">
            <span className="text-violet-600 group-hover:text-violet-700">✨</span>
            <span>{question.text}</span>
          </span>
        </button>
      ))}
    </div>
  )
}