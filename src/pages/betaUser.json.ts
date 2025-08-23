export const prerender = false;

import { put, list } from '@vercel/blob';
import { Resend } from 'resend';

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

      // 6. Comprobar si el email ya existe
      const filename = `users/${userData.email}.json`;
      const existing = await list({ prefix: filename, limit: 1, token: import.meta.env.BLOB_READ_WRITE_TOKEN });
      if (existing.blobs.length > 0) {
         return new Response(JSON.stringify({ message: 'Email already exists.' }), {
            status: 409,
            headers: { 'Content-Type': 'application/json' },
         });
      }

      // 7. Guardar datos
      await put(filename, JSON.stringify(userData), {
         access: 'public',
         addRandomSuffix: false,
         allowOverwrite: false,
         token: import.meta.env.BLOB_READ_WRITE_TOKEN,
      });

      const resend = new Resend(import.meta.env.RESEND_API_KEY);

      const { data, error } = await resend.emails.send({
         from: 'Acme <onboarding@resend.dev>',
         to: ['javier.san.mail@gmail.com'],
         subject: 'Verification Email',
         html: `<p>Congrats on sending your <strong>first email</strong>!</p> <p>Here is your OTP code: <strong>${userData.activationKey}</strong></p>`,
      });

      if (error) {
         return console.error({ error });
      }

      return new Response(JSON.stringify({ message: 'User data saved successfully.' }), {
         status: 200,
         headers: { 'Content-Type': 'application/json' },
      });
   } catch (error) {
      console.error('Error to save on vercel blob:', error);
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
