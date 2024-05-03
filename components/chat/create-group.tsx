import React, {useEffect, useState} from 'react';
import {useRouter} from 'next/router';
import {useTranslation} from 'react-i18next';
import {InputText} from 'primereact/inputtext';
import {MultiSelect} from 'primereact/multiselect';
import {getAllUsers} from '../../api/user';
import createGroup from '../../api/user/create-group';

// Name + participants, then straight into the new chat. With onCancel (inside a popup) a
// Cancel button sits next to Create.
export const CreateGroup = ({onCancel}: {onCancel?: () => void}) => {
    const router = useRouter();
    const {t} = useTranslation();

    const [users, setUsers] = useState([]);
    const [name, setName] = useState('');
    const [participantIds, setParticipantIds] = useState([]);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const currentUserId = Number(localStorage.getItem('userId'));
        getAllUsers().then((result) => setUsers((result ?? [])
            .filter((user) => user.id !== currentUserId)
            .map((user) => ({value: user.id, label: user.displayName}))));
    }, []);

    const submit = (event) => {
        event.preventDefault();
        setSaving(true);
        createGroup(name, participantIds)
            .then((groupId) => groupId && router.push(`/chat/${groupId}`))
            .finally(() => setSaving(false));
    };

    const submitButton = (
        <button type='submit' className='chat-create-submit' disabled={saving || !participantIds.length}>
            {saving && <span className='auth-spinner' aria-hidden/>}
            {t('create_group', 'Create group')}
        </button>
    );

    return (
        <form onSubmit={submit} className='chat-create-form'>
            <InputText value={name}
                       onChange={(event) => setName(event.target.value)}
                       placeholder={t('group_name', 'Group name')}
                       aria-label={t('group_name', 'Group name')}/>
            {/* appendTo='self': in a modal popup a body-level panel would be inert and unclickable. */}
            <MultiSelect value={participantIds}
                         onChange={(event) => setParticipantIds(event.value)}
                         options={users}
                         filter
                         appendTo='self'
                         placeholder={t('participants', 'Participants')}
                         aria-label={t('participants', 'Participants')}/>
            {onCancel ? (
                <div className='popup-actions'>
                    <button type='button' className='popup-cancel' onClick={onCancel} disabled={saving}>
                        {t('cancel', 'Cancel')}
                    </button>
                    {submitButton}
                </div>
            ) : submitButton}
        </form>
    );
};
