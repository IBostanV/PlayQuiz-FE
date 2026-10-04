import React, { useEffect, useRef, useState } from 'react';
import {getExpressQuiz} from '../../../api/quiz';
import saveUserQuiz from '../../../api/quiz/save';
import { useRouter } from 'next/router';
import moment from 'moment';
import { useTranslation } from 'react-i18next';
import { questionText } from '../../../utils/translated';
import formatTime from '../../../utils/formatTime';
import {SingleOption} from "../../../components/quiz/single-option";
import {ReportQuestion} from "../../../components/feedback/report-question";
import {ExtraTimeButton, HintButton, withoutOptions} from "../../../components/quiz/coin-actions";
import {useQuizInProgress} from '../../../utils/quiz-in-progress';

// Remaining seconds at which the countdown turns red.
const LOW_TIME = 10;

function ExpressQuiz() {
  const { t, i18n } = useTranslation();
  const router = useRouter();

  const [overallTime, setOverallTime] = useState(0);
  const [userAnswers, setUserAnswers] = useState([]);
  // The quiz arrives with its questions, options and all; they are asked in the order given.
  const [questions, setQuestions] = useState([]);
  const [completed, setCompleted] = useState(false);
  // From arrival on: the page is the quiz, and announcements wait until it is done.
  useQuizInProgress(!completed);
  const [currentQuestion, setCurrentQuestion] = useState({});
  const [currentQuestionTime, setCurrentQuestionTime] = useState(0);
  // Questions skipped after reporting them; they count towards progress like answered ones.
  const [skipped, setSkipped] = useState(0);
  // The question on screen, read when a report comes back (see skipQuestion). Cleared once the
  // quiz is over, which the overall timer can do while a report is open.
  const shownQuestionId = useRef(null);
  // When the quiz runs out; a ref so bought extra time can push it back under the running timer.
  const deadline = useRef(null);
  const [quiz, setQuiz] = useState({
    quizTime: null,
    questionIds: []
  });

  useEffect(() => {
    const fetchExpressQuiz = async () => await getExpressQuiz();
    let timer;

    fetchExpressQuiz()
      .then(expressQuiz => {
        if (expressQuiz) {
          // The questions are not part of the run that is saved, so they are kept apart from
          // the quiz that is posted back.
          const { questionList, ...quizWithoutQuestions } = expressQuiz;
          setQuiz(quizWithoutQuestions);
          setCurrentQuestionTime(Date.now());
          setQuestions(Array.from(questionList ?? []));

          deadline.current = moment()
            .add(expressQuiz.quizTime + 1, 'seconds');
          timer = setInterval(() => {
            const remainingTime = moment(deadline.current)
              .diff(moment(), 'seconds');
            if (remainingTime !== 0 && remainingTime > -1) {
              setOverallTime(remainingTime);
            } else {
              setCompleted(true);
            }
          }, 100);
        }
      });

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (questions.length) {
      handleCurrentQuestion(questions.shift());
    }
  }, [questions]);

  useEffect(() => {
    if (completed) {
      shownQuestionId.current = null;
      saveQuizResult(quiz.quizTime - overallTime);
    }
  }, [completed]);

  const saveQuizResult = (spentTime) => {
    const saveResult = async () => await saveUserQuiz({
        quiz,
        spentTime,
        answersJson: JSON.stringify(userAnswers)
      });

    saveResult()
      .then(result => {
        if (result) {
          router.push('/quiz/result?express=1&historyId=' + result.data.historyId)
            .then(pushEvent => console.log(pushEvent));
        }
      });
  };

  const handleAnswer = (termId) => {
    const now = Date.now();
    setUserAnswers(values => [...values, {
      [currentQuestion.id]: {
        answer: termId,
        time: now - currentQuestionTime
      }
    }]);
    setCurrentQuestionTime(now);

    if (questions.length) {
      handleCurrentQuestion(questions.shift());
    } else {
      setCompleted(true);
    }
  };

  const handleCurrentQuestion = (question) => {
    shownQuestionId.current = question?.id ?? null;
    setCurrentQuestion(question);
  };

  // A reported question the player chose to skip: nothing is recorded, so the result shows it
  // unanswered with its right answer. Only if it is still the question on screen: the report
  // popup stays open while the quiz carries on underneath.
  const skipQuestion = (questionId) => {
    if (shownQuestionId.current !== questionId) return;
    shownQuestionId.current = null;
    setSkipped(value => value + 1);
    setCurrentQuestionTime(Date.now());

    if (questions.length) {
      handleCurrentQuestion(questions.shift());
    } else {
      setCompleted(true);
    }
  };

  const total = quiz.questionIds.length;
  const answered = userAnswers.length + skipped;

  return (
    <div className="quiz-play">
      <header className="quiz-hud">
        <span className="quiz-hud-step">
          {t('question', 'Question')} <b>{Math.min(answered + 1, total)}</b> / {total}
        </span>
        <span className={`quiz-hud-timer${quiz.quizTime && overallTime <= LOW_TIME ? ' is-low' : ''}`}>
          {formatTime(overallTime)}
          {quiz.quizTime && (
            // Border that drains with the time left; viewBox matches the timer's fixed size and cut corners.
            <svg className="quiz-hud-timer-ring" viewBox="0 0 132 46" aria-hidden="true">
              <polygon
                points="10.5,1 131,1 131,35.5 120.5,45 1,45 1,10.5"
                pathLength="100"
                strokeDasharray="100"
                strokeDashoffset={100 - Math.min(overallTime / quiz.quizTime, 1) * 100}
              />
            </svg>
          )}
        </span>
      </header>
      <div className="quiz-progress">
        <div className="quiz-progress-bar" style={{ width: `${total ? (answered / total) * 100 : 0}%` }} />
      </div>

      {currentQuestion?.id ? (
        // Keyed by question so each new one replays the entrance animation.
        <section className="quiz-stage" key={currentQuestion.id}>
          <h2 className="quiz-question">{questionText(currentQuestion, i18n.language)}</h2>
          <SingleOption currentQuestion={currentQuestion} handleAnswer={handleAnswer} />
          <div className="quiz-coin-actions">
            <HintButton question={currentQuestion}
                        onRemove={(termIds) => setCurrentQuestion(question => withoutOptions(question, termIds))} />
            {!completed && (
              <ExtraTimeButton onAdd={(seconds) => deadline.current?.add(seconds, 'seconds')} />
            )}
          </div>
        </section>
      ) : (
        <div className="quiz-loading" aria-label={t('loading', 'Loading')} />
      )}

      {/* Outside the keyed stage, so an open report is not unmounted by the next question. */}
      {currentQuestion?.id && <ReportQuestion question={currentQuestion} onSkip={skipQuestion} />}
    </div>
  );
}

export default ExpressQuiz;
