#!/usr/bin/env python3
import os
import sys
import shutil
import zipfile
import subprocess

def run_cmd(cmd, cwd=None):
    print(f"==> Running: {' '.join(cmd)}")
    res = subprocess.run(cmd, cwd=cwd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    if res.returncode != 0:
        print(f"Error: {res.stderr}")
        print(f"Output: {res.stdout}")
        sys.exit(res.returncode)
    return res.stdout

def main():
    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
    dist_dir = os.path.join(base_dir, 'dist')
    public_dir = os.path.join(base_dir, 'public')
    temp_dir = os.path.join(base_dir, 'apk_temp')

    if os.path.exists(temp_dir):
        shutil.rmtree(temp_dir)
    os.makedirs(temp_dir, exist_ok=True)

    unaligned_apk = os.path.join(temp_dir, 'unaligned.apk')
    aligned_apk = os.path.join(temp_dir, 'aligned.apk')
    keystore_path = os.path.join(temp_dir, 'avelux_grand.keystore')

    # Create unaligned zip
    with zipfile.ZipFile(unaligned_apk, 'w', compression=zipfile.ZIP_DEFLATED) as z:
        # 1. AndroidManifest.xml
        z.write(os.path.join(base_dir, 'bin_manifest.xml'), 'AndroidManifest.xml')

        # 2. resources.arsc
        z.write(os.path.join(base_dir, 'bin_resources.arsc'), 'resources.arsc')

        # 3. classes.dex
        z.write(os.path.join(base_dir, 'classes.dex'), 'classes.dex')

        # 4. App icons for launcher
        icon_densities = [
            ('icon-48.png', 'res/mipmap-mdpi/ic_launcher.png'),
            ('icon-72.png', 'res/mipmap-hdpi/ic_launcher.png'),
            ('icon-96.png', 'res/mipmap-xhdpi/ic_launcher.png'),
            ('icon-144.png', 'res/mipmap-xxhdpi/ic_launcher.png'),
            ('icon.png', 'res/mipmap-xxxhdpi/ic_launcher.png'),
        ]
        for src_name, zip_path in icon_densities:
            src_file = os.path.join(public_dir, src_name)
            if os.path.exists(src_file):
                z.write(src_file, zip_path)

        # 5. Assets from dist/
        print("Packaging assets from dist/...")
        for root, dirs, files in os.walk(dist_dir):
            for file in files:
                if file.endswith('.apk') or file.endswith('.idsig'):
                    continue
                full_path = os.path.join(root, file)
                rel_path = os.path.relpath(full_path, dist_dir)
                archive_path = os.path.join('assets', rel_path).replace('\\', '/')
                z.write(full_path, archive_path)

        # 6. Public stockfish scripts
        for f in os.listdir(public_dir):
            if f.endswith('.apk') or f.endswith('.idsig'):
                continue
            src_f = os.path.join(public_dir, f)
            archive_path = f'assets/{f}'
            if archive_path not in z.namelist() and os.path.isfile(src_f):
                z.write(src_f, archive_path)

    print(f"Unaligned APK created: {os.path.getsize(unaligned_apk)} bytes")

    # Align with zipalign
    print("Aligning APK with zipalign...")
    run_cmd(['/usr/bin/zipalign', '-v', '-p', '4', unaligned_apk, aligned_apk])

    # Generate keystore
    print("Generating release keystore for Avelux Grand...")
    run_cmd([
        '/usr/bin/keytool', '-genkey', '-v',
        '-keystore', keystore_path,
        '-storepass', 'avelux123',
        '-alias', 'aveluxgrand',
        '-keypass', 'avelux123',
        '-keyalg', 'RSA',
        '-keysize', '2048',
        '-validity', '10000',
        '-dname', 'CN=Avelux Grand, OU=Chess, O=Avelux, L=San Francisco, ST=CA, C=US'
    ])

    # Sign with apksigner (v1, v2, v3 schemes)
    final_apk = os.path.join(public_dir, 'avelux-grand.apk')
    print("Signing APK with apksigner...")
    run_cmd([
        '/usr/bin/apksigner', 'sign',
        '--ks', keystore_path,
        '--ks-pass', 'pass:avelux123',
        '--key-pass', 'pass:avelux123',
        '--out', final_apk,
        aligned_apk
    ])

    # Also copy to public/stockfish-chess-review.apk and root versions
    shutil.copy(final_apk, os.path.join(public_dir, 'stockfish-chess-review.apk'))
    shutil.copy(final_apk, os.path.join(base_dir, 'avelux-grand.apk'))
    shutil.copy(final_apk, os.path.join(base_dir, 'stockfish-chess-review.apk'))

    # Verify signature
    print("Verifying APK signature...")
    verify_output = run_cmd(['/usr/bin/apksigner', 'verify', '-v', final_apk])
    print(verify_output)

    print(f"\n SUCCESS! Avelux Grand APK ready: {final_apk} ({os.path.getsize(final_apk)} bytes)")
    shutil.rmtree(temp_dir)

if __name__ == '__main__':
    main()
