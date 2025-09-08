export const prerender = false;

import { Resend } from 'resend';
import { createClient } from '@libsql/client/web';

const turso = createClient({
   url: import.meta.env.TURSO_DATABASE_URL,
   authToken: import.meta.env.TURSO_AUTH_TOKEN,
});

export async function POST({ request }) {
   try {
      // 1. Validar Content-Type
      if (request.headers.get('content-type') !== 'application/json') {
         return new Response(JSON.stringify({ message: 'Content-Type must be application/json' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
         });
      }

      // 2. Parsear y validar datos
      const userData = await request.json();
      if (!userData?.email) {
         return new Response(JSON.stringify({ message: 'Email is required.' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
         });
      }

      // 3. Normalizar y validar formato del email
      userData.email = userData.email.trim().toLowerCase();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(userData.email)) {
         return new Response(JSON.stringify({ message: 'Invalid email format.' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
         });
      }

      // 4. Limitar tamaño de datos (ej: 10KB)
      const payloadSize = JSON.stringify(userData).length;
      if (payloadSize > 10_000) {
         return new Response(JSON.stringify({ message: 'Payload too large.' }), {
            status: 413,
            headers: { 'Content-Type': 'application/json' },
         });
      }

      // 5. Generar OTP en servidor (ignorar si lo envían)
      userData.OTP = Math.floor(100000 + Math.random() * 900000);

      // 6. Comprobar si el email ya existe en licenses
      const checkLicense = await turso.execute({
         sql: 'SELECT COUNT(*) as count FROM licenses WHERE email = ?',
         args: [userData.email],
      });
      if (checkLicense.rows[0].count > 0) {
         return new Response(JSON.stringify({ message: 'Email already exists.' }), {
            status: 409,
            headers: { 'Content-Type': 'application/json' },
         });
      }

      // 7. Generar license_key única
      const licenseKey = crypto.randomUUID();

      // 8. Guardar datos en licenses
      await turso.execute({
         sql: `INSERT INTO licenses (
            license_key, email, user_name, is_email_verified, created_at, activated_at, expires_at, revoked_at, revoked_reason, hardware_fingerprint
         ) VALUES (?, ?, ?, ?, strftime('%Y-%m-%d %H:%M:%S', 'now'), NULL, NULL, NULL, NULL, NULL)`,
         args: [
            licenseKey,
            userData.email,
            userData.name || '',
            userData.OTP, // is_email_verified
         ],
      });

      const resend = new Resend(import.meta.env.RESEND_API_KEY);

      const { error } = await resend.emails.send({
         from: 'Platforcode <no-reply@platforcode.app>',
         to: [`${userData.email}`],
         subject: 'Platforcode OTP code',
         html: `<p>Congrats on sending your <strong>first email</strong>!</p> <p>Here is your OTP code: <strong>${userData.OTP}</strong></p>`,
      });

      if (error) {
         console.error({ error });
         return new Response(JSON.stringify({ message: 'Failed to send email.' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
         });
      }

      return new Response(JSON.stringify({ message: 'License created successfully.' }), {
         status: 200,
         headers: { 'Content-Type': 'application/json' },
      });
   } catch (error) {
      console.error('Error saving to Turso:', error);
      return new Response(JSON.stringify({ message: 'Internal server error.' }), {
         status: 500,
         headers: { 'Content-Type': 'application/json' },
      });
   }
}
