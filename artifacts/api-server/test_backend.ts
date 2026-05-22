import { sendOTP } from './src/lib/mail';
sendOTP('vijay.vignesh96000@gmail.com', '123456').then(() => console.log('success')).catch(console.error);
