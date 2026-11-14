#!/usr/bin/env python3
"""Static dev server for Fire. Sends no-store headers so edits show on reload.
Usage: python3 scripts/serve.py [port]"""
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer


class Handler(SimpleHTTPRequestHandler):
    extensions_map = {**SimpleHTTPRequestHandler.extensions_map, ".js": "text/javascript", ".mjs": "text/javascript", ".woff2": "font/woff2", ".svg": "image/svg+xml"}

    def do_GET(self):
        if self.path == "/favicon.ico":
            self.path = "/fire/favicon.svg"
        if self.path == "/":
            self.send_response(302)
            self.send_header("Location", "/docs/index.html")
            self.end_headers()
            return
        super().do_GET()

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def log_message(self, *args):
        pass


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 4747
    print(f"Fire docs: http://127.0.0.1:{port}/docs/index.html")
    ThreadingHTTPServer(("127.0.0.1", port), Handler).serve_forever()
