export const prerender = false;

import { list, put, BlobNotFoundError } from '@vercel/blob';
import { v4 as uuidv4 } from 'uuid';


export async function POST({ request }) {
    try {
        // 1. Validar Content-Type
        if (request.headers.get('content-type') !== 'application/json') {
            return new Response(
                JSON.stringify({ message: "Content-Type must be application/json" }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        }

        // 2. Parsear y validar datos
        const userData = await request.json();
        if (!userData?.otpCode) {
            return new Response(
                JSON.stringify({ message: "OTP code is required." }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        }

        const allBlobs = await list({ prefix: 'users/', token: import.meta.env.BLOB_READ_WRITE_TOKEN });
        const userFile = allBlobs.blobs.find(blob => blob.pathname === `users/${userData.email}.json`);
        const fileUrl = userFile.url;
        const res = await fetch(fileUrl);
        const user = await res.json(); // si es JSON
        console.log(user);
        // 2. Comprobar si el usuario existe
        if (!user) {
            return new Response(
                JSON.stringify({ message: "User not found." }),
                { status: 404, headers: { 'Content-Type': 'application/json' } }
            );
        }

        // 3. Comprobar si el OTP es correcto
        if (user.otpCode !== userData.otpCode) {
            return new Response(
                JSON.stringify({ message: "Invalid OTP code." }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        }

        if (user.licenseKey) {
            return new Response(
                JSON.stringify({ message: "User already validated." }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        }

        console.log('User found:', user);
        // 4. Generar license key única
        const licenseKey = uuidv4().toUpperCase();
        console.log('Generated license key:', licenseKey);
        const updateUserData = {
            name: user.name,
            email: user.email,
            isValidated: true,
            licenseKey
        }

        // 5. Guardar license key en un blob
        await put(`users/${userData.email}.json`, JSON.stringify(updateUserData), {
            access: 'public',
            addRandomSuffix: false,
            allowOverwrite: true,
            token: import.meta.env.BLOB_READ_WRITE_TOKEN
        });
        console.log('User data updated with license key:', updateUserData);

        // 6. Responder con éxito
        return new Response(
            JSON.stringify({
                message: "OTP validated successfully.",
                validation: true,
                licenseKey
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
        );

    } catch (error) {
        if (error instanceof BlobNotFoundError) {
            return new Response(JSON.stringify({ message: 'User not found' }), {
                status: 404,
                headers: {
                    'Content-Type': 'application/json'
                }
            });
        }
        return new Response(
            JSON.stringify({ message: "An error occurred.", error: error }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
}

/**
 async function name() {
  const userData = {
      otpCode: Number("951688"),
        email: "javi@mail.com",
  }
  const response = await fetch('http://192.168.0.181:4321/betaValidateOTP.json', {
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