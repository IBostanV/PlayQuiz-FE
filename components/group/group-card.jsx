import React from 'react';
import Link from 'next/link';
import PropTypes from 'prop-types';
import {useTranslation} from 'react-i18next';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {faGlobe, faLock} from '@fortawesome/free-solid-svg-icons';
import {Avatar} from '../common/avatar';

// One group as a link to its page: name, public or private, size, and where the reader stands.
export const GroupCard = ({group}) => {
    const {t} = useTranslation();
    const role = {
        OWNER: t('group_role_owner', 'Owner'),
        MEMBER: t('group_role_member', 'Member'),
        PENDING: t('group_role_pending', 'Request sent'),
    }[group.role];

    return (
        <Link href={`/groups/${group.id}`} className='group-card'>
            <Avatar name={group.name} className='group-card-avatar'/>
            <span className='group-card-body'>
                <span className='group-card-name'>{group.name}</span>
                <span className='group-card-meta'>
                    <FontAwesomeIcon icon={group.privateGroup ? faLock : faGlobe}/>
                    {' '}{group.privateGroup ? t('group_private', 'Private') : t('group_public', 'Public')}
                    {' · '}{t('group_members_count', '{{count}} members', {count: group.members})}
                </span>
                {group.description && <span className='group-card-text'>{group.description}</span>}
            </span>
            {role && <span className='group-card-role' data-role={group.role}>{role}</span>}
        </Link>
    );
};

GroupCard.propTypes = {
    group: PropTypes.object.isRequired,
};
