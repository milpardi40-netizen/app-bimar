package com.hamrahsalamat.app;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.Locale;

/** Offline demo shell: only the bundled application is allowed to run in the WebView. */
public final class MainActivity extends Activity {
    private static final String HOST = "appassets.androidplatform.net";
    private static final String START = "https://" + HOST + "/index.html";
    private static final int FILE_REQUEST = 31;
    private WebView webView;
    private ValueCallback<Uri[]> uploadCallback;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        getWindow().setStatusBarColor(0xff5633c3);
        getWindow().setNavigationBarColor(0xff5633c3);
        webView = new WebView(this);
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(true); // Needed for the Android system file picker.
        settings.setUserAgentString(settings.getUserAgentString() + " HamrahSalamatAndroid/1.0");
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        webView.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri url = request.getUrl();
                if ("https".equals(url.getScheme()) && HOST.equals(url.getHost())) return false;
                String scheme = url.getScheme();
                if (request.isForMainFrame() && ("https".equals(scheme) || "http".equals(scheme) || "tel".equals(scheme))) {
                    try { startActivity(new Intent(Intent.ACTION_VIEW, url)); }
                    catch (ActivityNotFoundException ignored) { Toast.makeText(MainActivity.this, "برنامه‌ای برای باز کردن این پیوند پیدا نشد", Toast.LENGTH_SHORT).show(); }
                }
                return true;
            }
            @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                Uri url = request.getUrl();
                if (!"https".equals(url.getScheme()) || !HOST.equals(url.getHost())) return blocked();
                String path = url.getPath();
                if (path == null || path.equals("/")) path = "/index.html";
                if (path.contains("..") || path.contains("\\")) return blocked();
                try {
                    InputStream stream = getAssets().open("web" + path);
                    String range = null;
                    for (java.util.Map.Entry<String,String> header : request.getRequestHeaders().entrySet()) {
                        if ("range".equalsIgnoreCase(header.getKey())) { range = header.getValue(); break; }
                    }
                    if (path.endsWith(".mp4") && range != null && range.startsWith("bytes=")) {
                        ByteArrayOutputStream buffer = new ByteArrayOutputStream();
                        byte[] chunk = new byte[4096];
                        int n;
                        while ((n = stream.read(chunk)) != -1) buffer.write(chunk, 0, n);
                        stream.close();
                        byte[] bytes = buffer.toByteArray();
                        String[] bounds = range.substring(6).split("-", -1);
                        try {
                            int start;
                            int end;
                            if (bounds[0].isEmpty() && bounds.length > 1 && !bounds[1].isEmpty()) {
                                int length = Integer.parseInt(bounds[1]);
                                start = Math.max(0, bytes.length - length);
                                end = bytes.length - 1;
                            } else {
                                start = Integer.parseInt(bounds[0]);
                                end = bounds.length > 1 && !bounds[1].isEmpty() ? Math.min(Integer.parseInt(bounds[1]), bytes.length - 1) : bytes.length - 1;
                            }
                            if (start < 0 || start > end || end >= bytes.length) return blocked();
                            java.util.Map<String,String> headers = new java.util.HashMap<>();
                            headers.put("Content-Range", "bytes " + start + "-" + end + "/" + bytes.length);
                            headers.put("Accept-Ranges", "bytes");
                            headers.put("Content-Length", String.valueOf(end - start + 1));
                            return new WebResourceResponse("video/mp4", null, 206, "Partial Content", headers, new ByteArrayInputStream(bytes, start, end - start + 1));
                        } catch (NumberFormatException ignored) { return blocked(); }
                    }
                    return new WebResourceResponse(mime(path), null, stream);
                } catch (IOException ignored) { return blocked(); }
            }
        });
        webView.setWebChromeClient(new WebChromeClient() {
            @Override public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
                if (uploadCallback != null) uploadCallback.onReceiveValue(null);
                uploadCallback = callback;
                try { startActivityForResult(params.createIntent(), FILE_REQUEST); }
                catch (ActivityNotFoundException ex) { uploadCallback = null; callback.onReceiveValue(null); return false; }
                return true;
            }
        });
        setContentView(webView);
        webView.loadUrl(START);
    }
    private static WebResourceResponse blocked() {
        return new WebResourceResponse("text/plain", "UTF-8", 404, "Not Found", java.util.Collections.<String,String>emptyMap(), new ByteArrayInputStream(new byte[0]));
    }
    private static String mime(String path) {
        String p = path.toLowerCase(Locale.ROOT);
        if (p.endsWith(".html")) return "text/html";
        if (p.endsWith(".js")) return "application/javascript";
        if (p.endsWith(".css")) return "text/css";
        if (p.endsWith(".png")) return "image/png";
        if (p.endsWith(".jpg") || p.endsWith(".jpeg")) return "image/jpeg";
        if (p.endsWith(".mp4")) return "video/mp4";
        if (p.endsWith(".svg")) return "image/svg+xml";
        if (p.endsWith(".woff2")) return "font/woff2";
        if (p.endsWith(".woff")) return "font/woff";
        if (p.endsWith(".json") || p.endsWith(".webmanifest")) return "application/json";
        return "application/octet-stream";
    }
    @Override protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == FILE_REQUEST && uploadCallback != null) {
            uploadCallback.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(resultCode, data));
            uploadCallback = null;
        }
    }
    @Override public void onBackPressed() {
        if (webView.canGoBack()) webView.goBack(); else super.onBackPressed();
    }
    @Override protected void onDestroy() {
        if (uploadCallback != null) uploadCallback.onReceiveValue(null);
        webView.destroy();
        super.onDestroy();
    }
}
