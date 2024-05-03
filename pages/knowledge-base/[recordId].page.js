import { hasCookie } from 'cookies-next';

export { default } from './article';

export const getServerSideProps = async ({ req, res }) => ({
  props: {
    isLoggedIn: hasCookie('authorization', { req, res }),
  },
});
