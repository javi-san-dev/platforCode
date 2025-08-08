export const prerender = false;

import { put } from '@vercel/blob';

export async function POST({ request }) {
  try {
    // 1. Accede a los datos del cuerpo de la petición
    const userData = await request.json();
    console.log("Datos recibidos:", userData);


    const filename = `users/${userData.email}.json`;
    const blob = await put(filename, JSON.stringify(userData), {
      access: 'public', // Opcional: 'public' o 'private'
    });

    // 4. Retorna una respuesta con el objeto blob, que incluye la URL del archivo
    return new Response(
      JSON.stringify({
        message: "User data saved successfully.",
        user: userData,
        blob: blob, // Aquí tienes la URL y otros metadatos del archivo
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

  } catch (error) {
    // Maneja cualquier error en el proceso
    console.error("Error al guardar en Vercel Blob:", error);
    return new Response(
      JSON.stringify({ message: "Error interno del servidor." }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
  }
}