# AIKIT Simple UI: serves a plain, friendly page at /simple on top of ComfyUI.
# It adds no nodes; the page talks to ComfyUI's own API on the same address.
import os

from aiohttp import web
from server import PromptServer

WEB_ROOT = os.path.join(os.path.dirname(os.path.realpath(__file__)), "web")


@PromptServer.instance.routes.get("/simple")
async def simple_page(request):
    return web.FileResponse(os.path.join(WEB_ROOT, "index.html"))


NODE_CLASS_MAPPINGS = {}
NODE_DISPLAY_NAME_MAPPINGS = {}
