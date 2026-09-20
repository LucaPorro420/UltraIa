import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  BookOpen, Award, Clock, Target, Play, Pause, 
  CheckCircle, AlertCircle, ChevronLeft, ChevronRight,
  Download, Share2, Flag, Brain, Zap
} from 'lucide-react';
import clsx from 'clsx';
import { javascriptLessons } from '../data/javascriptLessons';

interface Lesson {
  id: string;
  title: string;
  content: string;
  order: number;
  completed: boolean;
  hasQuiz: boolean;
  quizScore?: number;
  quizTotal?: number;
}

interface Course {
  id: string;
  title: string;
  description: string;
  level: string;
  category: string;
  lessons: Lesson[];
  totalLessons: number;
  totalQuizzes: number;
  estimatedHours: number;
  free: boolean;
  progress: number;
}

const mockCourse: Course = {
  id: 'javascript',
  title: 'JavaScript Moderno (ES6+)',
  description: 'Domina JavaScript moderno desde ES6 hasta ES2024. Aprende variables, funciones flecha, promesas, async/await, módulos, destructuring y más.',
  level: 'beginner',
  category: 'web-core',
  totalLessons: javascriptLessons.length,
  totalQuizzes: javascriptLessons.filter(l => l.hasQuiz).length,
  estimatedHours: 30,
  free: true,
  progress: 75,
  lessons: javascriptLessons,
};

const mockQuiz = [
  { id: 0, question: '¿Cuál es la diferencia principal entre let y var?', options: ['let tiene scope de bloque', 'var es más rápido', 'let no se puede reasignar', 'var es de ES6'], correct: 0 },
  { id: 1, question: '¿Qué hace la función flecha `const sumar = (a, b) => a + b;`?', options: ['Suma dos números', 'Concatena strings', 'Multiplica', 'Divide'], correct: 0 },
  { id: 2, question: '¿Para qué sirve el operador spread (...)?', options: ['Expandir arrays/objetos', 'Comprimir datos', 'Crear promesas', 'Definir clases'], correct: 0 },
  { id: 3, question: '¿Qué imprime `console.log([...[1,2], ...[3,4]])`?', options: ['[1, 2, 3, 4]', '[[1,2], [3,4]]', 'Error', '[1, 2, [3, 4]]'], correct: 0 },
  { id: 4, question: '¿Cuál es la sintaxis correcta para destructuring de objeto?', options: ['const { a, b } = obj', 'const [a, b] = obj', 'const (a, b) = obj', 'const <a, b> = obj'], correct: 0 },
];

