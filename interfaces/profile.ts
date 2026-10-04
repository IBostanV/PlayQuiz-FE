export interface UserProfile {
    birthday: Date;
    email: string;
    enabled: boolean;
    favoriteCategories: object[];
    name: string;
    occupations: string;
    surname: string;
    username: string;
    // Who sees their activity on their profile; set through its own endpoint, not the form.
    profileVisibility?: string;
    // What they wear (cosmetics): the frame's code, and their name's colour ready to use.
    equippedFrame?: string;
    nameColor?: string;
}

export default {
    birthday: null,
    email: '',
    enabled: false,
    favoriteCategories: [],
    name: '',
    occupations: '',
    surname: '',
    username: ''
}