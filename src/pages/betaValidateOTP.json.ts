export const prerender = false;

import { list, put, BlobNotFoundError } from '@vercel/blob';
import { isValid } from 'astro:schema';
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

        const allBlobs = await list({ prefix: 'users/' });
        const user = allBlobs.find(blob => blob.pathname === `users/${userData.email}.json`);


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
            allowOverwrite: false
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