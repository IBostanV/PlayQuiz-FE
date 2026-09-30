import {hasCookie} from 'cookies-next';
import React, {useEffect, useState} from "react";
import {useRouter} from "next/router";
import {useTranslation} from "react-i18next";
import getUserGroups from "../../api/user/getUserGroups";
import {CreateGroup} from "../../components/chat/create-group";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {faComments, faPlus, faUsers} from "@fortawesome/free-solid-svg-icons";
import {Popup} from "../../components/common/popup";

// Opens the first group; a user with none gets a welcome card whose button opens the
// create-group popup, instead of a blank page.
export default () => {
    const router = useRouter();
    const {t} = useTranslation();
    const [noGroups, setNoGroups] = useState(false);
    const [creating, setCreating] = useState(false);

    useEffect(() => {
        const fetchUserGroups = async () => await getUserGroups();
        fetchUserGroups().then(userGroups => {
            const groupId = userGroups?.[0]?.groupId;
            if (groupId) {
                router.push(`/chat/${groupId}`)
                    .then(console.log);
            } else {
                setNoGroups(true);
            }
        });
    }, []);

    return noGroups && (
        <section className='chat-welcome'>
            <div className='chat-welcome-icon' aria-hidden><FontAwesomeIcon icon={faComments}/></div>
            <h1 className='chat-welcome-title'>{t('no_groups', 'You are not in any group yet')}</h1>
            <p className='chat-welcome-text'>
                {t('no_groups_hint', 'Start a group with the people you want to chat with.')}
            </p>
            <button type='button'
                    className='chat-welcome-cta'
                    aria-haspopup='dialog'
                    onClick={() => setCreating(true)}>
                <FontAwesomeIcon icon={faPlus}/>
                {t('create_group', 'Create group')}
            </button>
            {/* Same popup as the chat sidebar; creating navigates to the new chat. */}
            <Popup open={creating}
                   icon={faUsers}
                   title={t('create_group', 'Create group')}
                   onClose={() => setCreating(false)}>
                <CreateGroup onCancel={() => setCreating(false)}/>
            </Popup>
        </section>
    );
}

export const getServerSideProps = async ({req, res}) => ({
    props:
        {
            isLoggedIn: hasCookie('authorization', {req, res}),
        },
});
