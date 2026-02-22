type RouteHandler = (request: Request) => Response | Promise<Response>;

const AUTHORIZATION_HEADER = "authorization";

export const withAuth = (handler: RouteHandler): RouteHandler => {
  return async (request) => {
    const secret = process.env.CRON_SECRET;

    if (!secret) {
      return new Response("CRON_SECRET is not configured.", { status: 500 });
    }

    const authorization = request.headers.get(AUTHORIZATION_HEADER);

    if (!authorization) {
      return new Response("Unauthorized.", { status: 401 });
    }

    const isAuthorized =
      authorization === secret || authorization === `Bearer ${secret}`;

    if (!isAuthorized) {
      return new Response("Unauthorized.", { status: 401 });
    }

    return handler(request);
  };
};
