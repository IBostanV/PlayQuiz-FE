import {useEffect, useState} from "react";
import defaultUser, {UserProfile} from "../interfaces/profile";
import {getCurrentUser} from "../api/user";
import base64Util from "../utils/base64Util";
import {getAllCategoriesShort} from "../api/category";
import {getOccupations} from "../api/profile";

export const useProfile = () => {
    const [user, setUser] = useState<UserProfile>(defaultUser);
    const [avatar, setAvatar] = useState(null);
    const [previewAvatar, setPreviewAvatar] = useState(null);
    const [userOccupations, setUserOccupations] = useState([]);
    const [categories, setCategories] = useState([]);

    useEffect(() => {
        const fetchUser = async () => await getCurrentUser();
        fetchUser()
            .then((response) => {
                const {birthday = [2000, 1, 1], avatar} = response ?? {};
                const userBirthday = new Date(birthday[0], birthday[1] - 1, birthday[2]);

                setUser({...response, birthday: userBirthday});
                setPreviewAvatar(avatar && base64Util(avatar));
            });
    }, []);

    useEffect(() => {
        const fetchCategories = async () => await getAllCategoriesShort();
        fetchCategories().then(setCategories);

        const fetchOccupations = async () => await getOccupations();
        fetchOccupations().then(setUserOccupations);
    }, []);

    return {
        categories,
        userOccupations,
        avatar, setAvatar,
        user, setUser,
        previewAvatar, setPreviewAvatar
    };
}
