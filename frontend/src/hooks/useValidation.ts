import { useState, useCallback } from 'react'
import { RESTOREPOINT_KEYWORDS, VALIDATION_MESSAGES } from '../utils/constants'

interface ValidationState {
  isValid: boolean
  errorMessage: string | null
  warnings: string[]
}

export const useValidation = () => {
  const [validationState, setValidationState] = useState<ValidationState>({
    isValid: true,
    errorMessage: null,
    warnings: [],
  })

  const validateInput = useCallback((input: string): ValidationState => {
    const warnings: string[] = []
    let errorMessage: string | null = null
    let isValid = true

    // Check if input is empty
    if (!input.trim()) {
      errorMessage = VALIDATION_MESSAGES.EMPTY_INPUT
      isValid = false
      return { isValid, errorMessage, warnings }
    }

    // Check length
    if (input.length > 500) {
      errorMessage = VALIDATION_MESSAGES.TOO_LONG
      isValid = false
      return { isValid, errorMessage, warnings }
    }

    if (input.length < 3) {
      errorMessage = VALIDATION_MESSAGES.TOO_SHORT
      isValid = false
      return { isValid, errorMessage, warnings }
    }

    // Check for Restorepoint keywords
    const hasValidKeyword = RESTOREPOINT_KEYWORDS.some(keyword =>
      input.toLowerCase().includes(keyword)
    )

    if (!hasValidKeyword) {
      errorMessage = VALIDATION_MESSAGES.INVALID_TOPIC
      isValid = false
      return { isValid, errorMessage, warnings }
    }

    // Check for potential issues (warnings)
    if (input.length > 200) {
      warnings.push('Consider breaking this into shorter questions for better responses.')
    }

    if (input.includes('?') && input.split('?').length > 3) {
      warnings.push('Multiple questions detected. Consider asking one question at a time.')
    }

    // Check for vague requests
    const vagueTerms = ['help', 'assist', 'tell me about', 'explain']
    if (vagueTerms.some(term => input.toLowerCase().includes(term)) && input.length < 20) {
      warnings.push('Try to be more specific about what you need help with.')
    }

    const newState = { isValid, errorMessage, warnings }
    setValidationState(newState)
    return newState
  }, [])

  const clearValidation = useCallback(() => {
    setValidationState({
      isValid: true,
      errorMessage: null,
      warnings: [],
    })
  }, [])

  return {
    validationState,
    validateInput,
    clearValidation,
  }
}