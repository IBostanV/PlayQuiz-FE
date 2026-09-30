// A quiz question sent into a chat, and the answer someone gives it, travel as ordinary chat
// messages. Answering writes no quiz history — the verdict exists only as the message below
// the question.
//
// The payload rides in a text marker holding base64, not in HTML attributes: base64 has no
// character a sanitizer rewrites or escapes, so whatever the server does to the HTML around it,
// the marker arrives intact. Ahead of the marker sits the readable question, which is what shows
// if the payload ever fails to parse.

const ESCAPES = {'<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;'};
const escape = (text) => String(text ?? '').replace(/[<>&"]/g, character => ESCAPES[character]);

// btoa is bytes-only, so the text is UTF-8 encoded first: questions are not all ASCII.
const encode = (value) => btoa(
  Array.from(new TextEncoder().encode(JSON.stringify(value)), byte => String.fromCharCode(byte)).join(''));

const decode = (base64) => JSON.parse(
  new TextDecoder().decode(Uint8Array.from(atob(base64), character => character.charCodeAt(0))));

const CHALLENGE = /\[quiz]([A-Za-z0-9+/=]+)\[\/quiz]/;
const RESULT = /\[quizresult]([A-Za-z0-9+/=]+)\[\/quizresult]/;

const read = (marker: RegExp, html?: string) => {
  const found = String(html ?? '').match(marker);
  if (!found) return null;
  try {
    return decode(found[1]);
  } catch {
    // Truncated or edited by hand: the message falls back to its readable text.
    return null;
  }
};

/** The question with the options the sender was looking at, so the card needs no second call. */
export const challengeMessage = (question) => {
  const payload = {
    id: question.id,
    content: question.content,
    answers: (question.answers ?? []).map(option => ({
      id: option.id,
      termId: option.termId,
      content: option.content,
    })),
  };
  return `${escape(question.content)}[quiz]${encode(payload)}[/quiz]`;
};

export const resultMessage = (questionId: number, correct: boolean, answer: string) =>
  `${escape(answer)}[quizresult]${encode({id: questionId, correct, answer})}[/quizresult]`;

/** The sent question: `{id, content, answers}`, or null when this is an ordinary message. */
export const readChallenge = (html?: string) => read(CHALLENGE, html);

/** The answer given: `{id, correct, answer}`, or null. */
export const readResult = (html?: string) => read(RESULT, html);

/** The readable half of a message, for anything that shows its text rather than its card. */
export const stripMarkers = (html?: string) =>
  String(html ?? '').replace(CHALLENGE, '').replace(RESULT, '');
