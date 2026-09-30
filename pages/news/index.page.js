import {hasCookie} from 'cookies-next';

export {default} from './component';

export const getServerSideProps = async ({req, res}) => ({
    props: {
        isLoggedIn: hasCookie('authorization', {req, res}),
    },
});
