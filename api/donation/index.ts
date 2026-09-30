import request, { PUT } from '../../utils/request';
import { DONATION_PATH } from '../constant';

// Where donations go: { paypal: { email, link } | null, crypto: [{ name, symbol, network, address }] }.
// Anyone may read it; only admins save it.
export const getDonationSettings = () => request(DONATION_PATH);

export const saveDonationSettings = (settings) => request(DONATION_PATH, { method: PUT, body: settings });
