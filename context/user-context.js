import React, {createContext, useContext, useEffect, useState} from 'react';
import {getUserRoles} from "../api/user";

const UserContext = createContext(undefined);

export const useUserContext = () => useContext(UserContext);

// Roles follow the login state: the provider lives in _app, which stays mounted across a
// client-side login or logout, so fetching once at startup left logged-out roles in place
// until a full reload. Logged out, there is nothing to ask the server.
export const UserProvider = ({ isLoggedIn, children }) => {
    const [userRoles, setUserRoles] = useState([]);

    useEffect(() => {
        if (!isLoggedIn) {
            setUserRoles([]);
            return;
        }
        getUserRoles().then(roles => setUserRoles(roles ?? []));
    }, [isLoggedIn]);

    return (
        <UserContext.Provider value={userRoles}>
            {children}
        </UserContext.Provider>
    );
};
