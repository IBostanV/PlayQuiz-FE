import React, {useEffect, useMemo, useState} from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import {useTranslation} from 'react-i18next';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {faChessRook, faCrown, faFlag, faLock, faPlay, faStopwatch} from '@fortawesome/free-solid-svg-icons';
import {getConquestState, setConquestTeam} from '../../api/conquest';
import getUserGroups from '../../api/user/getUserGroups';
import {groupTitle, toGroups} from '../../utils/groups';
import {teamFill} from '../../utils/team-colour';
import {Avatar} from '../../components/common/avatar';
import {formatDate} from '../../utils/toDate';

// The atlas and d3 are ~750 KB, so the map loads in the browser only, once this page is open.
const ConquestMap = dynamic(() => import('../../components/conquest/conquest-map'), {ssr: false});

const when = (value) => formatDate(value, undefined, {dateStyle: 'medium', timeStyle: 'short'});

const seconds = (value) => value == null ? '—' : `${Math.round(value)}s`;

// Conquer the world by answering questions about it. Each round opens a handful of countries;
// the best run on each — most right, then fastest — holds it until somebody beats that record.
function Conquest() {
    const {t} = useTranslation();

    const [state, setState] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedCode, setSelectedCode] = useState(null);

    const load = () => getConquestState()
        .then(result => setState(result ?? null))
        .finally(() => setLoading(false));

    // The chat groups the reader could play for, as a team.
    const [groups, setGroups] = useState([]);

    useEffect(() => {
        load();
        getUserGroups().then(rows => setGroups(toGroups(rows)));
    }, []);

    const chooseTeam = (value) => setConquestTeam(value ? Number(value) : null).then(result => result && setState(result));

    const countries = state?.countries ?? [];
    const open = useMemo(() => countries.filter(country => country.open), [countries]);
    const held = useMemo(() => countries.filter(country => country.heldBy), [countries]);
    const selected = countries.find(country => country.code === selectedCode)
        // Nothing picked yet: the first country that can actually be played reads best.
        ?? open[0] ?? held[0] ?? countries[0];

    if (loading) {
        return (
            <div className={'conquest-page'}>
                <div className={'quiz-loading'} aria-label={t('loading', 'Loading')}/>
            </div>
        );
    }

    if (!countries.length) {
        return (
            <div className={'conquest-page'}>
                <header className={'conquest-hero'}>
                    <h1 className={'conquest-title'}>{t('conquest', 'Conquest')}</h1>
                    <p className={'conquest-lead'}>
                        {t('conquest_no_countries',
                            'No countries are set up yet. A content editor adds them as categories under Countries, '
                            + 'each named by its three-letter code.')}
                    </p>
                </header>
            </div>
        );
    }

    return (
        <div className={'conquest-page'}>
            <header className={'conquest-hero'}>
                <div>
                    <h1 className={'conquest-title'}>{t('conquest', 'Conquest')}</h1>
                    <p className={'conquest-lead'}>
                        {t('conquest_lead', 'Answer a country right, and fastest, to take it. Hold it until someone beats you.')}
                    </p>
                </div>

                <div className={'conquest-round'} data-open={state.open}>
                    <span className={'conquest-round-label'}>
                        {t('conquest_round', 'Round {{round}}', {round: state.round})}
                    </span>
                    <span className={'conquest-round-state'}>
                        {state.open
                            ? <><FontAwesomeIcon icon={faPlay}/> {t('conquest_open', 'Open until {{time}}', {time: when(state.openUntil)})}</>
                            : <><FontAwesomeIcon icon={faLock}/> {t('conquest_opens_again', 'Opens again {{time}}', {time: when(state.nextOpenAt)})}</>}
                    </span>
                </div>
            </header>

            <div className={'conquest-body'}>
                <div className={'conquest-map-frame'}>
                    <ConquestMap countries={countries} selectedCode={selected?.code} onSelect={setSelectedCode}/>

                    <ul className={'conquest-legend'}>
                        <li data-state={'open'}>{t('conquest_legend_open', 'Open this round')}</li>
                        <li data-state={'held'}>{t('conquest_legend_held', 'Conquered')}</li>
                        <li data-state={'idle'}>{t('conquest_legend_idle', 'Not taken yet')}</li>
                        {/* Held by a team: its colour, named. */}
                        {(state.teams ?? []).map(standing => (
                            <li key={standing.team.id} data-state={'team'} style={{'--team-fill': teamFill(standing.team.id)}}>
                                {standing.team.name ?? t('conquest_unnamed_team', 'A group')}
                            </li>
                        ))}
                    </ul>
                </div>

                <aside className={'conquest-panel'}>
                    {selected && (
                        <section className={'conquest-selected'}>
                            <h2 className={'conquest-country-name'}>
                                {selected.name}
                                <span className={'conquest-country-code'}>{selected.code}</span>
                            </h2>

                            {selected.heldBy ? (
                                <div className={'conquest-holder'}>
                                    <Avatar name={selected.heldBy.displayName} photo={selected.heldBy.photo}
                                            className={'conquest-holder-avatar'}/>
                                    <div>
                                        <p className={'conquest-holder-name'}>
                                            <FontAwesomeIcon icon={faCrown}/>
                                            <Link href={`/profile/${selected.heldBy.id}`}>{selected.heldBy.displayName}</Link>
                                        </p>
                                        {selected.team && (
                                            <p className={'conquest-holder-team'}>
                                                <FontAwesomeIcon icon={faFlag} style={{color: teamFill(selected.team.id)}}/>
                                                {' '}{selected.team.name ?? t('conquest_unnamed_team', 'A group')}
                                            </p>
                                        )}
                                        <p className={'conquest-holder-score'}>
                                            {selected.rightAnswers}/{selected.totalAnswers}
                                            <span className={'conquest-holder-time'}>
                                                <FontAwesomeIcon icon={faStopwatch}/> {seconds(selected.spentTime)}
                                            </span>
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <p className={'conquest-unclaimed'}>
                                    <FontAwesomeIcon icon={faChessRook}/> {t('conquest_unclaimed', 'Nobody holds this yet.')}
                                </p>
                            )}

                            {selected.attemptAllowed ? (
                                <Link className={'conquest-play'}
                                      href={`/quiz/categorized/${selected.categoryId}?conquest=${selected.categoryId}`}>
                                    <FontAwesomeIcon icon={faPlay}/>
                                    <span>{t('conquest_take', 'Take {{country}}', {country: selected.name})}</span>
                                </Link>
                            ) : (
                                <p className={'conquest-blocked'}>
                                    <FontAwesomeIcon icon={faLock}/> {selected.attemptBlockedReason}
                                </p>
                            )}
                        </section>
                    )}

                    {/* Teams: a chat group, whose members' countries count together. */}
                    <section className={'conquest-teams'}>
                        <h2 className={'conquest-list-title'}>{t('conquest_teams', 'Teams')}</h2>
                        <label className={'conquest-team-pick'}>
                            {t('conquest_your_team', 'You play for')}
                            <select value={state.yourTeam?.id ?? ''} onChange={event => chooseTeam(event.target.value)}>
                                <option value={''}>{t('conquest_no_team', 'Yourself')}</option>
                                {groups.map(group => (
                                    <option key={group.groupId} value={group.groupId}>{groupTitle(group, '?')}</option>
                                ))}
                            </select>
                        </label>
                        {state.teams?.length > 0 ? (
                            <ol className={'conquest-team-list'}>
                                {state.teams.map((standing, index) => (
                                    <li key={standing.team.id} className={'conquest-team'}
                                        data-yours={standing.team.id === state.yourTeam?.id || undefined}>
                                        <span className={'conquest-team-rank'}>{index + 1}</span>
                                        <span className={'conquest-team-swatch'} aria-hidden
                                              style={{'--team-fill': teamFill(standing.team.id)}}/>
                                        <span className={'conquest-team-name'}>{standing.team.name ?? t('conquest_unnamed_team', 'A group')}</span>
                                        <span className={'conquest-team-count'}>
                                            {t('conquest_team_countries', '{{count}} countries', {count: standing.countries})}
                                        </span>
                                    </li>
                                ))}
                            </ol>
                        ) : (
                            <p className={'conquest-list-empty'}>
                                {t('conquest_teams_none', 'No team holds a country yet. Pick a group and take one.')}
                            </p>
                        )}
                    </section>

                    <section>
                        <h2 className={'conquest-list-title'}>
                            {t('conquest_open_now', 'Open this round')}
                        </h2>
                        {/* The same countries the map lights, as a list: small ones are hard to hit. */}
                        <ul className={'conquest-list'}>
                            {open.map(country => (
                                <li key={country.categoryId}>
                                    <button type={'button'}
                                            className={'conquest-list-entry'}
                                            data-selected={country.code === selected?.code}
                                            onClick={() => setSelectedCode(country.code)}>
                                        <span className={'conquest-list-name'}>{country.name}</span>
                                        {country.heldBy && (
                                            <span className={'conquest-list-holder'}>
                                                <FontAwesomeIcon icon={faCrown}/> {country.heldBy.displayName}
                                            </span>
                                        )}
                                    </button>
                                </li>
                            ))}
                            {!open.length && (
                                <li className={'conquest-list-empty'}>
                                    {t('conquest_none_open_today', 'Nothing is open today. It opens again {{time}}.',
                                        {time: when(state.nextOpenAt)})}
                                </li>
                            )}
                        </ul>
                    </section>
                </aside>
            </div>
        </div>
    );
}

export default Conquest;
