"""Bound requests before multipart parsing creates temporary upload files."""

from starlette.responses import JSONResponse
from starlette.types import ASGIApp, Message, Receive, Scope, Send

from .config import MAX_REQUEST_BYTES


class RequestSafetyMiddleware:
    def __init__(self, app: ASGIApp):
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return
        response_started = False

        async def tracked_send(message: Message) -> None:
            nonlocal response_started
            if message["type"] == "http.response.start":
                response_started = True
                message.setdefault("headers", []).append((b"cache-control", b"no-store"))
            await send(message)

        async def error(status: int, code: str, message: str) -> None:
            await JSONResponse(
                status_code=status, content={"error": {"code": code, "message": message}}
            )(scope, receive, tracked_send)

        if scope["method"] == "POST":
            lengths = [value for name, value in scope["headers"] if name.lower() == b"content-length"]
            try:
                if len(lengths) > 1 or (lengths and not lengths[0].isdigit()):
                    raise ValueError
                if lengths and int(lengths[0]) > MAX_REQUEST_BYTES:
                    await error(413, "request_too_large", "Request exceeds the 5 MB file plus 64 KB form allowance.")
                    return
            except ValueError:
                await error(400, "invalid_input", "Invalid Content-Length header.")
                return
            body = bytearray()
            while True:
                message = await receive()
                if message["type"] == "http.disconnect":
                    return
                chunk = message.get("body", b"")
                if len(body) + len(chunk) > MAX_REQUEST_BYTES:
                    await error(413, "request_too_large", "Request exceeds the 5 MB file plus 64 KB form allowance.")
                    return
                body.extend(chunk)
                if not message.get("more_body", False):
                    break
            sent = False

            async def replay() -> Message:
                nonlocal sent
                if not sent:
                    sent = True
                    return {"type": "http.request", "body": bytes(body), "more_body": False}
                return await receive()
            downstream_receive = replay
        else:
            downstream_receive = receive

        try:
            await self.app(scope, downstream_receive, tracked_send)
        except Exception:
            # Never log exception text: parsers/providers may include source documents.
            if not response_started:
                await error(500, "internal_error", "The request could not be completed.")
