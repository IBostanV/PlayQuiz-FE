export { default } from './component';

// The content dashboard: logged out -> /login, signed in without ROLE_ADMIN or one of the
// content roles -> /home.
export { contentOnly as getServerSideProps } from '../../utils/route-guard';
