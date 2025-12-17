#!/usr/bin/env python3
"""
簡易HTTPSサーバー
自己署名証明書を使用してHTTPS接続を提供
"""
import http.server
import ssl
import socketserver
import os
from datetime import datetime, timedelta
from cryptography import x509
from cryptography.x509.oid import NameOID
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa

def create_self_signed_cert(hostname="192.168.1.49"):
    """自己署名証明書を作成"""
    print("自己署名証明書を作成中...")
    
    # 秘密鍵を生成
    private_key = rsa.generate_private_key(
        public_exponent=65537,
        key_size=2048,
    )
    
    # 証明書の内容を設定
    subject = issuer = x509.Name([
        x509.NameAttribute(NameOID.COUNTRY_NAME, "JP"),
        x509.NameAttribute(NameOID.STATE_OR_PROVINCE_NAME, "Tokyo"),
        x509.NameAttribute(NameOID.LOCALITY_NAME, "Tokyo"),
        x509.NameAttribute(NameOID.ORGANIZATION_NAME, "Dev Server"),
        x509.NameAttribute(NameOID.COMMON_NAME, hostname),
    ])
    
    # 証明書を作成
    cert = x509.CertificateBuilder().subject_name(
        subject
    ).issuer_name(
        issuer
    ).public_key(
        private_key.public_key()
    ).serial_number(
        x509.random_serial_number()
    ).not_valid_before(
        datetime.utcnow()
    ).not_valid_after(
        datetime.utcnow() + timedelta(days=365)
    ).add_extension(
        x509.SubjectAlternativeName([
            x509.DNSName(hostname),
            x509.IPAddress(ipaddress.IPv4Address(hostname)),
        ]),
        critical=False,
    ).sign(private_key, hashes.SHA256())
    
    # ファイルに保存
    with open("cert.pem", "wb") as f:
        f.write(cert.public_bytes(serialization.Encoding.PEM))
    
    with open("key.pem", "wb") as f:
        f.write(private_key.private_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PrivateFormat.PKCS8,
            encryption_algorithm=serialization.NoEncryption()
        ))
    
    print("証明書作成完了: cert.pem, key.pem")

def start_https_server(port=8443):
    """HTTPSサーバーを開始"""
    # 証明書ファイルが存在しない場合は作成
    if not os.path.exists("cert.pem") or not os.path.exists("key.pem"):
        create_self_signed_cert()
    
    # HTTPSサーバーを設定
    Handler = http.server.SimpleHTTPRequestHandler
    
    with socketserver.TCPServer(("0.0.0.0", port), Handler) as httpd:
        # SSL設定
        context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
        context.load_cert_chain("cert.pem", "key.pem")
        httpd.socket = context.wrap_socket(httpd.socket, server_side=True)
        
        print(f"HTTPSサーバーを開始: https://0.0.0.0:{port}")
        print(f"iPhoneからアクセス: https://192.168.1.49:{port}")
        print("Ctrl+C で停止")
        
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nサーバーを停止中...")
            httpd.shutdown()

if __name__ == "__main__":
    import ipaddress
    start_https_server()