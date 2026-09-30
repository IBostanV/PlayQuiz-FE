export { default } from './component';

// Admins only: logged out -> /login, signed in without ROLE_ADMIN -> /home.
export { adminOnly as getServerSideProps } from '../../utils/route-guard';
