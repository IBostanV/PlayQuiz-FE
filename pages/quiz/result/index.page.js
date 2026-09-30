import { hasCookie } from 'cookies-next';

export { default } from './component';

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
