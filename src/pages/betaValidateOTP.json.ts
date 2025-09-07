export const prerender = false;

import { list, BlobNotFoundError } from '@vercel/blob';
import { z } from 'zod';
import { createClient } from '@libsql/client/web';

// --- Esquemas de Validación y Tipos ---
const UserDataSchema = z.object({
   activationKey: z.string().min(1, { message: 'Activation key cannot be empty' }),
   email: z.string().email({ message: 'Invalid email format' }),
   machineId: z.string().min(1, { message: 'Machine ID cannot be empty' }),
});

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
      const body = await request.json();
      const validationResult = UserDataSchema.safeParse(body);
      if (!validationResult.success) {
         return new Response(
            JSON.stringify({
               message: 'Incorrect request data',
               errors: validationResult.error.flatten(),
            }),
            { status: 400 },
         );
      }
      const { email, activationKey, machineId } = validationResult.data;

      // 3. Buscar licencia en Turso
      const licenseRes = await turso.execute({
         sql: 'SELECT * FROM licenses WHERE email = ?',
         args: [email],
      });
      if (licenseRes.rows.length === 0) {
         return new Response(JSON.stringify({ message: 'License not found.' }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' },
         });
      }
      const license = licenseRes.rows[0];

      // 4. Comprobar activationKey (OTP)
      if (String(license.is_email_verified) !== activationKey) {
         return new Response(JSON.stringify({ message: 'Invalid Key.' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
         });
      }

      // 5. Actualizar licencia: activar y guardar hardware_fingerprint
      await turso.execute({
         sql: `UPDATE licenses SET activated_at = strftime('%Y-%m-%d %H:%M:%S', 'now'), hardware_fingerprint = ?, is_email_verified = 1 WHERE email = ?`,
         args: [machineId, email],
      });

      // 6. Encriptar challenges.json desde Vercel Blob
      const encryptedChallenges = await encryptChallengesData(license.license_key, machineId);

      // 7. Responder con éxito
      return new Response(
         JSON.stringify({
            message: 'validated successfully.',
            validation: true,
            licenseKey: license.license_key,
            challengesData: encryptedChallenges,
         }),
         { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
   } catch (error) {
      if (error instanceof BlobNotFoundError) {
         return new Response(JSON.stringify({ message: 'License not found' }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' },
         });
      }
      console.log(error);
      return new Response(JSON.stringify({ message: 'An internal server error occurred.', error }), { status: 500 });
   }
}

/**
 * Encripta datos usando la Web Crypto API con AES-GCM.
 * El JSON de retos sigue viniendo de Vercel Blob.
 */
async function encryptChallengesData(licenseKey: string, machineId: string): Promise<string> {
   const allBlobs = await list({ prefix: 'challenges/', token: import.meta.env.BLOB_READ_WRITE_TOKEN });
   const userFile = allBlobs.blobs.find((blob) => blob.pathname === `challenges/challenges.json`);
   if (!userFile) throw new BlobNotFoundError();
   const fileUrl = userFile.url;
   const res = await fetch(fileUrl);
   const resData = await res.json();
   const jsonString = JSON.stringify(resData);
   const data = new TextEncoder().encode(jsonString);

   // Derivar clave con PBKDF2
   const salt = new TextEncoder().encode(machineId);
   const baseKey = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(licenseKey),
      { name: 'PBKDF2' },
      false,
      ['deriveKey'],
   );

   const cryptoKey = await crypto.subtle.deriveKey(
      {
         name: 'PBKDF2',
         salt: salt,
         iterations: 100000,
         hash: 'SHA-256',
      },
      baseKey,
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt'],
   );

   // Encriptar con AES-GCM
   const iv = crypto.getRandomValues(new Uint8Array(12));
   const encryptedData = await crypto.subtle.encrypt(
      {
         name: 'AES-GCM',
         iv: iv,
      },
      cryptoKey,
      data,
   );

   // Combinar IV y datos encriptados
   const ivAndEncryptedData = new Uint8Array(iv.length + encryptedData.byteLength);
   ivAndEncryptedData.set(iv, 0);
   ivAndEncryptedData.set(new Uint8Array(encryptedData), iv.length);

   // Convertir a Base64 para una transmisión segura como string
   return Buffer.from(ivAndEncryptedData).toString('base64');
}