export function CourseDetail() {
  const { courseId } = useParams();
  const course = mockCourse;
  const [activeLessonId, setActiveLessonId] = useState<string>(course.lessons[0].id);
  const [showQuiz, setShowQuiz] = useState(false);
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizResult, setQuizResult] = useState<{ score: number; total: number } | null>(null);

  const activeLesson = course.lessons.find(l => l.id === activeLessonId);
  const completedLessons = course.lessons.filter(l => l.completed).length;

  const handleAnswerChange = (questionIndex: number, answerIndex: number) => {
    if (quizSubmitted) return;
    setQuizAnswers(prev => ({ ...prev, [questionIndex]: answerIndex }));
  };

  const handleQuizSubmit = () => {
    let score = 0;
    mockQuiz.forEach((q, i) => {
      if (quizAnswers[i] === q.correct) score++;
    });
    setQuizResult({ score, total: mockQuiz.length });
    setQuizSubmitted(true);
  };

  const handleQuizRetry = () => {
    setQuizAnswers({});
    setQuizSubmitted(false);
    setQuizResult(null);
  };

  const handleLessonComplete = () => {
    if (activeLesson && !activeLesson.completed) {
      console.log('Lesson completed:', activeLessonId);
    }
  };

  const handleNextLesson = () => {
    const currentIndex = course.lessons.findIndex(l => l.id === activeLessonId);
    if (currentIndex < course.lessons.length - 1) {
      setActiveLessonId(course.lessons[currentIndex + 1].id);
      setShowQuiz(false);
      setQuizAnswers({});
      setQuizSubmitted(false);
      setQuizResult(null);
    }
  };

  const handlePrevLesson = () => {
    const currentIndex = course.lessons.findIndex(l => l.id === activeLessonId);
    if (currentIndex > 0) {
      setActiveLessonId(course.lessons[currentIndex - 1].id);
      setShowQuiz(false);
      setQuizAnswers({});
      setQuizSubmitted(false);
      setQuizResult(null);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Course Header */}
      <div className="border-b border-border bg-panel/50 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <Link to="/learn" className="p-2 rounded-lg hover:bg-cactus transition-colors">
                <ChevronLeft className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="text-xl font-display font-bold">{course.title}</h1>
                <div className="flex items-center gap-3 text-sm text-text-muted mt-1">
                  <span className="px-2 py-0.5 bg-primary/10 text-primary rounded">{course.level}</span>
                  <span className="px-2 py-0.5 bg-cactus border border-border rounded">{course.category}</span>
                  {course.free && <span className="px-2 py-0.5 bg-green-500/10 text-green-500 border border-green-500/20 rounded">GRATIS</span>}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex items-center gap-4 text-sm text-text-muted">
                <span className="flex items-center gap-1"><BookOpen className="w-4 h-4" /> {course.totalLessons} lecciones</span>
                <span className="flex items-center gap-1"><Award className="w-4 h-4" /> {course.totalQuizzes} quizzes</span>
                <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> {course.estimatedHours}h</span>
              </div>
              <div className="flex items-center gap-2">
                <button className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-light flex items-center gap-2">
                  <Download className="w-4 h-4" />
                  PDF
                </button>
                <button className="px-4 py-2 bg-panel border border-border text-text-primary rounded-lg hover:bg-cactus flex items-center gap-2">
                  <Share2 className="w-4 h-4" />
                  Compartir
                </button>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-4">
            <div className="flex justify-between text-sm mb-1">
              <span className="font-medium">Progreso del curso</span>
              <span className="text-text-muted">{completedLessons}/{course.totalLessons} lecciones ({course.progress}%)</span>
            </div>
            <div className="h-3 bg-border rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${course.progress}%` }}></div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - Lessons */}
        <div className="w-80 lg:w-96 bg-panel border-r border-border flex flex-col">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h2 className="font-semibold">Contenido del Curso</h2>
            <button className="p-1.5 rounded hover:bg-cactus transition-colors" title="Expandir todo">
              <Zap className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {course.lessons.map((lesson, index) => (
              <LessonItem
                key={lesson.id}
                lesson={lesson}
                index={index + 1}
                isActive={activeLessonId === lesson.id}
                onClick={() => { setActiveLessonId(lesson.id); setShowQuiz(false); }}
              />
            ))}
          </div>
          <div className="p-4 border-t border-border">
            <div className="flex items-center justify-between text-sm text-text-muted">
              <span>{completedLessons}/{course.totalLessons} completadas</span>
              <span>{course.progress}%</span>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0">
          {activeLesson && (
            <>
              {/* Lesson Header */}
              <div className="border-b border-border bg-cactus/30 px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <button onClick={handlePrevLesson} disabled={course.lessons[0].id === activeLessonId} className="p-2 rounded-lg hover:bg-cactus transition-colors disabled:opacity-50">
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <div>
                      <p className="text-sm text-text-muted">Lección {course.lessons.findIndex(l => l.id === activeLessonId) + 1} de {course.totalLessons}</p>
                      <h2 className="font-semibold text-text-primary">{activeLesson.title}</h2>
                    </div>
                    <button onClick={handleNextLesson} disabled={course.lessons[course.totalLessons - 1].id === activeLessonId} className="p-2 rounded-lg hover:bg-cactus transition-colors disabled:opacity-50">
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    {activeLesson.hasQuiz && (
                      <button
                        onClick={() => setShowQuiz(!showQuiz)}
                        className={clsx('px-3 py-1.5 rounded-lg text-sm font-medium transition-colors', showQuiz ? 'bg-primary text-white' : 'bg-panel border border-border text-text-primary hover:bg-cactus')}
                      >
                        <Award className="w-4 h-4 mr-1" />
                        {showQuiz ? 'Ocultar Quiz' : 'Quiz'}
                      </button>
                    )}
                    <button
                      onClick={handleLessonComplete}
                      disabled={activeLesson.completed}
                      className={clsx('px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2', activeLesson.completed ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'bg-primary text-white hover:bg-primary-light')}
                    >
                      {activeLesson.completed ? (
                        <>
                          <CheckCircle className="w-4 h-4" />
                          Completada
                        </>
                      ) : (
                        <>
                          <Flag className="w-4 h-4" />
                          Marcar completada
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Lesson Content or Quiz */}
              <div className="flex-1 overflow-y-auto p-6">
                {showQuiz && activeLesson.hasQuiz ? (
                  <QuizPanel 
                    quiz={mockQuiz}
                    answers={quizAnswers}
                    onAnswerChange={handleAnswerChange}
                    submitted={quizSubmitted}
                    result={quizResult}
                    onSubmit={handleQuizSubmit}
                    onRetry={handleQuizRetry}
                  />
                ) : (
                  <LessonContent content={activeLesson.content} />
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function LessonItem({ lesson, index, isActive, onClick }: { lesson: Lesson; index: number; isActive: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        'w-full text-left p-3 rounded-xl transition-colors flex items-center gap-3',
        isActive
          ? 'bg-primary/10 text-primary border border-primary/20'
          : 'hover:bg-cactus text-text-secondary'
      )}
    >
      <div className={clsx('w-8 h-8 rounded-lg flex items-center justify-center text-sm font-medium flex-shrink-0', 
        lesson.completed ? 'bg-green-500 text-white' : 
        isActive ? 'bg-primary text-white' : 
        'bg-cactus text-text-muted'
      )}>
        {lesson.completed ? <CheckCircle className="w-4 h-4" /> : index}
      </div>
      <div className="flex-1 min-w-0">
        <p className={clsx('font-medium truncate', lesson.completed ? 'line-through text-text-muted' : '')}>{lesson.title}</p>
        <div className="flex items-center gap-2 text-xs text-text-muted">
          {lesson.hasQuiz && <Award className="w-3 h-3" />}
          {lesson.quizScore !== undefined && (
            <span className={clsx('px-1.5 py-0.5 rounded', lesson.quizScore === lesson.quizTotal ? 'bg-green-500/10 text-green-500' : 'bg-accent-text/10 text-accent-text')}>
              {lesson.quizScore}/{lesson.quizTotal}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

function LessonContent({ content }: { content: string }) {
  // Simple markdown-like rendering
  const renderContent = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line, i) => {
      if (line.startsWith('### ')) return <h3 key={i} className="text-lg font-semibold mt-4 mb-2">{line.slice(4)}</h3>;
      if (line.startsWith('## ')) return <h2 key={i} className="text-xl font-bold mt-6 mb-3">{line.slice(3)}</h2>;
      if (line.startsWith('# ')) return <h1 key={i} className="text-2xl font-display font-bold mt-8 mb-4">{line.slice(2)}</h1>;
      if (line.startsWith('```')) return <div key={i} className="bg-cactus border border-border rounded-lg p-4 font-mono text-sm overflow-x-auto my-3">{line.slice(3)}</div>;
      if (line.startsWith('```')) return null; // closing
      if (line.startsWith('- ')) return <li key={i} className="ml-6 mb-1 flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />{line.slice(2)}</li>;
      if (line.trim() === '') return <br key={i} />;
      return <p key={i} className="mb-3 leading-relaxed">{line}</p>;
    });
  };

  return (
    <div className="max-w-3xl mx-auto prose prose-sm dark:prose-invert max-w-none">
      {renderContent(content)}
    </div>
  );
}

function QuizPanel({ quiz, answers, onAnswerChange, submitted, result, onSubmit, onRetry }: {
  quiz: any[];
  answers: Record<number, number>;
  onAnswerChange: (q: number, a: number) => void;
  submitted: boolean;
  result: { score: number; total: number } | null;
  onSubmit: () => void;
  onRetry: () => void;
}) {
  if (submitted && result) {
    const passed = result.score === result.total;
    return (
      <div className="max-w-2xl mx-auto animate-fade-in">
        <div className={clsx('text-center mb-6 p-6 rounded-2xl', passed ? 'bg-green-500/10 border border-green-500/20' : 'bg-accent-video/10 border border-red-500/20')}>
          <div className={clsx('text-4xl font-display font-bold mb-2', passed ? 'text-green-500' : 'text-red-500')}>
            {passed ? '🏆 ¡Perfecto!' : '❌ Inténtalo de nuevo'}
          </div>
          <div className="text-2xl font-display font-bold">{result.score}/{result.total}</div>
          <p className="text-text-secondary mt-2">{passed ? 'Quiz dominado al 100%' : `Repasa la lección y reintenta: la meta es 100%`}</p>
        </div>
        <button onClick={onRetry} className="w-full px-6 py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary-light flex items-center justify-center gap-2">
          <Zap className="w-4 h-4" />
          Reintentar Quiz
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      <div className="mb-6 p-4 bg-panel border border-border rounded-xl">
        <h3 className="font-semibold mb-2">Quiz de la lección</h3>
        <p className="text-text-secondary text-sm">{quiz.length} preguntas · Selecciona la respuesta correcta</p>
      </div>
      <div className="space-y-4">
        {quiz.map((q, i) => (
          <div key={q.id} className="bg-panel border border-border rounded-xl p-4">
            <p className="font-medium mb-3">{i + 1}. {q.question}</p>
            <div className="space-y-2">
              {q.options.map((opt: string, oi: number) => (
                <button
                  key={oi}
                  onClick={() => onAnswerChange(i, oi)}
                  disabled={submitted}
                  className={clsx(
                    'w-full text-left p-3 rounded-lg border-2 transition-colors text-sm',
                    submitted
                      ? (oi === q.correct ? 'border-green-500 bg-green-500/10' : answers[i] === oi ? 'border-red-500 bg-red-500/10' : 'border-border')
                      : (answers[i] === oi ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50')
                  )}
                >
                  {opt}
                  {submitted && oi === q.correct && <span className="ml-2 text-green-500">✓ Correcta</span>}
                  {submitted && answers[i] === oi && answers[i] !== q.correct && <span className="ml-2 text-red-500">✗ Tu respuesta</span>}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      {!submitted && (
        <button onClick={onSubmit} className="w-full py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary-light transition-colors">
          Enviar respuestas
        </button>
      )}
    </div>
  );
}