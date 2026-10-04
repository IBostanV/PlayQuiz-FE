import React, {useEffect, useState} from 'react';
import {Calendar} from 'primereact/calendar';
import {MultiSelect} from 'primereact/multiselect';
import {InputText} from 'primereact/inputtext';
import {getOccupationQuizzes, saveProfileInfo, setOccupationQuizzes} from '../../api/profile';
import {toast} from 'react-toastify';
import moment from 'moment';
import {setWIthPreview} from '../../utils/fileUtils';
import {useTranslation} from "react-i18next";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {faCamera, faEnvelope, faFloppyDisk, faKey} from "@fortawesome/free-solid-svg-icons";
import {Popup} from "../../components/common/popup";
import {ChangePasswordForm} from "../../components/profile/change-password";
import {useProfile} from "../../hooks/profile";
import {QuizHistory} from "../../components/profile/quiz-history";
import {IqScore} from "../../components/profile/iq-score";
import {PreferredTrophy} from "../../components/profile/preferred-trophy";
import {Statistics} from "../../components/profile/statistics";

// Label over control; `wide` spans both grid columns.
const Field = ({id, label, wide = false, children}) => (
    <div className='profile-field' data-wide={wide}>
        <label htmlFor={id}>{label}</label>
        {children}
    </div>
);

