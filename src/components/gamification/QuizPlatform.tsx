import React, { useState, useEffect } from 'react';
import { getAuthHeaders } from '../../utils/auth.js';
import { Play, CheckCircle, XCircle, Clock, Award, Star } from 'lucide-react';

export default function QuizPlatform({ 
  onFinish,
  onActiveSessionChange
}: { 
  onFinish?: () => void;
  onActiveSessionChange?: (hasActive: boolean, sessionId: string | null) => void;
}) {
  const [categories, setCategories] = useState<any[]>([]);
  const [activeSession, setActiveSession] = useState<any>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(10);
  const [answers, setAnswers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  
  // States for immediate per-question feedback
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [showQuitConfirmation, setShowQuitConfirmation] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/gamification/categories', { headers: getAuthHeaders() });
      const data = await res.json();
      if (data.success) {
        setCategories(data.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const startQuiz = async (category: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/gamification/quizzes/start', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ category })
      });
      const data = await res.json();
      if (data.success) {
        setActiveSession(data.data);
        setCurrentQuestionIndex(0);
        setTimeLeft(10);
        setAnswers([]);
        setResult(null);
        setSelectedOption(null);
        setShowFeedback(false);
        if (onActiveSessionChange) {
          onActiveSessionChange(true, data.data.sessionId);
        }
      } else {
        setError(data.error || 'Failed to start quiz');
      }
    } catch (err: any) {
      setError(err.message || 'Error starting quiz');
    } finally {
      setLoading(false);
    }
  };

  const handleQuitQuiz = async () => {
    if (!activeSession) return;
    setLoading(true);
    try {
      await fetch('/api/gamification/quizzes/cancel', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ sessionId: activeSession.sessionId })
      });
      setActiveSession(null);
      setSelectedOption(null);
      setShowFeedback(false);
      setResult(null);
      setShowQuitConfirmation(false);
      if (onActiveSessionChange) {
        onActiveSessionChange(false, null);
      }
      fetchCategories();
    } catch (err) {
      console.error('Error canceling quiz:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeSession && !result && !showFeedback && !showQuitConfirmation) {
      const timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            // Auto-select wrong/timed-out feedback when time expires
            setSelectedOption(-1);
            setShowFeedback(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [activeSession, currentQuestionIndex, result, showFeedback, showQuitConfirmation]);

  const handleAnswerClick = (optionIndex: number) => {
    if (showFeedback) return;
    setSelectedOption(optionIndex);
    setShowFeedback(true);
  };

  const handleNextQuestion = () => {
    const question = activeSession.questions[currentQuestionIndex];
    const newAnswers = [...answers, {
      questionId: question._id,
      selectedOptionIndex: selectedOption !== null ? selectedOption : -1,
      timeSpentSeconds: 10 - timeLeft
    }];
    
    setAnswers(newAnswers);
    setSelectedOption(null);
    setShowFeedback(false);

    if (currentQuestionIndex < activeSession.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setTimeLeft(10);
    } else {
      submitQuiz(newAnswers);
    }
  };

  const submitQuiz = async (finalAnswers: any[]) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/gamification/quizzes/submit', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          sessionId: activeSession.sessionId,
          answers: finalAnswers
        })
      });
      const data = await res.json();
      if (data.success) {
        setResult(data.data);
        if (onActiveSessionChange) {
          onActiveSessionChange(false, null);
        }
        fetchCategories(); // Refresh categories state so completed state is displayed immediately
      } else {
        setError(data.error || 'Failed to submit quiz');
      }
    } catch (err: any) {
      setError(err.message || 'Error submitting quiz');
    } finally {
      setLoading(false);
    }
  };

  if (result) {
    return (
      <div className="max-w-2xl mx-auto p-6 bg-white rounded-xl shadow border border-gray-200 text-center">
        <Award className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Quiz Completed!</h2>
        <p className="text-gray-600 mb-6">You answered {result.correctAnswers} out of {result.answers.length} correctly.</p>
        
        <div className="flex justify-center space-x-4 mb-8">
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{result.correctAnswers}</div>
            <div className="text-sm text-green-800">Correct</div>
          </div>
          <div className="bg-red-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-red-600">{result.incorrectAnswers}</div>
            <div className="text-sm text-red-800">Incorrect</div>
          </div>
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{result.score * 20 + 10}</div>
            <div className="text-sm text-blue-800">XP Earned</div>
          </div>
        </div>

        <button 
          onClick={() => { setActiveSession(null); setResult(null); if(onFinish) onFinish(); }}
          className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-indigo-700 transition"
        >
          Return to Quizzes
        </button>
      </div>
    );
  }

  if (activeSession) {
    const question = activeSession.questions[currentQuestionIndex];
    return (
      <div className="max-w-3xl mx-auto p-6 bg-white rounded-xl shadow border border-gray-200 relative">
        {showQuitConfirmation && (
          <div className="absolute inset-0 bg-white/95 backdrop-blur-sm flex items-center justify-center z-10 p-6 rounded-xl animate-fade-in">
            <div className="max-w-sm w-full text-center space-y-4 animate-scale-in">
              <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                <XCircle className="w-6 h-6" />
              </div>
              <h4 className="text-lg font-bold text-gray-900">Quit Quiz Section?</h4>
              <p className="text-sm text-gray-500 leading-relaxed">
                Are you sure you want to quit this quiz section? Your progress for this category will be reset, the category will not be locked, and no points will be awarded.
              </p>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowQuitConfirmation(false)}
                  className="flex-1 px-4 py-2 bg-gray-150 hover:bg-gray-200 text-gray-700 font-medium rounded-lg text-sm transition cursor-pointer"
                >
                  Resume Quiz
                </button>
                <button
                  onClick={handleQuitQuiz}
                  className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg text-sm transition cursor-pointer"
                >
                  Yes, Quit
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center space-x-3">
            <span className="text-sm font-medium text-gray-500 uppercase tracking-wide">
              Question {currentQuestionIndex + 1} of {activeSession.questions.length}
            </span>
            <button
              onClick={() => setShowQuitConfirmation(true)}
              className="text-xs text-red-500 hover:text-red-700 hover:underline font-semibold cursor-pointer"
            >
              Quit Quiz
            </button>
          </div>
          <div className={`flex items-center space-x-2 px-3 py-1 rounded-full ${timeLeft <= 3 && !showFeedback ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
            <Clock className="w-4 h-4" />
            <span className="font-bold">{timeLeft}s</span>
          </div>
        </div>
        
        <h3 className="text-xl font-semibold text-gray-900 mb-6 leading-relaxed">
          {question.question}
        </h3>

        <div className="space-y-3">
          {question.options.map((opt: string, idx: number) => {
            const isSelected = selectedOption === idx;
            const isCorrect = question.correctAnswer === idx;
            
            let btnClass = "w-full text-left p-4 rounded-lg border transition font-medium ";
            
            if (showFeedback) {
              if (isCorrect) {
                btnClass += "border-green-500 bg-green-50 text-green-900";
              } else if (isSelected) {
                btnClass += "border-red-500 bg-red-50 text-red-900";
              } else {
                btnClass += "border-gray-200 text-gray-400 cursor-not-allowed";
              }
            } else {
              btnClass += "border-gray-200 hover:border-indigo-500 hover:bg-indigo-50 text-gray-700";
            }
            
            return (
              <button
                key={idx}
                disabled={showFeedback}
                onClick={() => handleAnswerClick(idx)}
                className={btnClass}
              >
                <div className="flex justify-between items-center">
                  <span>{opt}</span>
                  {showFeedback && isCorrect && <CheckCircle className="w-5 h-5 text-green-600 shrink-0 ml-2" />}
                  {showFeedback && isSelected && !isCorrect && <XCircle className="w-5 h-5 text-red-600 shrink-0 ml-2" />}
                </div>
              </button>
            );
          })}
        </div>

        {showFeedback && (
          <div className="mt-6 p-4 rounded-lg border border-gray-150 bg-gray-50 animate-fade-in">
            {selectedOption === question.correctAnswer ? (
              <div className="text-green-800 bg-green-50/50 p-3 rounded-md flex items-start space-x-2 border border-green-200">
                <CheckCircle className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Correct!</p>
                  <p className="text-sm">You earned <span className="font-semibold text-green-700">+20 XP</span> for this right answer!</p>
                </div>
              </div>
            ) : selectedOption === -1 ? (
              <div className="text-red-800 bg-red-50/50 p-3 rounded-md flex items-start space-x-2 border border-red-200">
                <XCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Time's Up!</p>
                  <p className="text-sm">The correct answer was: <span className="font-semibold text-red-700">{question.options[question.correctAnswer]}</span></p>
                </div>
              </div>
            ) : (
              <div className="text-red-800 bg-red-50/50 p-3 rounded-md flex items-start space-x-2 border border-red-200">
                <XCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Incorrect!</p>
                  <p className="text-sm">The correct answer was: <span className="font-semibold text-red-700">{question.options[question.correctAnswer]}</span>. No points earned this time.</p>
                </div>
              </div>
            )}
            
            {question.explanation && (
              <p className="text-sm text-gray-600 mt-3 italic leading-relaxed">
                <span className="font-semibold not-italic text-gray-700">Explanation: </span>
                {question.explanation}
              </p>
            )}

            <button
              onClick={handleNextQuestion}
              className="mt-4 w-full bg-indigo-600 text-white py-3 rounded-lg font-medium hover:bg-indigo-700 transition shadow-sm hover:shadow"
            >
              {currentQuestionIndex < activeSession.questions.length - 1 ? 'Next Question' : 'Submit Quiz & View Results'}
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3 mb-6">
        <Star className="w-6 h-6 text-yellow-500" />
        <h2 className="text-2xl font-bold text-gray-900">Civic Awareness Quizzes</h2>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-700 rounded-lg text-sm mb-6 border border-red-200">{error}</div>
      )}

      {loading && !activeSession ? (
        <div className="text-center py-8 text-gray-500">Loading...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.length > 0 ? categories.map((cat) => (
            <div key={cat.name} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow transition flex flex-col justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{cat.name}</h3>
                <p className="text-sm text-gray-500 mb-6">{cat.description}</p>
              </div>
              <div>
                {cat.isAttempted ? (
                  <div>
                    <button 
                      disabled
                      className="flex items-center justify-center space-x-2 w-full bg-gray-100 text-gray-400 py-2 rounded-lg font-medium cursor-not-allowed border border-gray-200"
                    >
                      <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                      <span>Completed Today</span>
                    </button>
                    <p className="text-[11px] text-gray-400 text-center mt-1.5 font-medium">
                      Locks for 24 hours. Resets daily.
                    </p>
                  </div>
                ) : (
                  <button 
                    onClick={() => startQuiz(cat.name)}
                    className="flex items-center justify-center space-x-2 w-full bg-indigo-50 text-indigo-700 py-2 rounded-lg font-medium hover:bg-indigo-100 transition"
                  >
                    <Play className="w-4 h-4" />
                    <span>Start Quiz</span>
                  </button>
                )}
              </div>
            </div>
          )) : (
            <div className="col-span-full p-8 text-center bg-gray-50 rounded-xl text-gray-500">
              No quiz categories available yet. Please check back later!
            </div>
          )}
        </div>
      )}
    </div>
  );
}
