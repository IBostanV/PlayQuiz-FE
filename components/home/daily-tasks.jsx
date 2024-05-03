import React, {useEffect, useState} from 'react';
import {useTranslation} from 'react-i18next';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {faCheck, faListCheck} from '@fortawesome/free-solid-svg-icons';
import {getDailyTasks} from '../../api/daily-task';
import {EXPERIENCE_CHANGED} from '../../api/quiz/save';

// What each task the server knows about is called. The goals themselves, their targets and what
// they pay are the server's; only the wording is here, where the rest of the translations are.
const LABELS = {
    PLAY_QUIZZES: ['daily_play_quizzes', 'Finish {{target}} quizzes'],
    RIGHT_ANSWERS: ['daily_right_answers', 'Answer {{target}} questions right'],
    FLAWLESS_RUN: ['daily_flawless_run', 'Finish a quiz with no mistakes'],
};

// Home page "Today's tasks": a handful of goals that start over each day, each worth experience.
// Progress is worked out from the day's quiz runs, and a finished task is paid the moment this
// list is read — so a task that comes back awarded is what tells the navbar to re-read the level.
export const DailyTasks = () => {
    const {t} = useTranslation();
    const [tasks, setTasks] = useState([]);

    useEffect(() => {
        getDailyTasks().then(list => {
            if (!Array.isArray(list)) return;
            setTasks(list);
            if (list.some(task => task.awarded)) {
                window.dispatchEvent(new Event(EXPERIENCE_CHANGED));
            }
        });
    }, []);

    if (!tasks.length) return null;

    const done = tasks.filter(task => task.completed).length;

    return (
        <section className='daily-tasks' aria-labelledby='daily-tasks-title'>
            <header className='daily-tasks-header'>
                <span className='daily-tasks-icon' aria-hidden><FontAwesomeIcon icon={faListCheck}/></span>
                <div>
                    <h2 id='daily-tasks-title' className='daily-tasks-title'>{t('daily_tasks', 'Today\'s tasks')}</h2>
                    <span className='daily-tasks-count'>
                        {t('daily_tasks_done', '{{done}} of {{total}} done', {done, total: tasks.length})}
                    </span>
                </div>
            </header>

            <ul className='daily-tasks-list'>
                {tasks.map(task => (
                    <li key={task.code} className='daily-task' data-done={task.completed}>
                        <span className='daily-task-mark' aria-hidden><FontAwesomeIcon icon={faCheck}/></span>
                        <span className='daily-task-body'>
                            <span className='daily-task-name'>
                                {LABELS[task.code]
                                    ? t(...LABELS[task.code], {target: task.target})
                                    : task.code}
                            </span>
                            <span className='daily-task-bar'>
                                <span className='daily-task-fill'
                                      style={{width: `${Math.round(task.progress / task.target * 100)}%`}}/>
                            </span>
                        </span>
                        <span className='daily-task-reward'>
                            <span className='daily-task-progress'>{task.progress}/{task.target}</span>
                            <span className='daily-task-experience'>+{task.experience} XP</span>
                        </span>
                    </li>
                ))}
            </ul>
        </section>
    );
};
