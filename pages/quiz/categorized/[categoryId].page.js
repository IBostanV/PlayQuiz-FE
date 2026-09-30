import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import moment from 'moment/moment';
import { hasCookie } from 'cookies-next';
import { getCategorizedQuiz } from '../../../api/quiz';
import saveUserQuiz from '../../../api/quiz/save';
import { enterConquestAttempt } from '../../../api/conquest';
import { getChallengeQuiz, getDailyChallengeQuiz } from '../../../api/social';
import { useTranslation } from 'react-i18next';
import formatTime from '../../../utils/formatTime';
import {SingleOption} from "../../../components/quiz/single-option";
import {MultipleOption} from "../../../components/quiz/multiple-option";
import dynamic from 'next/dynamic';
import { ConfirmDialog } from '../../../components/common/popup';
import { ReportQuestion } from '../../../components/feedback/report-question';
import { mapLevelOf, placeOptions } from '../../../components/map/geo';

// The map pulls in d3 and the world atlas, so it loads only when a map question shows up.
const MapChoice = dynamic(() => import('../../../components/map/map-choice'), { ssr: false });

const QUIZ_TYPE = {
  SINGLE_OPTION: 1,
  MULTIPLE_OPTION: 2,
  INPUT: 4
};

function Quiz() {
  const { t } = useTranslation();
  const router = useRouter();
  const { categoryId, quizType, complexity, length, conquest, challenge, daily } = router.query;

  const [spentTime, setSpentTime] = useState(0);
  const [userAnswers, setUserAnswers] = useState([]);
  // The quiz arrives with its questions, options and all; they are asked in the order given.
  const [questions, setQuestions] = useState([]);
  const [completed, setCompleted] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState({});
  const [currentQuestionTime, setCurrentQuestionTime] = useState(0);
  // Questions skipped after reporting them; they count towards progress like answered ones.
  const [skipped, setSkipped] = useState(0);
  // The question on screen, read when a report comes back (see skipQuestion).
  const shownQuestionId = useRef(null);
  const [quiz, setQuiz] = useState({
    quizTime: null,
    questionIds: []
  });

  useEffect(() => {
    // router.query is empty until the route resolves, so fetching on mount can send
    // categoryId/quizType as undefined. isReady flips once, so this still fires exactly once.
    if (!router.isReady) {
      return;
    }

    // A challenge or the daily challenge is a stored quiz played again, the same questions under
    // the same quiz id, so the runs can be set side by side; anything else is drawn fresh.
    const createQuiz = async () => {
      if (challenge) return getChallengeQuiz(challenge);
      if (daily) return getDailyChallengeQuiz();
      return getCategorizedQuiz(categoryId, quizType, complexity, length);
    };
    let timer;

    createQuiz()
      .then((quiz) => {
        if (quiz) {
          // The questions are not part of the run that is saved, so they are kept apart from
          // the quiz that is posted back.
          const { questionList, ...quizWithoutQuestions } = quiz;
          setQuiz(quizWithoutQuestions);
          setCurrentQuestionTime(Date.now());
          setQuestions(Array.from(questionList ?? []));

          const startTime = moment();
          timer = setInterval(() => {
            const time = moment(moment())
              .diff(startTime, 'seconds');
            setSpentTime(time);
          }, 100);
        }
      });

    return () => clearInterval(timer);
  }, [router.isReady]);

  useEffect(() => {
    if (questions.length) {
      handleCurrentQuestion(questions.shift());
    }
  }, [questions]);

  // Leaving mid-quiz asks first. In-app navigation (links, navbar, back/forward) is held and
  // shown in the popup; closing or reloading the tab can only get the browser's own prompt.
  const inProgress = quiz.questionIds.length > 0 && !completed;
  const [leaveTo, setLeaveTo] = useState(null);
  const leaving = useRef(false);

  useEffect(() => {
    if (!inProgress) return undefined;
    // This page's own history entry, to put back when back/forward is held.
    const ownState = window.history.state;
    const ownUrl = router.asPath;

    const onRouteChange = (url) => {
      if (leaving.current || url === ownUrl) return;
      setLeaveTo(url);
      router.events.emit('routeChangeError');
      // Next.js has no API to cancel a route change; throwing is the documented workaround.
      throw 'Quiz in progress: navigation held for confirmation';
    };
    const onPopState = ({ as }) => {
      if (leaving.current) return true;
      // The browser has already moved; step back onto the quiz and ask.
      window.history.pushState(ownState, '', ownUrl);
      setLeaveTo(as);
      return false;
    };
    const onUnload = (event) => {
      event.preventDefault();
      event.returnValue = '';
    };

    router.events.on('routeChangeStart', onRouteChange);
    router.beforePopState(onPopState);
    window.addEventListener('beforeunload', onUnload);
    return () => {
      router.events.off('routeChangeStart', onRouteChange);
      router.beforePopState(() => true);
      window.removeEventListener('beforeunload', onUnload);
    };
  }, [inProgress]);

  const leaveQuiz = () => {
    leaving.current = true;
    router.push(leaveTo);
  };

  useEffect(() => {
    if (completed) {
      saveQuizResult();
    }
  }, [completed]);

  const saveQuizResult = () => {
    const saveResult = async () => await saveUserQuiz({
      quiz,
      spentTime,
      answersJson: JSON.stringify(userAnswers)
    });
    saveResult()
      .then(async (result) => {
        if (!result) return;
        const historyId = result.data.historyId;
        // Started from the conquest map: the run is entered as a go at that country before the
        // result shows, so the map has it by the time the player goes back. The run is theirs
        // either way, so a refused attempt (round shut, cooldown) only toasts.
        if (conquest) {
          await enterConquestAttempt(Number(conquest), historyId);
        }
        const from = conquest ? '&conquest=1' : challenge ? `&challenge=${challenge}` : daily ? '&daily=1' : '';
        router.push(`/quiz/result?historyId=${historyId}${from}`);
      });
  };

  // Both renderers funnel in here: single option submits one termId, multiple option
  // submits the array of termIds the user confirmed.
  const recordAnswer = (answer) => {
    const now = Date.now();
    setUserAnswers((values) => [...values, {
      [currentQuestion.id]: {
        answer,
        time: now - currentQuestionTime,
      },
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

  // 'All' (0), a missing param and any unknown type fall back to single option — the
  // payload carries no per-question type to switch on, only the one picked for the quiz.
  const handleQuizType = () => {
    // A map question is recognised per question, by its answers' glossary type ("map:…").
    const mapLevel = mapLevelOf(currentQuestion?.answers?.[0]?.mapLevel);
    if (mapLevel && placeOptions(currentQuestion.answers, mapLevel).length >= 2) {
      return (<MapChoice options={currentQuestion.answers} level={mapLevel} onConfirm={recordAnswer} />);
    }

    switch (parseInt(quizType, 10)) {
      case QUIZ_TYPE.MULTIPLE_OPTION:
        return (<MultipleOption currentQuestion={currentQuestion} handleMultipleAnswer={recordAnswer} />)
      case QUIZ_TYPE.INPUT:
        return <div>Input</div>
      default:
        return (<SingleOption currentQuestion={currentQuestion} handleAnswer={recordAnswer} />)
    }
  }

  const total = quiz.questionIds.length;
  const answered = userAnswers.length + skipped;

  return (
    <div className="quiz-play">
      <header className="quiz-hud">
        <span className="quiz-hud-step">
          {t('question', 'Question')} <b>{Math.min(answered + 1, total)}</b> / {total}
        </span>
        <span className="quiz-hud-timer">{formatTime(spentTime)}</span>
      </header>
      <div className="quiz-progress">
        <div className="quiz-progress-bar" style={{ width: `${total ? (answered / total) * 100 : 0}%` }} />
      </div>

      {currentQuestion?.id ? (
        // Keyed by question so each new one replays the entrance animation.
        <section className="quiz-stage" key={currentQuestion.id}>
          <h2 className="quiz-question">{currentQuestion.content}</h2>
          {handleQuizType()}
        </section>
      ) : (
        <div className="quiz-loading" aria-label={t('loading', 'Loading')} />
      )}

      {/* Outside the keyed stage, so an open report is not unmounted by the next question. */}
      {currentQuestion?.id && <ReportQuestion question={currentQuestion} onSkip={skipQuestion} />}

      <ConfirmDialog open={Boolean(leaveTo)}
                     danger
                     title={t('leave_quiz_title', 'Leave the quiz?')}
                     message={t('leave_quiz_message', 'Your progress in this quiz will be lost and it will not be scored.')}
                     confirmLabel={t('leave_quiz', 'Leave quiz')}
                     cancelLabel={t('keep_playing', 'Keep playing')}
                     onConfirm={leaveQuiz}
                     onCancel={() => setLeaveTo(null)} />
    </div>
  );
}

export const getServerSideProps = async ({
  req,
  res
}) => ({
  props:
    {
      hostUrl: process.env.NEXT_PUBLIC_BE_HOST_URL,
      isLoggedIn: hasCookie('authorization', {
        req,
        res
      }),
    },
});

export default Quiz;
