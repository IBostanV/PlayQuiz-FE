// A question's or an answer's text in the player's language when an editor translated it, else
// as written. `translations` are [{description, language: {langCode}}], as the server sends them.
export const translated = (translations, langCode, original) =>
    translations?.find((item) => item.language?.langCode === langCode && item.description)?.description
    ?? original;

export const questionText = (question, langCode) => translated(question?.translations, langCode, question?.content);
