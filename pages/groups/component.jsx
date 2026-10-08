import React, {useEffect, useState} from 'react';
import {useRouter} from 'next/router';
import {useTranslation} from 'react-i18next';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {faUsers} from '@fortawesome/free-solid-svg-icons';
import {createGroup, getGroups} from '../../api/groups';
import {GroupCard} from '../../components/group/group-card';

// Groups players make and post in: the reader's own, then every other one to find, and a form to
// start a new one. A private group lists here too, so people can ask to join it.
function Groups() {
    const {t} = useTranslation();
    const router = useRouter();
    const [groups, setGroups] = useState(null);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [privateGroup, setPrivateGroup] = useState(false);
    const [busy, setBusy] = useState(false);
    const [query, setQuery] = useState('');

    useEffect(() => {
        getGroups().then(result => setGroups(result?.mine ? result : {mine: [], others: []}));
    }, []);

    const create = (event) => {
        event.preventDefault();
        if (!name.trim() || busy) return;
        setBusy(true);
        createGroup(name.trim(), description.trim(), privateGroup)
            .then(group => group?.id && router.push(`/groups/${group.id}`))
            .finally(() => setBusy(false));
    };

    const needle = query.trim().toLowerCase();
    const others = (groups?.others ?? []).filter(group => !needle
        || group.name.toLowerCase().includes(needle)
        || (group.description ?? '').toLowerCase().includes(needle));

    return (
        <section className='news-page groups-page' aria-busy={groups === null}>
            <header className='trophies-header'>
                <span className='news-icon' aria-hidden><FontAwesomeIcon icon={faUsers}/></span>
                <div>
                    <h1 className='trophies-title'>{t('groups', 'Groups')}</h1>
                    <p className='trophies-lead'>
                        {t('groups_lead', 'Communities around a topic: join one, or start your own. Public groups are open to all; private ones let in who their owner approves.')}
                    </p>
                </div>
            </header>

            <form className='news-compose' onSubmit={create}>
                <input value={name} maxLength={80} required
                       placeholder={t('group_name', 'Group name')} aria-label={t('group_name', 'Group name')}
                       onChange={event => setName(event.target.value)}/>
                <textarea value={description} maxLength={500} rows={2}
                          placeholder={t('group_description', 'What is it about? (optional)')}
                          aria-label={t('group_description', 'What is it about? (optional)')}
                          onChange={event => setDescription(event.target.value)}/>
                <div className='groups-create-row'>
                    <label className='appearance-toggle'>
                        <input type='checkbox' checked={privateGroup} onChange={event => setPrivateGroup(event.target.checked)}/>
                        {t('group_make_private', 'Private: only members read it, and I approve who joins')}
                    </label>
                    <button type='submit' className='profile-secondary-button' disabled={busy || !name.trim()}>
                        {t('group_create', 'Create group')}
                    </button>
                </div>
            </form>

            {groups && (
                <>
                    <section aria-labelledby='groups-mine-title'>
                        <h2 id='groups-mine-title' className='profile-section-title'>{t('groups_mine', 'Your groups')}</h2>
                        {groups.mine.length
                            ? <div className='group-grid'>{groups.mine.map(group => <GroupCard key={group.id} group={group}/>)}</div>
                            : <p className='feed-empty'>{t('groups_mine_none', 'You are not in any group yet.')}</p>}
                    </section>

                    <section aria-labelledby='groups-others-title'>
                        <div className='groups-others-head'>
                            <h2 id='groups-others-title' className='profile-section-title'>{t('groups_discover', 'Discover')}</h2>
                            <input type='search' className='groups-search' value={query}
                                   placeholder={t('groups_search', 'Search groups…')}
                                   aria-label={t('groups_search', 'Search groups…')}
                                   onChange={event => setQuery(event.target.value)}/>
                        </div>
                        {others.length
                            ? <div className='group-grid'>{others.map(group => <GroupCard key={group.id} group={group}/>)}</div>
                            : <p className='feed-empty'>{needle
                                ? t('groups_no_match', 'No groups match.')
                                : t('groups_none', 'No other groups yet. Start the first one!')}</p>}
                    </section>
                </>
            )}
        </section>
    );
}

export default Groups;
