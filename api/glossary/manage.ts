import request, { DELETE, PUT } from '../../utils/request';
import { GLOSSARY_PATH } from '../constant';
import { GLOSSARY_CHANGED } from './missing-type-count';

// All resolve to the response on success, undefined on failure: the request helper toasts
// the server's message, e.g. why a type or glossary that is still in use cannot be deleted.

export const updateGlossaryType = (typeId: number, body) => request(`${GLOSSARY_PATH}/types/${typeId}`, {
  body,
  method: PUT,
  withHeaders: true,
});

export const deleteGlossaryType = (typeId: number) => request(`${GLOSSARY_PATH}/types/${typeId}`, {
  method: DELETE,
  withHeaders: true,
});

export const deleteGlossary = (glossaryId: number) => request(`${GLOSSARY_PATH}/${glossaryId}`, {
  method: DELETE,
  withHeaders: true,
  // A deleted term may have been one of the ones missing a type, so the dashboard recounts.
}).then((response) => {
  if (response) {
    window.dispatchEvent(new Event(GLOSSARY_CHANGED));
  }
  return response;
});