function Profile() {
    const { t} = useTranslation();

    const {
        categories,
        userOccupations,
        avatar, setAvatar,
        user, setUser,
        previewAvatar, setPreviewAvatar,
    } = useProfile();

    const [changingPassword, setChangingPassword] = useState(false);
    // Saved as soon as it is flipped, apart from the form's Save.
    const [occupationQuizzes, setOccupationQuizzesState] = useState(true);
    useEffect(() => {
        getOccupationQuizzes().then(setOccupationQuizzesState).catch(() => {});
    }, []);
    const toggleOccupationQuizzes = (enabled: boolean) => {
        setOccupationQuizzesState(enabled);
        setOccupationQuizzes(enabled).catch(() => setOccupationQuizzesState(!enabled));
    };
    const [saving, setSaving] = useState(false);

    const handleChange = (event, field: string) =>
        setUser(values => ({
            ...values,
            [field]: event.value
        }));

    const handleTargetChange = (event, field: string) =>
        setUser(values => ({
            ...values,
            [field]: event.target.value
        }));

    const saveProfile = async (event) => {
        event.preventDefault();
        setSaving(true);
        try {
            const birthday = moment(user.birthday).format('YYYY-MM-DD');
            const infoSaved = await saveProfileInfo(
                {...user, isEnabled: user.enabled, birthday},
                avatar
            );

            if (infoSaved) {
                toast.success(t('saved'));
                // Uploaded: the preview stays, the "unsaved photo" note goes.
                setAvatar(null);
            }
        } finally {
            setSaving(false);
        }
    };

    const fullName = [user.name, user.surname].filter(Boolean).join(' ');
    const displayName = fullName || user.username;
    // The profile starts empty and fills in after the fetch; until then, show no placeholder,
    // or "No username" would flash for everyone.
    const loaded = Boolean(user.email);
    const noUsername = loaded && !user.username;

    return (
        <div className='profile-page'>
            <aside className='profile-card'>
                {/* The whole avatar is the file picker; the input itself is visually hidden. The
                    chosen trophy sits on its corner, and is the way to change it. */}
                <div className='profile-avatar-slot'>
                    <label className='profile-avatar' data-tooltip={t('change_photo', 'Change photo')}>
                    {previewAvatar
                        ? <img src={previewAvatar} alt=''/>
                        : <span className='profile-avatar-initial' aria-hidden>{displayName?.charAt(0) || (loaded ? '?' : '')}</span>}
                    <span className='profile-avatar-overlay'>
                        <FontAwesomeIcon icon={faCamera}/>
                        {t('change_photo', 'Change photo')}
                    </span>
                    <input type='file'
                           accept='image/*'
                           className='visually-hidden'
                           onChange={(event) => setWIthPreview(event, avatar, setAvatar, setPreviewAvatar)}/>
                    </label>
                    <PreferredTrophy/>
                </div>
                {avatar && <span className='profile-avatar-pending'>{t('photo_unsaved', 'New photo — save to keep it')}</span>}

                {/* The email is shown on its own line below, never as the name. */}
                <h1 className='profile-name' data-placeholder={!displayName && loaded}>
                    {displayName || (loaded ? t('no_username', 'No username') : '')}
                </h1>
                {fullName && user.username && <p className='profile-username'>@{user.username}</p>}
                {fullName && noUsername && (
                    <p className='profile-username' data-placeholder='true'>{t('no_username', 'No username')}</p>
                )}
                {noUsername && (
                    <label htmlFor='profile-username' className='profile-username-hint'>
                        {t('no_username_hint', 'Set a username in your profile')} →
                    </label>
                )}
                <p className='profile-email'><FontAwesomeIcon icon={faEnvelope}/> {user.email}</p>

                <IqScore/>

                <div className='profile-privacy'>
                    <h2 className='profile-section-title'>{t('privacy')}</h2>
                    <p className='profile-hint'>{t('change_password_intro', 'Change the password you use to log in.')}</p>
                    <button type='button'
                            className='profile-secondary-button'
                            onClick={() => setChangingPassword(true)}
                            aria-haspopup='dialog'>
                        <FontAwesomeIcon icon={faKey}/>
                        {t('change_password')}
                    </button>
                </div>

                <Popup open={changingPassword}
                       icon={faKey}
                       title={t('change_password')}
                       onClose={() => setChangingPassword(false)}>
                    <ChangePasswordForm email={user.email} onCancel={() => setChangingPassword(false)}/>
                </Popup>
            </aside>

            <form className='profile-form' onSubmit={saveProfile}>
                <h2 className='profile-section-title'>{t('user')}</h2>

                <div className='profile-grid'>
                    <Field id='profile-username' label={t('username')}>
                        <InputText id='profile-username'
                                   value={user.username ?? ''}
                                   onChange={(event) => handleTargetChange(event, 'username')}/>
                    </Field>
                    <Field id='profile-name' label={t('name')}>
                        <InputText id='profile-name'
                                   value={user.name ?? ''}
                                   onChange={(event) => handleTargetChange(event, 'name')}/>
                    </Field>
                    <Field id='profile-surname' label={t('surname')}>
                        <InputText id='profile-surname'
                                   value={user.surname ?? ''}
                                   onChange={(event) => handleTargetChange(event, 'surname')}/>
                    </Field>
                    <Field id='profile-birthday' label={t('birthday')}>
                        <Calendar inputId='profile-birthday'
                                  showButtonBar
                                  showIcon
                                  value={user.birthday}
                                  dateFormat="yy-mm-dd"
                                  onChange={(event) => handleTargetChange(event, 'birthday')}/>
                    </Field>
                    <Field id='profile-occupation' label={t('occupation')}>
                        <MultiSelect inputId='profile-occupation'
                                     filter
                                     display='chip'
                                     value={user.occupations}
                                     onChange={(event) => handleChange(event, 'occupations')}
                                     options={userOccupations}
                                     optionLabel="name"
                                     virtualScrollerOptions={{itemSize: 40}}/>
                        <span className='profile-switch'>
                            <input type='checkbox'
                                   id='profile-occupation-quizzes'
                                   checked={occupationQuizzes}
                                   onChange={(event) => toggleOccupationQuizzes(event.target.checked)}/>
                            <label htmlFor='profile-occupation-quizzes'>
                                {t('occupation_quizzes', 'Lean express quizzes to my occupation')}
                            </label>
                        </span>
                    </Field>
                    <Field id='profile-categories' label={t('favorite_categories')} wide>
                        <MultiSelect inputId='profile-categories'
                                     filter
                                     display='chip'
                                     value={user.favoriteCategories}
                                     onChange={(event) => handleChange(event, 'favoriteCategories')}
                                     options={categories}
                                     optionLabel="name"
                                     virtualScrollerOptions={{itemSize: 40}}/>
                    </Field>
                </div>

                <div className='profile-actions'>
                    <button type='submit' className='profile-save' disabled={saving}>
                        {saving ? <span className='auth-spinner' aria-hidden/> : <FontAwesomeIcon icon={faFloppyDisk}/>}
                        {t('save')}
                    </button>
                </div>
            </form>

            {/* Below the form, spanning both columns: how the last day, week or month went,
                then every run in full. */}
            <Statistics/>
            <QuizHistory/>
        </div>
    );
}

export default Profile;
