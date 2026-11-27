"""Serve the bundled Android web assets in a phone frame for visual review."""
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from functools import partial

class Handler(SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path == '/':
            self.send_response(302)
            self.send_header('Location', '/mobile-preview.html')
            self.end_headers()
        else:
            super().do_GET()

root = Path(__file__).resolve().parent.parent / 'android/build/assets/web'
if not root.joinpath('index.html').is_file():
    raise SystemExit('Build the Android APK first: ./scripts/build-android.sh')
ThreadingHTTPServer(('0.0.0.0', 8001), partial(Handler, directory=str(root))).serve_forever()
