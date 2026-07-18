export function GET(): Response {
  return Response.json(
    {
      status: "ok",
      service: "sightline",
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
