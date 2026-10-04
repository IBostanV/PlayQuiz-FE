// How strong a password is, for the meter on the registration page. The rules themselves are the
// backend's (PasswordPolicy.java): at least 8 characters from at least 3 of the 4 kinds below, and
// not a common word (or the player's own email name) dressed up. Its word list is copied here —
// change both together.
export const MIN_LENGTH = 8;

const KINDS = [/\p{Ll}/u, /\p{Lu}/u, /\p{Nd}/u, /[^\p{L}\p{Nd}\s]/u];

const COMMON_WORDS = new Set([
    'password', 'passwd', 'passw', 'pass', 'parola', 'parol', 'passwort', 'motdepasse', 'contrasena',
    'qwerty', 'qwertyuiop', 'qwertz', 'azerty', 'asdf', 'asdfgh', 'asdfghjkl', 'zxcvbn', 'zxcvbnm',
    'qazwsx', 'abc', 'abcd', 'abcde', 'abcdef', 'abcdefg', 'abcdefgh',
    'welcome', 'hello', 'admin', 'administrator', 'root', 'user', 'guest', 'test', 'testing', 'demo',
    'login', 'letmein', 'secret', 'access', 'changeme', 'default', 'master', 'whatever', 'nothing',
    'iloveyou', 'love', 'lovely', 'loveme', 'trustno', 'trustnoone', 'freedom', 'sunshine', 'princess',
    'monkey', 'dragon', 'shadow', 'superman', 'batman', 'spiderman', 'starwars', 'pokemon', 'matrix',
    'football', 'baseball', 'soccer', 'hockey', 'basketball', 'liverpool', 'chelsea', 'arsenal', 'barcelona',
    'michael', 'jennifer', 'jordan', 'charlie', 'daniel', 'andrew', 'thomas', 'robert', 'jessica', 'ashley',
    'hunter', 'killer', 'ninja', 'mustang', 'harley', 'ranger', 'tigger', 'buster', 'maggie', 'ginger',
    'pepper', 'cookie', 'cheese', 'banana', 'orange', 'purple', 'silver', 'flower', 'summer', 'winter',
    'spring', 'autumn', 'computer', 'internet', 'google', 'facebook', 'samsung', 'apple', 'iphone',
    'playquiz', 'quiz', 'player', 'game', 'gamer', 'moldova', 'romania', 'bucuresti', 'chisinau',
]);

// Characters written in place of letters: p@ssw0rd.
const LEET = {'@': 'a', 4: 'a', 3: 'e', 0: 'o', $: 's', 5: 's', 7: 't', '!': 'i', 8: 'b'};

// The word inside, as PasswordPolicy.cores finds it.
const cores = (password) => [
    password.replace(/^[^\p{L}]+|[^\p{L}]+$/gu, ''),
    password.replace(/^\d+|[^\p{L}]+$/gu, ''),
    password.replace(/[^\p{L}]+$/u, ''),
].flatMap((trimmed) => {
    const plain = [...trimmed].map(c => LEET[c] ?? c).join('');
    return [plain.replaceAll('1', 'i'), plain.replaceAll('1', 'l')];
});

export const isCommonPassword = (password = '', email = '') => {
    const emailName = String(email).split('@')[0].toLowerCase().replace(/[^a-z]/g, '');
    return cores(password.toLowerCase())
        .some(core => COMMON_WORDS.has(core) || (emailName.length >= 3 && core === emailName));
};

// { level, verdict }: level fills the meter's four bars; verdict is what to say. Accepted when
// ok is true (good or strong).
export const checkPassword = (password = '', email = '') => {
    if (!password) return {level: 0, verdict: null, ok: false};
    if (password.length < MIN_LENGTH) return {level: 1, verdict: 'short', ok: false};
    const kinds = KINDS.filter(kind => kind.test(password)).length;
    if (kinds < 3) return {level: 2, verdict: 'weak', ok: false};
    if (isCommonPassword(password, email)) return {level: 1, verdict: 'common', ok: false};
    return kinds === 4 || password.length >= 12
        ? {level: 4, verdict: 'strong', ok: true}
        : {level: 3, verdict: 'good', ok: true};
};
