import request, { PATCH } from '../../utils/request';
import { GLOSSARY_PATH } from '../constant';
import { GLOSSARY_CHANGED } from './missing-type-count';

export default (body, attachment) => {
  const formData = new FormData();

  formData.append('request', new Blob([JSON.stringify(body)], { type: 'application/json' }));

  if (attachment) {
    formData.append('attachment', attachment, attachment.name);
  }

  return request(`${GLOSSARY_PATH}/save`, {
    body: formData,
    method: PATCH,
    withHeaders: true,
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    // A saved term may have just been given the type it was missing, so the dashboard recounts.
  }).then((response) => {
    if (response) {
      window.dispatchEvent(new Event(GLOSSARY_CHANGED));
    }
    return response;
  });
};
