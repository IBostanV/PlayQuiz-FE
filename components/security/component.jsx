import {useRouter} from "next/router";
import {useEffect} from "react";
import {useUserContext} from "../../context/user-context";

const SecureComponent = ({ isAuthenticated, roles = [], defaultRender = null, children }) => {
    const router = useRouter();
    const userRoles = useUserContext();

    useEffect(() => {
        // if (!isAuthenticated && isAuthenticated !== undefined) {
        //     router.push('/login').then(() => null);
        // }
    }, [isAuthenticated]);

    return isAuthenticated && roles.some(role => userRoles?.includes(role)) ? children : defaultRender;
}

export default SecureComponent;
