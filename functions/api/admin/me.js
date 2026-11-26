import { json } from '../../../lib/util.js';
export const onRequestGet = ({ data }) => json({ email: data.email });
