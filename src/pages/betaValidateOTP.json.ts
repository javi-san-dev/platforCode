export const prerender = false;

import { list, put, BlobNotFoundError } from '@vercel/blob';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';

// --- Esquemas de Validación y Tipos ---

// MEJORA: Se usa Zod para una validación de entrada robusta y clara.
const UserDataSchema = z.object({
    activationKey: z.string().min(1, { message: "Activation key cannot be empty" }),
    email: z.string().email({ message: "Invalid email format" }),
    machineId: z.string().min(1, { message: "Machine ID cannot be empty" }),
});

// MEJORA: Se define un tipo estricto para los datos almacenados en el blob.
interface StoredUserData {
    name: string;
    email: string;
    activationKey: string;
    isValidated: boolean;
    licenseKey?: string;
    machineId?: string;
}

interface UserData {
    activationKey: string;
    email: string;
    machineId?: string;
}

export async function POST({ request }) {
    try {
        // -------------- 1. Validar Content-Type -------------- 
        if (request.headers.get('content-type') !== 'application/json') {
            return new Response(
                JSON.stringify({ message: "Content-Type must be application/json" }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        }

        // -------------- 2. Parsear y validar datos -------------- 
        const body = await request.json();
        const validationResult = UserDataSchema.safeParse(body);
        if (!validationResult.success) {
            return new Response(JSON.stringify({
                message: "Incorrect request data",
                errors: validationResult.error.flatten()
            }), { status: 400 });
        }
        const { email, activationKey, machineId } = validationResult.data;
        const userBlobPath = `users/${email}.json`;
        console.log("2. Parsear y validar datos:", email, activationKey, machineId);

        // -------------- 3. Comprobar si el usuario existe en el blobs -------------- 
        const allBlobs = await list({ prefix: 'users/', token: import.meta.env.BLOB_READ_WRITE_TOKEN });
        const userFile = allBlobs.blobs.find(blob => blob.pathname === `users/${email}.json`);
        const fileUrl = userFile.url;
        // if (userFile) {
        //     return new Response(
        //         JSON.stringify({ message: "User not found." }),
        //         { status: 404, headers: { 'Content-Type': 'application/json' } }
        //     );
        // }
        const res = await fetch(fileUrl);
        const userText = await res.text();
        const user = JSON.parse(userText);
        console.log("3. Comprobar si el usuario existe en el blobs:", user);

        // -------------- 4. Comprobar activationKey -------------- 
        if (String(user.activationKey) !== activationKey) {
            return new Response(
                JSON.stringify({ message: "Invalid Key." }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        }

        // -------------- 5. Generar license key única -------------- 
        const licenseKey = uuidv4().toUpperCase();

        // -------------- 6. Guardar license key en el blob -------------- 
        const updatedUserData: StoredUserData = {
            ...user,
            isValidated: true,
            licenseKey,
            machineId,
        };
        await put(userBlobPath, JSON.stringify(updatedUserData), {
            access: 'public',
            addRandomSuffix: false,
            allowOverwrite: true,
            token: import.meta.env.BLOB_READ_WRITE_TOKEN
        });
        console.log("6. Guardar license key en el blob:", updatedUserData);

        // -------------- 7. Encripatcion datos --------------
        const encryptedChallenges = await encryptChallengesData(licenseKey, machineId);
        console.log("7. Encriptar datos:")
        // -------------- 7. Responder con éxito --------------
        return new Response(
            JSON.stringify({
                message: "validated successfully.",
                validation: true,
                licenseKey,
                challengesData: encryptedChallenges,
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
        console.log(error)
        return new Response(JSON.stringify({ message: "An internal server error occurred.", error }), { status: 500 });;
    }
}


/**
 * MEJORA: Encripta datos usando la Web Crypto API con AES-GCM, el estándar moderno.
 * Deriva una clave segura usando PBKDF2.
 * @param licenseKey - La clave de licencia.
 * @param machineId - El ID de la máquina.
 * @returns Un string en base64 que contiene el IV y los datos encriptados.
 */
async function encryptChallengesData(licenseKey: string, machineId: string): Promise<string> {
    const allBlobs = await list({ prefix: 'challenges/', token: import.meta.env.BLOB_READ_WRITE_TOKEN });
    const userFile = allBlobs.blobs.find(blob => blob.pathname === `challenges/challenges.json`);
    const fileUrl = userFile.url;
    const res = await fetch(fileUrl);
    const resData = await res.json();
    const jsonString = JSON.stringify(resData);
    const data = new TextEncoder().encode(jsonString);

    // 1. Derivar una clave criptográfica robusta desde el material de la clave (PBKDF2)
    const salt = new TextEncoder().encode(machineId); // Usar machineId como salt es razonable aquí
    const baseKey = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(licenseKey),
        { name: 'PBKDF2' },
        false,
        ['deriveKey']
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
        ['encrypt']
    );

    // 2. Encriptar los datos con AES-GCM
    const iv = crypto.getRandomValues(new Uint8Array(12)); // IV de 12 bytes para AES-GCM
    const encryptedData = await crypto.subtle.encrypt(
        {
            name: 'AES-GCM',
            iv: iv,
        },
        cryptoKey,
        data
    );

    // 3. Combinar IV y datos encriptados para su almacenamiento/transmisión
    const ivAndEncryptedData = new Uint8Array(iv.length + encryptedData.byteLength);
    ivAndEncryptedData.set(iv, 0);
    ivAndEncryptedData.set(new Uint8Array(encryptedData), iv.length);

    // Convertir a Base64 para una transmisión segura como string
    return Buffer.from(ivAndEncryptedData).toString('base64');
}

/**
 async function name() {
  const userData = {
      activationKey: Number("951688"),
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


