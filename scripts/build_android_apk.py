#!/usr/bin/env python3
import os
import sys
import shutil
import subprocess

def run_cmd(cmd, cwd=None):
    print(f"==> Running: {' '.join(cmd)}")
    res = subprocess.run(cmd, cwd=cwd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    if res.returncode != 0:
        print(f"Error executing command: {res.stderr}")
        print(f"STDOUT: {res.stdout}")
        sys.exit(res.returncode)
    return res.stdout

def main():
    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
    build_dir = os.path.join(base_dir, 'android_build_temp')
    dist_dir = os.path.join(base_dir, 'dist')
    public_dir = os.path.join(base_dir, 'public')
    
    if os.path.exists(build_dir):
        shutil.rmtree(build_dir)
    os.makedirs(build_dir, exist_ok=True)
    
    src_dir = os.path.join(build_dir, 'src', 'com', 'stockfish', 'chessreview')
    os.makedirs(src_dir, exist_ok=True)
    obj_dir = os.path.join(build_dir, 'obj')
    os.makedirs(obj_dir, exist_ok=True)
    bin_dir = os.path.join(build_dir, 'bin')
    os.makedirs(bin_dir, exist_ok=True)
    res_dir = os.path.join(build_dir, 'res', 'values')
    os.makedirs(res_dir, exist_ok=True)
    assets_dir = os.path.join(build_dir, 'assets')
    
    # 1. Copy web assets from dist to assets/
    print("1. Copying dist web bundle to assets/...")
    shutil.copytree(dist_dir, assets_dir)
    
    # Copy public stockfish scripts if not in dist
    for f in os.listdir(public_dir):
        dest_file = os.path.join(assets_dir, f)
        src_file = os.path.join(public_dir, f)
        if not os.path.exists(dest_file) and not f.endswith('.apk') and not f.endswith('.idsig'):
            shutil.copy(src_file, dest_file)

    # Ensure no APK or IDSIG files are inside the APK assets
    for root, dirs, files in os.walk(assets_dir):
        for f in files:
            if f.endswith('.apk') or f.endswith('.idsig'):
                os.remove(os.path.join(root, f))

    # 2. Write AndroidManifest.xml
    manifest_path = os.path.join(build_dir, 'AndroidManifest.xml')
    manifest_content = '''<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.stockfish.chessreview"
    android:versionCode="1"
    android:versionName="1.0.0">

    <uses-sdk android:minSdkVersion="21" android:targetSdkVersion="34" />

    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />

    <application
        android:allowBackup="true"
        android:hardwareAccelerated="true"
        android:label="@string/app_name"
        android:supportsRtl="true">

        <activity
            android:name="com.stockfish.chessreview.MainActivity"
            android:exported="true"
            android:configChanges="orientation|screenSize|keyboardHidden"
            android:screenOrientation="portrait">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>
'''
    with open(manifest_path, 'w') as f:
        f.write(manifest_content)

    # 3. Write strings.xml
    strings_path = os.path.join(res_dir, 'strings.xml')
    with open(strings_path, 'w') as f:
        f.write('''<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="app_name">Stockfish Chess Review</string>
</resources>
''')

    # 4. Write MainActivity.java
    java_file = os.path.join(src_dir, 'MainActivity.java')
    with open(java_file, 'w') as f:
        f.write('''package com.stockfish.chessreview;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.os.Bundle;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

public class MainActivity extends Activity {
    private WebView mWebView;

    @Override
    @SuppressLint("SetJavaScriptEnabled")
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        requestWindowFeature(Window.FEATURE_NO_TITLE);
        getWindow().setFlags(
            WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED,
            WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED
        );

        mWebView = new WebView(this);
        setContentView(mWebView);

        WebSettings settings = mWebView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setMediaPlaybackRequiresUserGesture(false);

        mWebView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                view.loadUrl(url);
                return true;
            }
        });

        mWebView.setWebChromeClient(new WebChromeClient());

        mWebView.loadUrl("file:///android_asset/index.html");
    }

    @Override
    public void onBackPressed() {
        if (mWebView != null && mWebView.canGoBack()) {
            mWebView.goBack();
        } else {
            super.onBackPressed();
        }
    }
}
''')

    # 5. Compile Java
    android_jar = '/usr/lib/android-sdk/platforms/android-23/android.jar'
    print("2. Compiling MainActivity.java with javac...")
    run_cmd([
        'javac',
        '-source', '8',
        '-target', '8',
        '-cp', android_jar,
        '-d', obj_dir,
        java_file
    ])

    # 6. Convert .class to classes.dex
    print("3. Generating classes.dex with dalvik-exchange (dx)...")
    dex_output = os.path.join(bin_dir, 'classes.dex')
    run_cmd([
        '/usr/bin/dalvik-exchange',
        '--dex',
        f'--output={dex_output}',
        obj_dir
    ])

    # 7. Package with aapt
    print("4. Packaging base APK with aapt...")
    unaligned_apk = os.path.join(bin_dir, 'unaligned.apk')
    run_cmd([
        'aapt', 'package', '-f',
        '-M', manifest_path,
        '-S', os.path.join(build_dir, 'res'),
        '-I', android_jar,
        '-A', assets_dir,
        '-F', unaligned_apk
    ])

    # 8. Add classes.dex into unaligned.apk
    print("5. Adding classes.dex to APK archive...")
    run_cmd(['aapt', 'add', unaligned_apk, 'classes.dex'], cwd=bin_dir)

    # 9. Zipalign
    print("6. Aligning APK with zipalign...")
    aligned_apk = os.path.join(bin_dir, 'aligned.apk')
    run_cmd(['zipalign', '-v', '-p', '4', unaligned_apk, aligned_apk])

    # 10. Generate Keystore if needed and Sign with apksigner
    print("7. Signing APK with official Android keystore via apksigner...")
    keystore_path = os.path.join(build_dir, 'chess_release.keystore')
    if not os.path.exists(keystore_path):
        run_cmd([
            'keytool', '-genkey', '-v',
            '-keystore', keystore_path,
            '-storepass', 'stockfish123',
            '-alias', 'stockfishkey',
            '-keypass', 'stockfish123',
            '-keyalg', 'RSA',
            '-keysize', '2048',
            '-validity', '10000',
            '-dname', 'CN=Stockfish Chess, OU=Mobile, O=Stockfish, L=San Francisco, ST=California, C=US'
        ])

    final_apk_path = os.path.join(public_dir, 'stockfish-chess-review.apk')
    run_cmd([
        'apksigner', 'sign',
        '--ks', keystore_path,
        '--ks-pass', 'pass:stockfish123',
        '--key-pass', 'pass:stockfish123',
        '--out', final_apk_path,
        aligned_apk
    ])

    # Also copy to root for direct root URL access
    shutil.copy(final_apk_path, os.path.join(base_dir, 'stockfish-chess-review.apk'))

    # Verify signature
    print("8. Verifying APK signature...")
    verify_output = run_cmd(['apksigner', 'verify', '-v', final_apk_path])
    print("Signature verification output:")
    print(verify_output)

    apk_size = os.path.getsize(final_apk_path)
    print(f"\n SUCCESS! Signed Android APK successfully built: {final_apk_path} ({apk_size / (1024*1024):.2f} MB / {apk_size} bytes)")

    # Clean up temp build folder
    shutil.rmtree(build_dir)

if __name__ == '__main__':
    main()
