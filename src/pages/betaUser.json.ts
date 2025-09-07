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
      userData.activationKey = Math.floor(100000 + Math.random() * 900000);

      // 6. Comprobar si el email ya existe en Turso
      const checkUser = await turso.execute({
         sql: 'SELECT COUNT(*) as count FROM users WHERE email = ?',
         args: [userData.email],
      });
      if (checkUser.rows[0].count > 0) {
         return new Response(JSON.stringify({ message: 'Email already exists.' }), {
            status: 409,
            headers: { 'Content-Type': 'application/json' },
         });
      }

      // 7. Guardar datos en Turso
      await turso.execute({
         sql: 'INSERT INTO users (email, name, activation_key) VALUES (?, ?, ?)',
         args: [userData.email, userData.name || null, userData.activationKey],
      });

      const resend = new Resend(import.meta.env.RESEND_API_KEY);

      const { error } = await resend.emails.send({
         from: 'Platforcode <no-reply@mail.platforcode.app>',
         to: [`${userData.email}`],
         subject: 'Platforcode OTP code',
         html: `<p>Congrats on sending your <strong>first email</strong>!</p> <p>Here is your OTP code: <strong>${userData.activationKey}</strong></p>`,
      });

      if (error) {
         console.error({ error });
         return new Response(JSON.stringify({ message: 'Failed to send email.' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
         });
      }

      return new Response(JSON.stringify({ message: 'User data saved successfully.' }), {
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

/**
 async function name() {
  const userData = {
      name: "javi san",
      email: "javi@mail.com"
  }
  const response = await fetch('http://192.168.0.181:4321/betaUser.json', {
      method: 'POST',
      headers: {
          'Content-Type': 'application/json'
      },
        body: JSON.stringify(userData),
  });
  const data = await response.json();
  console.log('Response from server:', data);
}
 */
