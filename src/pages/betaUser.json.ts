export function GET({ params, request }) {
  return new Response(
    JSON.stringify({
      name: "javi san",
      mail: "javi@mail.com",
    }),
  );
}